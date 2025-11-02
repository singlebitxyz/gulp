"""
Source Service

Business logic for source management.
Handles file uploads and URL submissions.
"""

from typing import List, Optional
from uuid import UUID
import logging
from urllib.parse import urlparse

from core.exceptions import ValidationError, NotFoundError, AuthorizationError, DatabaseError
from repositories.source_repo import SourceRepository
from services.bot_service import BotService
from models.source_model import SourceType, SourceStatus

logger = logging.getLogger(__name__)


class SourceService:
    """Service for source operations"""

    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the service.

        Args:
            access_token: User's JWT token for RLS-enabled operations
        """
        self.access_token = access_token
        self.repository = SourceRepository(access_token=access_token)

    def _validate_url(self, url: str) -> tuple[str, str]:
        """
        Validate and normalize a URL.

        Args:
            url: URL to validate

        Returns:
            Tuple of (canonical_url, normalized_url)

        Raises:
            ValidationError: If URL is invalid
        """
        try:
            parsed = urlparse(url)
            
            # Must have scheme and netloc
            if not parsed.scheme or not parsed.netloc:
                raise ValidationError(f"Invalid URL format: {url}")
            
            # Only allow http and https
            if parsed.scheme not in ("http", "https"):
                raise ValidationError(f"Only http and https URLs are allowed. Got: {parsed.scheme}")
            
            # Normalize URL (remove fragment, default ports, trailing slashes)
            canonical_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
            if parsed.query:
                canonical_url += f"?{parsed.query}"
            
            return canonical_url, url

        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"Invalid URL: {str(e)}")

    def create_file_source(
        self,
        bot_id: UUID,
        user_id: UUID,
        source_type: SourceType,
        storage_path: str,
        file_size: int,
        mime_type: Optional[str] = None,
    ) -> dict:
        """
        Create a source record for an uploaded file.

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)
            source_type: Type of source (pdf, docx, text)
            storage_path: Path in storage (Supabase Storage/S3)
            file_size: File size in bytes
            mime_type: Optional MIME type

        Returns:
            Created source record

        Raises:
            ValidationError: If validation fails
            AuthorizationError: If user doesn't own the bot
            DatabaseError: If database operation fails
        """
        # Verify user owns the bot
        bot_service = BotService()
        bot_service.get_bot(str(bot_id), str(user_id), access_token=self.access_token)

        # Validate source type for files
        if source_type not in (SourceType.PDF, SourceType.DOCX, SourceType.TEXT):
            raise ValidationError(f"Invalid source type for file upload: {source_type}")

        # Validate file size (max 50MB)
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
        if file_size > MAX_FILE_SIZE:
            raise ValidationError(f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB")

        if file_size <= 0:
            raise ValidationError("File size must be greater than 0")

        # Create source record
        source_data = {
            "bot_id": str(bot_id),
            "source_type": source_type.value,
            "storage_path": storage_path,
            "status": SourceStatus.UPLOADED.value,
            "file_size": file_size,
            "mime_type": mime_type,
        }

        return self.repository.create_source(source_data)

    def create_url_source(
        self,
        bot_id: UUID,
        user_id: UUID,
        url: str,
    ) -> dict:
        """
        Create a source record for a URL.

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)
            url: URL to add as source

        Returns:
            Created source record

        Raises:
            ValidationError: If validation fails
            AuthorizationError: If user doesn't own the bot
            DatabaseError: If database operation fails
        """
        # Verify user owns the bot
        bot_service = BotService()
        bot_service.get_bot(str(bot_id), str(user_id), access_token=self.access_token)

        # Validate and normalize URL
        canonical_url, original_url = self._validate_url(url)

        # Create source record
        source_data = {
            "bot_id": str(bot_id),
            "source_type": SourceType.HTML.value,
            "original_url": original_url,
            "canonical_url": canonical_url,
            "storage_path": canonical_url,  # For URLs, storage_path is the URL itself
            "status": SourceStatus.UPLOADED.value,
        }

        return self.repository.create_source(source_data)

    def get_sources_by_bot(self, bot_id: UUID, user_id: UUID) -> List[dict]:
        """
        Get all sources for a bot.

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)

        Returns:
            List of source records

        Raises:
            AuthorizationError: If user doesn't own the bot
            DatabaseError: If database operation fails
        """
        # Verify user owns the bot
        bot_service = BotService()
        bot_service.get_bot(str(bot_id), str(user_id), access_token=self.access_token)

        return self.repository.get_sources_by_bot(bot_id)

    def get_source(self, source_id: UUID, bot_id: UUID, user_id: UUID) -> dict:
        """
        Get a source by ID.

        Args:
            source_id: ID of the source
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)

        Returns:
            Source record

        Raises:
            AuthorizationError: If user doesn't own the bot
            NotFoundError: If source not found
            DatabaseError: If database operation fails
        """
        # Verify user owns the bot
        bot_service = BotService()
        bot_service.get_bot(str(bot_id), str(user_id), access_token=self.access_token)

        source = self.repository.get_source_by_id(source_id)
        if not source:
            raise NotFoundError("Source", str(source_id))

        # Verify source belongs to bot
        if source.get("bot_id") != str(bot_id):
            raise AuthorizationError("Source does not belong to this bot")

        return source

    def delete_source(self, source_id: UUID, bot_id: UUID, user_id: UUID) -> bool:
        """
        Delete a source.

        Args:
            source_id: ID of the source to delete
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)

        Returns:
            True if deleted successfully

        Raises:
            AuthorizationError: If user doesn't own the bot
            NotFoundError: If source not found
            DatabaseError: If database operation fails
        """
        # Verify user owns the bot
        bot_service = BotService()
        bot_service.get_bot(str(bot_id), str(user_id), access_token=self.access_token)

        return self.repository.delete_source(source_id, bot_id)

