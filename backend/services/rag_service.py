from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import time

from config.supabasedb import get_supabase_client
from services.embedding_service import EmbeddingService
from services.llm_service import LLMService
from services.bot_service import BotService
from repositories.query_repo import QueryRepository
from repositories.source_repo import SourceRepository
from core.exceptions import ValidationError, DatabaseError

logger = logging.getLogger(__name__)


class RagService:
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        self.db = get_supabase_client(access_token=access_token)
        self.embedding = EmbeddingService(access_token=access_token)
        self.query_repo = QueryRepository(access_token=access_token)
        self.source_repo = SourceRepository(access_token=access_token)

    def retrieve(self, bot_id: UUID, query_text: str, top_k: int = 5, min_score: float = 0.25) -> List[Dict[str, Any]]:
        if not query_text or not query_text.strip():
            raise ValidationError("query_text is required")

        # Embed query (single-vector batch)
        vectors, provider = self.embedding._embed_with_fallback([query_text])
        query_vec = vectors[0]
        logger.info(f"Query embedded using provider {provider}")

        # Call SQL function search_similar_chunks(bot_id, embedding, threshold, limit)
        try:
            # Supabase Python client: use rpc with exact SQL arg names
            response = self.db.rpc(
                "search_similar_chunks",
                {
                    "bot_uuid": str(bot_id),
                    "query_embedding": query_vec,
                    "match_threshold": float(min_score),
                    "match_count": int(top_k),
                },
            ).execute()

            data = response.data or []
            logger.info(f"Retrieved {len(data)} chunks for query")
            return data
        except Exception as e:
            logger.error(f"Error during retrieval: {str(e)}")
            raise DatabaseError(f"Retrieval failed: {str(e)}")

    def answer(self, bot_id: UUID, user_id: Optional[str], query_text: str, top_k: int = 5, min_score: float = 0.25, session_id: Optional[str] = None, page_url: Optional[str] = None, include_metadata: bool = False) -> Dict[str, Any]:
        # Retrieve context
        t0 = time.time()
        chunks = self.retrieve(bot_id, query_text, top_k=top_k, min_score=min_score)
        context = "\n\n".join([c.get("excerpt", "") for c in chunks])
        
        confidence = None
        citations = []
        
        # Only calculate confidence and fetch source info if metadata is requested (for testing/debugging)
        if include_metadata:
            # Calculate confidence from similarity scores (average of top scores)
            similarity_scores = [float(c.get("similarity", 0.0)) for c in chunks if c.get("similarity") is not None]
            if similarity_scores:
                # Average similarity as confidence (0-1 scale)
                confidence = sum(similarity_scores) / len(similarity_scores)
                # Cap at 1.0
                confidence = min(confidence, 1.0)
            
            # Fetch source info for citations
            source_ids = set()
            chunk_source_map = {}
            for c in chunks:
                source_id = c.get("source_id")
                if source_id:
                    source_ids.add(source_id)
                    chunk_source_map[c.get("id")] = source_id
            
            # Batch fetch sources
            sources_map = {}
            for source_id in source_ids:
                try:
                    source = self.source_repo.get_source_by_id(UUID(source_id))
                    if source:
                        sources_map[source_id] = source
                except Exception as e:
                    logger.warning(f"Failed to fetch source {source_id}: {e}")
            
            # Build citations with source info
            for c in chunks:
                chunk_id = c.get("id")
                source_id = chunk_source_map.get(chunk_id)
                source_info = sources_map.get(source_id) if source_id else None
                
                citation = {
                    "chunk_id": chunk_id,
                    "heading": c.get("heading"),
                    "score": c.get("similarity"),
                }
                
                # Add source info if available
                if source_info:
                    citation["source"] = {
                        "source_id": source_id,
                        "source_type": source_info.get("source_type"),
                        "original_url": source_info.get("original_url"),
                        "canonical_url": source_info.get("canonical_url"),
                        "storage_path": source_info.get("storage_path"),
                    }
                    # Extract filename from storage_path for file sources
                    if source_info.get("source_type") in ["pdf", "docx", "txt"]:
                        storage_path = source_info.get("storage_path", "")
                        if storage_path:
                            # Extract filename from path like "bots/{bot_id}/sources/{source_id}/{filename}"
                            parts = storage_path.split("/")
                            if parts:
                                citation["source"]["filename"] = parts[-1]
                
                citations.append(citation)
        else:
            # Lightweight citations for production (just chunk IDs)
            citations = [{"chunk_id": c.get("id")} for c in chunks]

        # Fetch bot to verify ownership and get system_prompt
        bot_service = BotService()
        bot = None
        if user_id:
            bot = bot_service.get_bot(str(bot_id), str(user_id), access_token=self.access_token)
        system_prompt = (bot or {}).get("system_prompt") if isinstance(bot, dict) else None
        system_prompt = system_prompt or "You are a helpful assistant. Use the provided context to answer. If unsure, say you don't know."

        prompt = (
            f"System prompt: {system_prompt}\n\n"
            f"Context:\n{context}\n\n"
            f"User question: {query_text}\n\n"
            f"Answer concisely and cite sources by heading if helpful."
        )

        llm = LLMService()
        answer_text, usage, provider_used = llm.generate(prompt)
        latency_ms = int((time.time() - t0) * 1000)

        result = {
            "answer": answer_text,
            "citations": citations,
            "confidence": confidence,
            "context_preview": context[:1000],
        }

        # Log query
        try:
            sid = session_id or "server-session"
            self.query_repo.create_query(
                bot_id=bot_id,
                session_id=sid,
                query_text=query_text,
                page_url=page_url,
                returned_sources=citations,
                response_summary=answer_text[:2000],
                tokens_used=(usage.get("total_tokens") if isinstance(usage, dict) else 0) or 0,
                prompt_tokens=(usage.get("prompt_tokens") if isinstance(usage, dict) else None),
                completion_tokens=(usage.get("completion_tokens") if isinstance(usage, dict) else None),
                confidence=confidence,
                latency_ms=latency_ms,
            )
        except Exception as e:
            logger.warning(f"Failed to log query: {e}")

        return result


