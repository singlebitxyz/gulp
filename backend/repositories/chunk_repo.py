"""
Chunk Repository

Handles all database operations for chunks.
"""

from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime, timezone

from core.exceptions import DatabaseError, NotFoundError
from config.supabasedb import get_supabase_client

logger = logging.getLogger(__name__)


class ChunkRepository:
    """Repository for chunk operations"""

    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the repository with a Supabase client.
        
        Args:
            access_token: User's JWT token for RLS-enabled operations
        """
        self.client = get_supabase_client(access_token=access_token)
        self.access_token = access_token

    def create_chunks(self, chunks_data: List[dict]) -> List[dict]:
        """
        Create multiple chunks in a batch operation.

        Args:
            chunks_data: List of chunk data dictionaries

        Returns:
            List of created chunk records

        Raises:
            DatabaseError: If database operation fails
        """
        if not chunks_data:
            return []
        
        try:
            response = self.client.table("chunks").insert(chunks_data).execute()

            if not response.data:
                raise DatabaseError("Failed to create chunks")

            logger.info(f"Created {len(response.data)} chunks")
            return response.data

        except Exception as e:
            logger.error(f"Error creating chunks: {str(e)}")
            raise DatabaseError(f"Failed to create chunks: {str(e)}")

    def get_chunks_by_source(self, source_id: UUID) -> List[dict]:
        """
        Get all chunks for a source.

        Args:
            source_id: ID of the source

        Returns:
            List of chunk records

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("chunks")
                .select("*")
                .eq("source_id", str(source_id))
                .order("chunk_index", desc=False)
                .execute()
            )

            return response.data or []

        except Exception as e:
            logger.error(f"Error fetching chunks for source {source_id}: {str(e)}")
            raise DatabaseError(f"Failed to fetch chunks: {str(e)}")

    def get_chunks_by_bot(self, bot_id: UUID, limit: Optional[int] = None) -> List[dict]:
        """
        Get all chunks for a bot.

        Args:
            bot_id: ID of the bot
            limit: Optional limit on number of chunks to return

        Returns:
            List of chunk records

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            query = (
                self.client.table("chunks")
                .select("*")
                .eq("bot_id", str(bot_id))
                .order("created_at", desc=True)
            )
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()

            return response.data or []

        except Exception as e:
            logger.error(f"Error fetching chunks for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to fetch chunks: {str(e)}")

    def get_chunk_by_id(self, chunk_id: UUID) -> Optional[dict]:
        """
        Get chunk by ID.

        Args:
            chunk_id: ID of the chunk

        Returns:
            Chunk record if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("chunks")
                .select("*")
                .eq("id", str(chunk_id))
                .maybe_single()
                .execute()
            )

            return response.data

        except Exception as e:
            logger.error(f"Error fetching chunk {chunk_id}: {str(e)}")
            raise DatabaseError(f"Failed to fetch chunk: {str(e)}")

    def delete_chunks_by_source(self, source_id: UUID) -> bool:
        """
        Delete all chunks for a source.
        Used when a source is deleted (cascade should handle this, but explicit for safety).

        Args:
            source_id: ID of the source

        Returns:
            True if deleted successfully

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("chunks")
                .delete()
                .eq("source_id", str(source_id))
                .execute()
            )

            logger.info(f"Deleted chunks for source {source_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting chunks for source {source_id}: {str(e)}")
            raise DatabaseError(f"Failed to delete chunks: {str(e)}")

    def count_chunks_by_source(self, source_id: UUID) -> int:
        """
        Count chunks for a source.

        Args:
            source_id: ID of the source

        Returns:
            Number of chunks

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            response = (
                self.client.table("chunks")
                .select("id", count="exact")
                .eq("source_id", str(source_id))
                .execute()
            )

            return response.count or 0

        except Exception as e:
            logger.error(f"Error counting chunks for source {source_id}: {str(e)}")
            raise DatabaseError(f"Failed to count chunks: {str(e)}")

    def update_chunk_embeddings(self, chunk_ids: List[UUID], embeddings: List[List[float]]) -> int:
        """
        Update embeddings for a batch of chunks.

        Args:
            chunk_ids: IDs of chunks to update
            embeddings: Corresponding embedding vectors

        Returns:
            Number of updated rows

        Raises:
            DatabaseError: If database operation fails
        """
        if not chunk_ids or not embeddings or len(chunk_ids) != len(embeddings):
            return 0

        try:
            # Supabase does not support bulk update by different values easily; do per-row
            updated_count = 0
            for cid, vec in zip(chunk_ids, embeddings):
                response = (
                    self.client.table("chunks")
                    .update({"embedding": vec})
                    .eq("id", str(cid))
                    .execute()
                )
                if response.data:
                    updated_count += 1
            return updated_count
        except Exception as e:
            logger.error(f"Error updating chunk embeddings: {str(e)}")
            raise DatabaseError(f"Failed to update embeddings: {str(e)}")

