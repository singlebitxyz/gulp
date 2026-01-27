from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID
import logging
from repositories.rate_limit_repo import RateLimitRepository
from config.settings import settings

logger = logging.getLogger(__name__)


class RateLimitService:
    """Service for rate limiting operations using database"""

    def __init__(self, use_service_role: bool = False):
        """
        Initialize rate limit service.
        
        Args:
            use_service_role: If True, uses service role client (for public endpoints)
        """
        self.repo = RateLimitRepository(use_service_role=use_service_role)
        self.default_limit = settings.rate_limit_per_minute
        self.window_size_minutes = 1  # 1-minute windows

    def _get_window_start(self, timestamp: Optional[datetime] = None) -> datetime:
        """
        Get the start of the current rate limit window.
        
        Args:
            timestamp: Optional timestamp (defaults to now)
            
        Returns:
            Window start time (minute-precision)
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Round down to the nearest minute
        window_start = timestamp.replace(second=0, microsecond=0)
        return window_start

    def check_rate_limit(
        self, bot_id: UUID, max_requests: Optional[int] = None
    ) -> Tuple[bool, int, int, datetime]:
        """
        Check if a request is allowed for a bot.
        
        Args:
            bot_id: Bot UUID
            max_requests: Maximum requests allowed (defaults to settings.rate_limit_per_minute)
            
        Returns:
            Tuple of (is_allowed, current_count, max_requests, window_start)
        """
        max_requests = max_requests or self.default_limit
        window_start = self._get_window_start()

        try:
            # Optimized: Check and increment in one operation (reduces from 2 queries to 1-2 queries)
            # Still need get_or_create_window, but we avoid the separate get_current_count call
            is_allowed, new_count = self.repo.check_and_increment(
                bot_id, window_start, max_requests
            )

            if not is_allowed:
                logger.warning(
                    f"Rate limit exceeded for bot {bot_id}: {new_count}/{max_requests} in window {window_start}"
                )
                return False, new_count, max_requests, window_start

            return True, new_count, max_requests, window_start

        except Exception as e:
            logger.error(f"Rate limit check failed for bot {bot_id}: {str(e)}")
            # Fail open - allow request if we can't check rate limit
            # This prevents rate limiting from breaking the service
            return True, 0, max_requests, window_start

    def get_rate_limit_status(
        self, bot_id: UUID, max_requests: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get current rate limit status for a bot.
        
        Args:
            bot_id: Bot UUID
            max_requests: Maximum requests allowed
            
        Returns:
            Dictionary with rate limit status
        """
        max_requests = max_requests or self.default_limit
        window_start = self._get_window_start()

        try:
            current_count = self.repo.get_current_count(bot_id, window_start)
            remaining = max(0, max_requests - current_count)
            reset_time = window_start + timedelta(minutes=self.window_size_minutes)

            return {
                "bot_id": str(bot_id),
                "current_count": current_count,
                "max_requests": max_requests,
                "remaining": remaining,
                "window_start": window_start.isoformat(),
                "reset_time": reset_time.isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to get rate limit status: {str(e)}")
            return {
                "bot_id": str(bot_id),
                "current_count": 0,
                "max_requests": max_requests,
                "remaining": max_requests,
                "window_start": window_start.isoformat(),
                "reset_time": (window_start + timedelta(minutes=self.window_size_minutes)).isoformat(),
            }

    def cleanup_old_windows(self, older_than_hours: int = 1) -> int:
        """
        Clean up old rate limit windows.
        
        Args:
            older_than_hours: Delete windows older than this many hours
            
        Returns:
            Number of deleted records
        """
        return self.repo.cleanup_old_windows(older_than_hours=older_than_hours)


# Global service instance (for general use)
rate_limit_service = RateLimitService(use_service_role=True)
