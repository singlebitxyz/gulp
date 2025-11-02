"""
Source API Controller

Handles HTTP requests for source management (file uploads and URL submissions).
"""

from fastapi import APIRouter, Request, HTTPException, status, UploadFile, File, Form
from typing import Optional
from uuid import UUID
import logging
import os
from pathlib import Path

from models.source_model import (
    SourceCreateModel,
    SourceResponseModel,
    SourceResponse,
    SourceListResponseModel,
    SourceType,
)
from services.source_service import SourceService
from middleware.auth_guard import auth_guard
from core.exceptions import (
    ValidationError,
    NotFoundError,
    AuthorizationError,
    DatabaseError,
)
from config.supabasedb import get_supabase_client

logger = logging.getLogger(__name__)

source_router = APIRouter()

# Allowed file types and their MIME types
ALLOWED_FILE_TYPES = {
    "application/pdf": SourceType.PDF,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": SourceType.DOCX,
    "text/plain": SourceType.TEXT,
}

ALLOWED_EXTENSIONS = {
    ".pdf": SourceType.PDF,
    ".docx": SourceType.DOCX,
    ".txt": SourceType.TEXT,
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_access_token_from_request(request: Request):
    """Extract access token from request cookies"""
    try:
        import base64
        import json
        
        supabase_cookie = None
        for cookie_name, cookie_value in request.cookies.items():
            if cookie_name.startswith("sb-") and cookie_name.endswith("-auth-token"):
                supabase_cookie = cookie_value
                break
        
        if not supabase_cookie:
            return None
        
        if supabase_cookie.startswith('base64-'):
            encoded_data = supabase_cookie[7:]
        else:
            encoded_data = supabase_cookie
        
        missing_padding = len(encoded_data) % 4
        if missing_padding:
            encoded_data += '=' * (4 - missing_padding)
        
        decoded_data = base64.b64decode(encoded_data).decode('utf-8')
        token_data = json.loads(decoded_data)
        
        access_token = token_data.get("access_token")
        if access_token:
            logger.info(f"Access token extracted successfully (length: {len(access_token)})")
        else:
            logger.warning("Access token not found in cookie data")
        return access_token
    except Exception as e:
        logger.error(f"Failed to extract access token from cookie: {str(e)}")
        return None


def validate_file(file: UploadFile) -> tuple[SourceType, str]:
    """
    Validate uploaded file and return source type and MIME type.
    
    Args:
        file: Uploaded file
        
    Returns:
        Tuple of (source_type, mime_type)
        
    Raises:
        ValidationError: If file is invalid
    """
    # Check file extension
    filename = file.filename or ""
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        )
    
    source_type = ALLOWED_EXTENSIONS[file_ext]
    
    # Check MIME type if provided
    if file.content_type:
        if file.content_type not in ALLOWED_FILE_TYPES:
            raise ValidationError(f"MIME type not allowed: {file.content_type}")
        
        # Verify MIME type matches extension
        expected_type = ALLOWED_FILE_TYPES[file.content_type]
        if expected_type != source_type:
            raise ValidationError(
                f"MIME type {file.content_type} does not match file extension {file_ext}"
            )
    
    mime_type = file.content_type or "application/octet-stream"
    
    return source_type, mime_type


@source_router.post("/bots/{bot_id}/sources/upload", status_code=status.HTTP_201_CREATED)
@auth_guard
async def upload_file_source(
    request: Request,
    bot_id: UUID,
    file: UploadFile = File(...),
):
    """
    Upload a file source (PDF, DOCX, or TXT).
    
    Returns the created source record.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        access_token = get_access_token_from_request(request)
        
        # Validate file
        source_type, mime_type = validate_file(file)
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Verify user owns the bot before uploading (authorization check)
        # This ensures only authorized uploads proceed
        source_service = SourceService(access_token=access_token)
        # We'll verify ownership by trying to get the bot
        from services.bot_service import BotService
        bot_service = BotService()
        bot_service.get_bot(str(bot_id), str(user_id), access_token=access_token)
        
        # Generate storage path: bots/{bot_id}/sources/{source_id}/{filename}
        # We'll create a temporary source ID first, then upload
        from uuid import uuid4
        source_id = str(uuid4())
        storage_path = f"bots/{bot_id}/sources/{source_id}/{file.filename}"
        
        # Upload to Supabase Storage using service role
        # Note: We've already verified ownership above, so using service role is safe
        # This bypasses RLS which can be complex with storage paths
        try:
            storage_client = get_supabase_client(use_service_role=True)
            
            storage_response = storage_client.storage.from_("sources").upload(
                storage_path,
                file_content,
                file_options={"content-type": mime_type}
            )
            
            if not storage_response:
                raise DatabaseError("Failed to upload file to storage")
            
            logger.info(f"File uploaded to storage: {storage_path}")
            
        except Exception as e:
            logger.error(f"Error uploading file to storage: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file to storage"
            )
        
        # Create source record (source_service already initialized above)
        source_data = source_service.create_file_source(
            bot_id=bot_id,
            user_id=UUID(user_id),
            source_type=source_type,
            storage_path=storage_path,
            file_size=file_size,
            mime_type=mime_type,
        )
        
        response_data = SourceResponseModel(**source_data)
        
        return SourceResponse(
            status="success",
            data=response_data,
            message="File uploaded successfully",
        )
        
    except ValidationError as e:
        logger.error(f"Validation error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AuthorizationError as e:
        logger.error(f"Authorization error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload files for this bot",
        )
    except DatabaseError as e:
        logger.error(f"Database error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create source",
        )
    except Exception as e:
        logger.error(f"Unexpected error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@source_router.post("/bots/{bot_id}/sources/url", status_code=status.HTTP_201_CREATED)
@auth_guard
async def create_url_source(
    request: Request,
    bot_id: UUID,
    source_data: SourceCreateModel,
):
    """
    Submit a URL as a source.
    
    Returns the created source record.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        access_token = get_access_token_from_request(request)
        
        # Verify it's an HTML source
        if source_data.source_type != SourceType.HTML:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL sources must have source_type='html'"
            )
        
        source_service = SourceService(access_token=access_token)
        
        source_result = source_service.create_url_source(
            bot_id=bot_id,
            user_id=UUID(user_id),
            url=source_data.original_url,
        )
        
        response_data = SourceResponseModel(**source_result)
        
        return SourceResponse(
            status="success",
            data=response_data,
            message="URL source created successfully",
        )
        
    except ValidationError as e:
        logger.error(f"Validation error creating URL source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AuthorizationError as e:
        logger.error(f"Authorization error creating URL source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add sources for this bot",
        )
    except DatabaseError as e:
        logger.error(f"Database error creating URL source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create source",
        )
    except Exception as e:
        logger.error(f"Unexpected error creating URL source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@source_router.get("/bots/{bot_id}/sources")
@auth_guard
async def list_sources(
    request: Request,
    bot_id: UUID,
):
    """List all sources for a bot"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        access_token = get_access_token_from_request(request)
        
        source_service = SourceService(access_token=access_token)
        
        sources = source_service.get_sources_by_bot(
            bot_id=bot_id,
            user_id=UUID(user_id),
        )
        
        response_data = [SourceResponseModel(**source) for source in sources]
        
        return SourceListResponseModel(
            status="success",
            data=response_data,
            message=f"Found {len(response_data)} source(s)",
        )
        
    except AuthorizationError as e:
        logger.error(f"Authorization error listing sources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view sources for this bot",
        )
    except DatabaseError as e:
        logger.error(f"Database error listing sources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sources",
        )
    except Exception as e:
        logger.error(f"Unexpected error listing sources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@source_router.get("/bots/{bot_id}/sources/{source_id}")
@auth_guard
async def get_source(
    request: Request,
    bot_id: UUID,
    source_id: UUID,
):
    """Get a specific source by ID"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        access_token = get_access_token_from_request(request)
        
        source_service = SourceService(access_token=access_token)
        
        source = source_service.get_source(
            source_id=source_id,
            bot_id=bot_id,
            user_id=UUID(user_id),
        )
        
        response_data = SourceResponseModel(**source)
        
        return SourceResponse(
            status="success",
            data=response_data,
            message="Source retrieved successfully",
        )
        
    except NotFoundError as e:
        logger.error(f"Source not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    except AuthorizationError as e:
        logger.error(f"Authorization error getting source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this source",
        )
    except DatabaseError as e:
        logger.error(f"Database error getting source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch source",
        )
    except Exception as e:
        logger.error(f"Unexpected error getting source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@source_router.delete("/bots/{bot_id}/sources/{source_id}")
@auth_guard
async def delete_source(
    request: Request,
    bot_id: UUID,
    source_id: UUID,
):
    """Delete a source"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        access_token = get_access_token_from_request(request)
        
        source_service = SourceService(access_token=access_token)
        
        source_service.delete_source(
            source_id=source_id,
            bot_id=bot_id,
            user_id=UUID(user_id),
        )
        
        return {
            "status": "success",
            "message": "Source deleted successfully",
        }
        
    except NotFoundError as e:
        logger.error(f"Source not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    except AuthorizationError as e:
        logger.error(f"Authorization error deleting source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this source",
        )
    except DatabaseError as e:
        logger.error(f"Database error deleting source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete source",
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )

