from typing import List, Optional, Tuple
import logging
from uuid import UUID

from services.embeddings.base import EmbeddingProvider, TransientEmbeddingError, FatalEmbeddingError
from config.settings import settings
from services.embeddings.openai_provider import OpenAIEmbeddingProvider
from services.embeddings.gemini_provider import GeminiEmbeddingProvider
from repositories.chunk_repo import ChunkRepository

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(
        self,
        access_token: Optional[str] = None,
        preferred: str = settings.embedding_preferred,
        openai_model: str = settings.openai_embedding_model,
        gemini_model: str = settings.gemini_embedding_model,
        embedding_dimension: int = settings.embedding_dimension,
        batch_size: int = settings.embedding_batch_size,
    ):
        self.access_token = access_token
        self.batch_size = batch_size
        self.embedding_dimension = embedding_dimension

        self.providers: List[EmbeddingProvider] = []
        # Preferred-first provider order
        if preferred == "openai":
            self.providers = [
                OpenAIEmbeddingProvider(model=openai_model),
                GeminiEmbeddingProvider(model=gemini_model, target_dimension=embedding_dimension),
            ]
        else:
            self.providers = [
                GeminiEmbeddingProvider(model=gemini_model, target_dimension=embedding_dimension),
                OpenAIEmbeddingProvider(model=openai_model),
            ]

        self.repository = ChunkRepository(access_token=access_token)

    def _select_provider(self) -> List[EmbeddingProvider]:
        return self.providers

    def _embed_with_fallback(self, texts: List[str], user: Optional[str] = None) -> Tuple[List[List[float]], str]:
        last_error: Optional[Exception] = None
        for provider in self._select_provider():
            try:
                vectors = provider.embed_texts(texts, user=user)
                # dimension guard
                if any(len(v) != self.embedding_dimension for v in vectors):
                    logger.warning(
                        f"Provider {provider.name}:{provider.model} returned mismatched dimension; conforming"
                    )
                    vectors = [v[: self.embedding_dimension] for v in vectors]
                return vectors, provider.name
            except FatalEmbeddingError as e:
                logger.error(f"Fatal error from {provider.name} embeddings: {e}")
                last_error = e
                # Fatal: do not continue to next (but we still try fallback provider)
                continue
            except TransientEmbeddingError as e:
                logger.warning(f"Transient error from {provider.name} embeddings: {e}; trying fallback")
                last_error = e
                continue
            except Exception as e:
                logger.error(f"Unexpected error from {provider.name}: {e}")
                last_error = e
                continue
        raise TransientEmbeddingError(str(last_error) if last_error else "Embedding failed")

    def embed_chunks_for_source(self, source_id: UUID, texts: List[str], chunk_ids: List[UUID]) -> int:
        if not texts or not chunk_ids or len(texts) != len(chunk_ids):
            logger.warning("embed_chunks_for_source called with invalid inputs")
            return 0

        total_updated = 0
        total = len(texts)
        total_batches = (total + self.batch_size - 1) // self.batch_size
        logger.info(
            f"Embedding {total} chunks for source {source_id} (batch_size={self.batch_size}, batches={total_batches})"
        )

        for i in range(0, total, self.batch_size):
            batch_num = (i // self.batch_size) + 1
            batch_texts = texts[i : i + self.batch_size]
            batch_ids = chunk_ids[i : i + self.batch_size]
            logger.debug(
                f"Processing batch {batch_num}/{total_batches} for source {source_id}: size={len(batch_texts)}"
            )

            vectors, provider_used = self._embed_with_fallback(batch_texts)
            logger.debug(
                f"Embedded batch {batch_num}/{total_batches} (size={len(batch_texts)}) using provider {provider_used}"
            )
            # Persist embeddings in batch
            updated = self.repository.update_chunk_embeddings(batch_ids, vectors)
            logger.debug(
                f"Updated {updated}/{len(batch_ids)} chunk embeddings for batch {batch_num}/{total_batches}"
            )
            total_updated += updated
        logger.info(
            f"Embedding complete for source {source_id}: updated {total_updated}/{total} chunks"
        )
        return total_updated
