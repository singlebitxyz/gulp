"""
Source Repository

Handles all database operations for sources.
Sources can be files (PDF, DOCX, TXT) or URLs (HTML).
"""

from typing import List, Optional
from uuid import UUID
import logging

from core.exceptions import DatabaseError, NotFoundError
from config.supabasedb import get_supabase_client

logger = logging.getLogger(__name__)


class SourceRepository:
    """Repository for source operations"""

    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the repository with a Supabase client.
        
        Args:
            access_token: User's JWT token for RLS-enabled operations
        """
        self.client = get_supabase_client(access_token=access_token)
        self.access_token = access_token

    def create_source(self, source_data: dict) -> dict:
        """
        Create a new source.

        Args:
            source_data: Source data dictionary

        Returns:
            Created source record

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = self.client.table("sources").insert(source_data).execute()

            if not response.data:
                raise DatabaseError("Failed to create source")

            logger.info(f"Created source {response.data[0].get('id')}")
            return response.data[0]

        except Exception as e:
            logger.error(f"Error creating source: {str(e)}")
            if isinstance(e, DatabaseError):
                raise
            raise DatabaseError(f"Failed to create source: {str(e)}")

    def get_source_by_id(self, source_id: UUID) -> Optional[dict]:
        """
        Get source by ID.

        Args:
            source_id: ID of the source

        Returns:
            Source record if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("sources")
                .select("*")
                .eq("id", str(source_id))
                .maybe_single()
                .execute()
            )

            return response.data

        except Exception as e:
            logger.error(f"Error fetching source {source_id}: {str(e)}")
            raise DatabaseError(f"Failed to fetch source: {str(e)}")

    def get_sources_by_bot(self, bot_id: UUID) -> List[dict]:
        """
        Get all sources for a bot.

        Args:
            bot_id: ID of the bot

        Returns:
            List of source records

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("sources")
                .select("*")
                .eq("bot_id", str(bot_id))
                .order("created_at", desc=True)
                .execute()
            )

            return response.data or []

        except Exception as e:
            logger.error(f"Error fetching sources for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to fetch sources: {str(e)}")

    def update_source_status(
        self,
        source_id: UUID,
        status: str,
        error_message: Optional[str] = None,
    ) -> dict:
        """
        Update source status.

        Args:
            source_id: ID of the source
            status: New status
            error_message: Optional error message

        Returns:
            Updated source record

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            from datetime import datetime, timezone
            update_data = {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            if error_message:
                update_data["error_message"] = error_message

            response = (
                self.client.table("sources")
                .update(update_data)
                .eq("id", str(source_id))
                .execute()
            )

            if not response.data:
                raise NotFoundError("Source", str(source_id))

            logger.info(f"Updated source {source_id} status to {status}")
            return response.data[0]

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error updating source status: {str(e)}")
            raise DatabaseError(f"Failed to update source status: {str(e)}")

    def delete_source(self, source_id: UUID, bot_id: UUID) -> bool:
        """
        Delete a source.

        Args:
            source_id: ID of the source to delete
            bot_id: ID of the bot (for authorization check)

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If source not found
            DatabaseError: If database operation fails
        """
        try:
            # First verify the source belongs to the bot
            response = (
                self.client.table("sources")
                .select("id")
                .eq("id", str(source_id))
                .eq("bot_id", str(bot_id))
                .maybe_single()
                .execute()
            )

            if not response.data:
                raise NotFoundError(f"Source {source_id} not found")

            # Delete the source
            delete_response = (
                self.client.table("sources")
                .delete()
                .eq("id", str(source_id))
                .execute()
            )

            logger.info(f"Deleted source {source_id} for bot {bot_id}")
            return True

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error deleting source: {str(e)}")
            raise DatabaseError(f"Failed to delete source: {str(e)}")

