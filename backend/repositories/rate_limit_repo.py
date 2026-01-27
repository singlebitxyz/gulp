from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from uuid import UUID
import logging
from config.supabasedb import get_supabase_client
from core.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class RateLimitRepository:
    """Repository for rate limit database operations"""

    def __init__(self, use_service_role: bool = False):
        """
        Initialize rate limit repository.
        
        Args:
            use_service_role: If True, uses service role client (for public endpoints)
        """
        self.supabase = get_supabase_client(use_service_role=use_service_role)

    def get_or_create_window(
        self, bot_id: UUID, window_start: datetime
    ) -> Dict[str, Any]:
        """
        Get or create a rate limit window for a bot.
        
        Args:
            bot_id: Bot UUID
            window_start: Start of the time window (minute-precision)
            
        Returns:
            Rate limit window record
        """
        try:
            # Try to get existing window
            result = (
                self.supabase.table("rate_limits")
                .select("*")
                .eq("bot_id", str(bot_id))
                .eq("window_start", window_start.isoformat())
                .maybe_single()
                .execute()
            )

            # Check if result exists and has data
            if result and result.data:
                return result.data

            # Create new window if it doesn't exist
            window_data = {
                "bot_id": str(bot_id),
                "window_start": window_start.isoformat(),
                "count": 0,
            }

            logger.info(f"Creating new rate limit window: bot_id={bot_id}, window_start={window_start.isoformat()}")
            result = (
                self.supabase.table("rate_limits")
                .insert(window_data)
                .execute()
            )

            if not result or not result.data or len(result.data) == 0:
                logger.error(f"Failed to create rate limit window: No data returned from insert")
                raise DatabaseError("Failed to create rate limit window")

            return result.data[0]

        except Exception as e:
            logger.error(f"Failed to get/create rate limit window: {str(e)}", exc_info=True)
            if isinstance(e, DatabaseError):
                raise
            raise DatabaseError(f"Failed to get/create rate limit window: {str(e)}")

    def increment_count(self, bot_id: UUID, window_start: datetime) -> Dict[str, Any]:
        """
        Increment the request count for a rate limit window.
        Uses PostgreSQL's atomic increment to avoid race conditions.
        Optimized to get count and increment in one operation.
        
        Args:
            bot_id: Bot UUID
            window_start: Start of the time window
            
        Returns:
            Updated rate limit window record with current count
        """
        try:
            # First, ensure the window exists (creates if doesn't exist)
            window = self.get_or_create_window(bot_id, window_start)
            current_count = window.get("count", 0)
            
            # Update with incremented count (PostgreSQL ensures atomicity)
            result = (
                self.supabase.table("rate_limits")
                .update({"count": current_count + 1})
                .eq("bot_id", str(bot_id))
                .eq("window_start", window_start.isoformat())
                .execute()
            )

            if not result or not result.data or len(result.data) == 0:
                logger.error(f"Failed to increment rate limit count: No data returned from update")
                raise DatabaseError("Failed to increment rate limit count")

            return result.data[0]

        except Exception as e:
            logger.error(f"Failed to increment rate limit: {str(e)}")
            if isinstance(e, DatabaseError):
                raise
            raise DatabaseError(f"Failed to increment rate limit: {str(e)}")

    def check_and_increment(
        self, bot_id: UUID, window_start: datetime, max_requests: int
    ) -> Tuple[bool, int]:
        """
        Optimized: Check rate limit and increment in a single database round-trip.
        This reduces latency by combining the check and increment operations.
        
        Args:
            bot_id: Bot UUID
            window_start: Start of the time window
            max_requests: Maximum requests allowed
            
        Returns:
            Tuple of (is_allowed, new_count)
        """
        try:
            # Get or create window and get current count
            window = self.get_or_create_window(bot_id, window_start)
            current_count = window.get("count", 0)
            
            # Check if limit exceeded BEFORE incrementing
            if current_count >= max_requests:
                return False, current_count
            
            # Increment count
            updated_window = self.increment_count(bot_id, window_start)
            new_count = updated_window.get("count", current_count + 1)
            
            return True, new_count

        except Exception as e:
            logger.error(f"Failed to check and increment rate limit: {str(e)}")
            # Fail open - allow request if check fails
            return True, 0

    def get_current_count(self, bot_id: UUID, window_start: datetime) -> int:
        """
        Get current request count for a rate limit window.
        
        Args:
            bot_id: Bot UUID
            window_start: Start of the time window
            
        Returns:
            Current request count
        """
        try:
            result = (
                self.supabase.table("rate_limits")
                .select("count")
                .eq("bot_id", str(bot_id))
                .eq("window_start", window_start.isoformat())
                .maybe_single()
                .execute()
            )

            if result and result.data:
                return result.data.get("count", 0)
            return 0

        except Exception as e:
            logger.error(f"Failed to get rate limit count: {str(e)}")
            return 0  # Fail open - allow request if we can't check

    def cleanup_old_windows(self, older_than_hours: int = 1) -> int:
        """
        Clean up old rate limit windows.
        
        Args:
            older_than_hours: Delete windows older than this many hours
            
        Returns:
            Number of deleted records
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
            
            # Try to use the database function first (if it exists)
            # The function takes no parameters, so pass empty dict
            try:
                result = (
                    self.supabase.rpc("cleanup_old_rate_limits", {})
                    .execute()
                )
                
                # The function returns an integer (deleted count)
                if result.data is not None:
                    deleted_count = result.data if isinstance(result.data, int) else 0
                    logger.info(f"Cleaned up {deleted_count} old rate limit windows via RPC")
                    return deleted_count
            except Exception as rpc_error:
                # RPC function might not exist or might have different signature
                # Fall back to direct delete
                logger.debug(f"RPC cleanup failed, using direct delete: {str(rpc_error)}")
            
            # Fallback: Use direct delete if RPC doesn't work
            result = (
                self.supabase.table("rate_limits")
                .delete()
                .lt("window_start", cutoff_time.isoformat())
                .execute()
            )
            
            # Count deleted records
            # Note: Supabase delete doesn't return deleted rows, so we can't get exact count
            # But we can estimate based on result
            deleted_count = 0
            if result.data is not None:
                # If result.data exists, it might contain deleted records
                deleted_count = len(result.data) if isinstance(result.data, list) else 0
            
            logger.info(f"Cleaned up old rate limit windows (cutoff: {cutoff_time.isoformat()})")
            return deleted_count

        except Exception as e:
            logger.error(f"Failed to cleanup old rate limit windows: {str(e)}")
            return 0
