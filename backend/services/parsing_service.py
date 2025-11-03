"""
Parsing Service

Orchestrates document parsing operations.
Coordinates between parsers, storage, and source repository.
Handles parsing asynchronously with proper error handling and status updates.
"""

from typing import Optional
from uuid import UUID
import logging
from config.supabasedb import get_supabase_client
from parsers.factory import ParserFactory
from parsers.base import ParseResult
from repositories.source_repo import SourceRepository
from services.chunk_service import ChunkService
from models.source_model import SourceStatus, SourceType

logger = logging.getLogger(__name__)


class ParsingService:
    """
    Service for orchestrating document parsing operations.
    
    This service:
    - Downloads files from storage
    - Selects appropriate parser
    - Extracts text and metadata
    - Updates source status
    - Handles errors gracefully
    """
    
    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize parsing service.
        
        Args:
            access_token: User's JWT token for RLS-enabled operations
        """
        self.access_token = access_token
        self.parser_factory = ParserFactory()
        self.source_repo = SourceRepository(access_token=access_token)
        self.chunk_service = ChunkService(access_token=access_token)
        self.storage_client = get_supabase_client(use_service_role=True)
    
    def parse_source(self, source_id: UUID, bot_id: UUID) -> bool:
        """
        Parse a source document.
        
        This method:
        1. Fetches source metadata
        2. Downloads file from storage (if file source)
        3. Selects appropriate parser
        4. Extracts text
        5. Updates source status
        6. Stores extracted text (to be used in Phase 5 for chunking)
        
        Args:
            source_id: Source UUID
            bot_id: Bot UUID (for authorization)
        
        Returns:
            True if parsing succeeded, False otherwise
        """
        try:
            # Update status to parsing
            self.source_repo.update_source_status(
                source_id=source_id,
                status=SourceStatus.PARSING.value
            )
            logger.info(f"Started parsing source {source_id}")
            
            # Get source metadata
            source = self.source_repo.get_source_by_id(source_id)
            if not source:
                raise ValueError(f"Source {source_id} not found")
            
            source_type = source.get("source_type")
            storage_path = source.get("storage_path")
            mime_type = source.get("mime_type")
            
            # Handle file sources
            if source_type in (SourceType.PDF.value, SourceType.DOCX.value, SourceType.TEXT.value):
                if not storage_path:
                    raise ValueError(f"Storage path missing for source {source_id}")
                
                logger.info(
                    f"Starting parsing for source {source_id}:\n"
                    f"  - Type: {source_type}\n"
                    f"  - Storage path: {storage_path}\n"
                    f"  - MIME type: {mime_type}"
                )
                
                # Download file from storage
                file_content = self._download_file(storage_path)
                file_size = len(file_content)
                logger.info(f"Downloaded file from storage: {file_size:,} bytes")
                
                # Get file extension from storage path
                file_extension = self._get_file_extension(storage_path)
                
                # Get parser
                parser = self.parser_factory.get_parser(mime_type or "", file_extension)
                if not parser:
                    raise ValueError(
                        f"No parser available for source type: {source_type}, "
                        f"MIME type: {mime_type}"
                    )
                
                logger.info(f"Using parser: {parser.get_name()}")
                
                # Parse document
                result: ParseResult = parser.parse(file_content, storage_path)
                
                if not result.success:
                    # Update status to failed
                    self.source_repo.update_source_status(
                        source_id=source_id,
                        status=SourceStatus.FAILED.value,
                        error_message=result.error_message
                    )
                    logger.error(f"Parsing failed for source {source_id}: {result.error_message}")
                    return False
                
                # Store extracted text (for now, we'll just log it)
                # In Phase 5, we'll create chunks from this text
                extracted_text = result.text
                metadata = result.metadata
                
                # Log extracted text details
                text_length = len(extracted_text)
                text_preview = extracted_text[:500] if text_length > 500 else extracted_text
                text_preview_suffix = "..." if text_length > 500 else ""
                
                # Build metadata summary
                metadata_summary = []
                if "page_count" in metadata:
                    metadata_summary.append(f"{metadata['page_count']} pages")
                if "paragraph_count" in metadata:
                    metadata_summary.append(f"{metadata['paragraph_count']} paragraphs")
                if "total_lines" in metadata:
                    metadata_summary.append(f"{metadata['total_lines']} lines")
                if "encoding" in metadata:
                    metadata_summary.append(f"encoding: {metadata['encoding']}")
                
                metadata_str = ", ".join(metadata_summary) if metadata_summary else "no metadata"
                
                logger.info(
                    f"Successfully parsed source {source_id}:\n"
                    f"  - Extracted {text_length:,} characters\n"
                    f"  - Metadata: {metadata_str}\n"
                    f"  - Text preview (first 500 chars):\n"
                    f"    {text_preview}{text_preview_suffix}"
                )
                
                # Log full text if it's relatively small (for debugging)
                if text_length <= 5000:
                    logger.debug(f"Full extracted text for source {source_id}:\n{extracted_text}")
                
                # Chunk the extracted text and store in database
                logger.info(f"Starting chunking for source {source_id}")
                try:
                    created_chunks = self.chunk_service.chunk_and_store_source(
                        source_id=source_id,
                        bot_id=bot_id,
                        text=extracted_text,
                        source_type=SourceType(source_type)
                    )
                    
                    logger.info(
                        f"Successfully chunked source {source_id} into {len(created_chunks)} chunks"
                    )
                    
                except Exception as e:
                    logger.error(
                        f"Error chunking source {source_id}: {str(e)}",
                        exc_info=True
                    )
                    # Update status to failed if chunking fails
                    self.source_repo.update_source_status(
                        source_id=source_id,
                        status=SourceStatus.FAILED.value,
                        error_message=f"Chunking failed: {str(e)}"
                    )
                    return False
                
                # Phase 6: Generate embeddings for created chunks
                try:
                    from services.embedding_service import EmbeddingService
                    chunk_texts = [c.get("excerpt", "") for c in created_chunks]
                    chunk_ids = [c.get("id") for c in created_chunks]
                    embedding_service = EmbeddingService(access_token=self.access_token)
                    updated = embedding_service.embed_chunks_for_source(
                        source_id=source_id,
                        texts=chunk_texts,
                        chunk_ids=chunk_ids,
                    )
                    logger.info(
                        f"Updated embeddings for {updated}/{len(created_chunks)} chunks of source {source_id}"
                    )
                except Exception as e:
                    logger.error(f"Embedding failed for source {source_id}: {str(e)}", exc_info=True)
                    self.source_repo.update_source_status(
                        source_id=source_id,
                        status=SourceStatus.FAILED.value,
                        error_message=f"Embedding failed: {str(e)}"
                    )
                    return False

                # Update status to indexed (chunking + embeddings complete)
                self.source_repo.update_source_status(
                    source_id=source_id,
                    status=SourceStatus.INDEXED.value
                )

                return True
            
            # Handle URL sources (HTML) - will be implemented in Phase 5
            elif source_type == SourceType.HTML.value:
                # URL sources will be handled by web crawler in later phase
                logger.info(f"URL source {source_id} parsing deferred to crawler phase")
                # For now, mark as indexed (will be processed later)
                self.source_repo.update_source_status(
                    source_id=source_id,
                    status=SourceStatus.INDEXED.value
                )
                return True
            
            else:
                raise ValueError(f"Unsupported source type: {source_type}")
                
        except Exception as e:
            error_msg = f"Error parsing source {source_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            # Update status to failed
            try:
                self.source_repo.update_source_status(
                    source_id=source_id,
                    status=SourceStatus.FAILED.value,
                    error_message=error_msg
                )
            except Exception as update_error:
                logger.error(f"Failed to update source status: {str(update_error)}")
            
            return False
    
    def _download_file(self, storage_path: str) -> bytes:
        """
        Download file from Supabase Storage.
        
        Args:
            storage_path: Path to file in storage bucket (format: bots/{bot_id}/sources/{source_id}/{filename})
        
        Returns:
            File content as bytes
        
        Raises:
            ValueError: If file download fails
        """
        try:
            # Storage path format: bots/{bot_id}/sources/{source_id}/{filename}
            # Supabase Storage download uses the full path as stored (same as upload)
            # Download from sources bucket
            response = self.storage_client.storage.from_("sources").download(storage_path)
            
            if not response:
                raise ValueError(f"Failed to download file from storage: {storage_path}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error downloading file {storage_path}: {str(e)}")
            raise ValueError(f"Failed to download file: {str(e)}")
    
    def _get_file_extension(self, file_path: str) -> Optional[str]:
        """
        Extract file extension from path.
        
        Args:
            file_path: File path
        
        Returns:
            File extension with dot (e.g., '.pdf') or None
        """
        if "." not in file_path:
            return None
        
        parts = file_path.rsplit(".", 1)
        if len(parts) == 2:
            return f".{parts[1].lower()}"
        return None

