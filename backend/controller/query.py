"""
Query API Controller

Handles RAG query endpoint.
"""

from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from uuid import UUID
import logging

from middleware.auth_guard import auth_guard
from middleware.widget_token_guard import widget_token_guard
from services.rag_service import RagService
from starlette.concurrency import run_in_threadpool
from core.exceptions import ValidationError, DatabaseError, AuthorizationError

logger = logging.getLogger(__name__)

query_router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message from client"""
    text: str
    isUser: bool
    timestamp: Optional[str] = None


class QueryRequest(BaseModel):
    query_text: str = Field(..., min_length=1)
    top_k: Optional[int] = Field(default=5, ge=1, le=20)
    min_score: Optional[float] = Field(default=0.25, ge=0.0, le=1.0)
    session_id: Optional[str] = Field(default=None, description="Client session identifier")
    page_url: Optional[str] = Field(default=None, description="Origin URL of query")
    chat_history: Optional[List[ChatMessage]] = Field(default=None, description="Previous chat messages from client (last 5 messages)")
    include_metadata: Optional[bool] = Field(default=False, description="Include confidence and detailed source info (for testing/debugging)")


@query_router.post("/bots/{bot_id}/query")
@auth_guard
async def query_bot(request: Request, bot_id: UUID, body: QueryRequest):
    try:
        access_token = None
        # Optional: extract token from cookie using existing helper
        try:
            from controller.source import get_access_token_from_request
            access_token = get_access_token_from_request(request)
        except Exception:
            pass

        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        rag = RagService(access_token=access_token)
        
        # Convert chat history to format expected by RAG service
        chat_history = None
        if body.chat_history:
            # Pair up user messages with assistant responses
            # Messages come in chronological order: user1, assistant1, user2, assistant2, etc.
            history_pairs = []
            i = 0
            while i < len(body.chat_history):
                if body.chat_history[i].isUser:
                    # Found a user message, look for the next assistant message
                    query = body.chat_history[i].text
                    if i + 1 < len(body.chat_history) and not body.chat_history[i + 1].isUser:
                        # Next message is assistant response
                        response = body.chat_history[i + 1].text
                        history_pairs.append({"query": query, "response": response})
                        i += 2  # Skip both messages
                    else:
                        i += 1  # No response yet, skip user message
                else:
                    i += 1  # Skip standalone assistant messages
            
            # Take last 5 pairs (most recent)
            chat_history = history_pairs[-5:] if len(history_pairs) > 5 else history_pairs
        
        # Offload blocking retrieval/LLM work to a thread to avoid blocking the event loop
        result = await run_in_threadpool(
            rag.answer,
            bot_id,
            str(user_id),
            body.query_text,
            body.top_k or 5,
            body.min_score or 0.25,
            body.session_id,
            body.page_url,
            body.include_metadata or False,
            chat_history,
        )
        # Attach echo of session/page for clients
        return {"status": "success", "data": {**result, "session_id": body.session_id, "page_url": body.page_url}}

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error querying bot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


@query_router.post("/widget/query")
@widget_token_guard
async def query_bot_widget(request: Request, body: QueryRequest):
    """
    Public widget query endpoint.
    Validates widget token and returns RAG answer.
    No user authentication required (token-based).
    """
    try:
        # Get bot_id from validated token
        token_data = request.state.widget_token
        bot_id = UUID(token_data["bot_id"])
        
        # Widget queries don't have a user_id (public access)
        # Token validation already ensures this bot_id is valid
        # Use service role for database access (bypasses RLS)
        rag = RagService(access_token=None)  # No user token needed for widget queries
        
        # Convert chat history from widget to format expected by RAG service
        chat_history = None
        if body.chat_history:
            # Pair up user messages with assistant responses
            # Messages come in chronological order: user1, assistant1, user2, assistant2, etc.
            history_pairs = []
            i = 0
            while i < len(body.chat_history):
                if body.chat_history[i].isUser:
                    # Found a user message, look for the next assistant message
                    query = body.chat_history[i].text
                    if i + 1 < len(body.chat_history) and not body.chat_history[i + 1].isUser:
                        # Next message is assistant response
                        response = body.chat_history[i + 1].text
                        history_pairs.append({"query": query, "response": response})
                        i += 2  # Skip both messages
                    else:
                        i += 1  # No response yet, skip user message
                else:
                    i += 1  # Skip standalone assistant messages
            
            # Take last 5 pairs (most recent)
            chat_history = history_pairs[-5:] if len(history_pairs) > 5 else history_pairs
        
        # Widget queries should not include metadata (production mode)
        # Override include_metadata to False for widgets (lighter responses)
        result = await run_in_threadpool(
            rag.answer,
            bot_id,
            None,  # No user_id for widget queries (token validates bot access)
            body.query_text,
            body.top_k or 5,
            body.min_score or 0.25,
            body.session_id,
            body.page_url,
            False,  # Widget queries: always exclude metadata for performance
            chat_history,
        )
        
        # Attach echo of session/page for clients
        return {
            "status": "success",
            "data": {
                **result,
                "session_id": body.session_id,
                "page_url": body.page_url,
            }
        }

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in widget query: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


