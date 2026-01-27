from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional
from uuid import UUID
import logging
import re
from services.rate_limit_service import RateLimitService
from config.settings import settings

logger = logging.getLogger(__name__)

# Global rate limit service instance
# Use service role for all rate limiting operations (internal operation, doesn't need user context)
rate_limit_service = RateLimitService(use_service_role=True)


def extract_bot_id_from_request(request: Request) -> Optional[UUID]:
    """
    Extract bot_id from request in the following order:
    1. From request.state.bot_id (set by widget_token_guard)
    2. From path parameters (e.g., /bots/{bot_id}/...)
    3. Return None if not found
    """
    # First, check if bot_id is in request state (set by widget_token_guard)
    if hasattr(request.state, "bot_id") and request.state.bot_id:
        try:
            return UUID(str(request.state.bot_id))
        except (ValueError, TypeError):
            pass
    
    # Try to extract from path parameters
    # Pattern: /bots/{bot_id}/... or /api/v1/bots/{bot_id}/...
    path = request.url.path
    # Match UUID pattern in path after /bots/
    bot_id_pattern = r'/bots/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'
    match = re.search(bot_id_pattern, path, re.IGNORECASE)
    if match:
        try:
            return UUID(match.group(1))
        except (ValueError, TypeError):
            pass
    
    return None


def should_apply_rate_limit(request: Request) -> bool:
    """
    Determine if rate limiting should be applied to this request.
    Only apply to endpoints that have a bot_id (query endpoints, etc.)
    """
    # Skip OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return False
    
    # Skip health check and other non-bot endpoints
    path = request.url.path
    skip_paths = ["/health", "/docs", "/openapi.json", "/redoc"]
    if any(path.startswith(skip) for skip in skip_paths):
        return False
    
    # Only apply rate limiting to endpoints that involve bots
    # This includes query endpoints, widget endpoints, etc.
    bot_related_paths = [
        "/query",
        "/widget/query",
        "/bots/",
    ]
    
    return any(path_pattern in path for path_pattern in bot_related_paths)


async def rate_limit_middleware(request: Request, call_next):
    """
    Per-bot rate limiting middleware using database.
    Only applies to bot-related endpoints (queries, etc.)
    """
    # Check if we should apply rate limiting to this request
    if not should_apply_rate_limit(request):
        return await call_next(request)
    
    # Extract bot_id from request
    bot_id = extract_bot_id_from_request(request)
    
    if not bot_id:
        # No bot_id found - skip rate limiting for this request
        return await call_next(request)
    
    # Use service role for rate limiting (internal operation, doesn't need user context)
    try:
        # Check rate limit and increment count
        is_allowed, current_count, max_requests, window_start = rate_limit_service.check_rate_limit(bot_id)
        
        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for bot {bot_id}: {current_count}/{max_requests} "
                f"in window {window_start}"
            )
            
            # Calculate reset time (next minute)
            from datetime import timedelta, datetime
            reset_time = window_start + timedelta(minutes=1)
            now = datetime.utcnow()
            retry_after_seconds = max(1, int((reset_time - now).total_seconds()))
            
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "status": "error",
                    "data": "Rate limit exceeded. Please try again later."
                }
            )
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = "0"
            response.headers["X-RateLimit-Reset"] = str(int(reset_time.timestamp()))
            response.headers["Retry-After"] = str(retry_after_seconds)
            
            return response
        
        # Request allowed - proceed
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        remaining = max(0, max_requests - current_count)
        from datetime import timedelta
        reset_time = window_start + timedelta(minutes=1)
        
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(reset_time.timestamp()))
        
        return response
        
    except Exception as e:
        # Fail open - allow request if rate limiting check fails
        # This prevents rate limiting from breaking the service
        logger.error(f"Rate limit check failed for bot {bot_id}: {str(e)}", exc_info=True)
        return await call_next(request) 