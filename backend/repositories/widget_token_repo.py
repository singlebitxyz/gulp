"""
Widget Token Repository

Handles all database operations for widget tokens.
Widget tokens are used for authenticating embedded chat widgets on client websites.
"""

from typing import List, Optional
from datetime import datetime
from uuid import UUID
import logging

from core.exceptions import DatabaseError, NotFoundError
from config.supabasedb import get_supabase_client

logger = logging.getLogger(__name__)


class WidgetTokenRepository:
    """Repository for widget token operations"""

    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the repository with a Supabase client.
        
        Args:
            access_token: User's JWT token for RLS-enabled operations
        """
        self.client = get_supabase_client(access_token=access_token)
        self.access_token = access_token

    def create_token(
        self,
        bot_id: UUID,
        token_hash: str,
        token_prefix: Optional[str],
        allowed_domains: List[str],
        name: Optional[str],
        expires_at: Optional[datetime],
    ) -> dict:
        """
        Create a new widget token.

        Args:
            bot_id: ID of the bot
            token_hash: Hashed token (never store plain tokens)
            token_prefix: First 8 chars for identification
            allowed_domains: List of allowed domains
            name: Optional descriptive name
            expires_at: Optional expiration date

        Returns:
            Created token record

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            token_data = {
                "bot_id": str(bot_id),
                "token_hash": token_hash,
                "token_prefix": token_prefix,
                "allowed_domains": allowed_domains,
                "name": name,
                "expires_at": expires_at.isoformat() if expires_at else None,
            }

            response = self.client.table("widget_tokens").insert(token_data).execute()

            if not response.data:
                raise DatabaseError("Failed to create widget token")

            logger.info(f"Created widget token for bot {bot_id}")
            return response.data[0]

        except Exception as e:
            logger.error(f"Error creating widget token: {str(e)}")
            if isinstance(e, DatabaseError):
                raise
            raise DatabaseError(f"Failed to create widget token: {str(e)}")

    def get_tokens_by_bot(self, bot_id: UUID) -> List[dict]:
        """
        Get all tokens for a bot.

        Args:
            bot_id: ID of the bot

        Returns:
            List of token records

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("widget_tokens")
                .select("*")
                .eq("bot_id", str(bot_id))
                .order("created_at", desc=True)
                .execute()
            )

            return response.data or []

        except Exception as e:
            logger.error(f"Error fetching tokens for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to fetch tokens: {str(e)}")

    def get_token_by_hash(self, token_hash: str) -> Optional[dict]:
        """
        Get token by hash (used for validation).
        Note: This should use service role for public widget queries.

        Args:
            token_hash: Hashed token

        Returns:
            Token record if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            # Use service role for widget token validation (bypasses RLS)
            service_client = get_supabase_client(use_service_role=True)
            
            response = (
                service_client.table("widget_tokens")
                .select("*")
                .eq("token_hash", token_hash)
                .maybe_single()
                .execute()
            )

            return response.data

        except Exception as e:
            logger.error(f"Error fetching token by hash: {str(e)}")
            raise DatabaseError(f"Failed to fetch token: {str(e)}")

    def delete_token(self, token_id: UUID, bot_id: UUID) -> bool:
        """
        Delete a widget token (revoke it).

        Args:
            token_id: ID of the token to delete
            bot_id: ID of the bot (for authorization check)

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If token not found
            DatabaseError: If database operation fails
        """
        try:
            # First verify the token belongs to the bot
            response = (
                self.client.table("widget_tokens")
                .select("id")
                .eq("id", str(token_id))
                .eq("bot_id", str(bot_id))
                .maybe_single()
                .execute()
            )

            if not response.data:
                raise NotFoundError(f"Widget token {token_id} not found")

            # Delete the token
            delete_response = (
                self.client.table("widget_tokens")
                .delete()
                .eq("id", str(token_id))
                .execute()
            )

            logger.info(f"Deleted widget token {token_id} for bot {bot_id}")
            return True

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error deleting widget token: {str(e)}")
            raise DatabaseError(f"Failed to delete widget token: {str(e)}")

    def update_last_used(self, token_id: UUID) -> bool:
        """
        Update the last_used_at timestamp for a token.
        Note: This should use service role for widget queries.

        Args:
            token_id: ID of the token

        Returns:
            True if updated successfully
        """
        try:
            service_client = get_supabase_client(use_service_role=True)
            
            from datetime import timezone
            response = (
                service_client.table("widget_tokens")
                .update({"last_used_at": datetime.now(timezone.utc).isoformat()})
                .eq("id", str(token_id))
                .execute()
            )

            return bool(response.data)

        except Exception as e:
            logger.error(f"Error updating token last_used_at: {str(e)}")
            # Don't raise - this is non-critical
            return False

