from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum


class SourceType(str, Enum):
    """Source type enum matching database"""
    PDF = "pdf"
    DOCX = "docx"
    HTML = "html"
    TEXT = "text"


class SourceStatus(str, Enum):
    """Source status enum matching database"""
    UPLOADED = "uploaded"
    PARSING = "parsing"
    INDEXED = "indexed"
    FAILED = "failed"


class SourceCreateModel(BaseModel):
    """Model for creating a new source"""
    source_type: SourceType = Field(..., description="Type of source")
    original_url: Optional[str] = Field(
        None,
        description="Original URL for HTML sources (required for HTML type)"
    )
    # Note: For file uploads, the file will be handled via multipart form data
    # This model is mainly for URL submission

    @field_validator('original_url')
    @classmethod
    def validate_url(cls, v: Optional[str], info) -> Optional[str]:
        source_type = info.data.get('source_type')
        if source_type == SourceType.HTML and not v:
            raise ValueError("original_url is required for HTML sources")
        if source_type != SourceType.HTML and v:
            raise ValueError("original_url should only be provided for HTML sources")
        return v

    model_config = {"use_enum_values": True}


class SourceResponseModel(BaseModel):
    """Response model for source data"""
    id: str = Field(..., description="Source ID")
    bot_id: str = Field(..., description="Bot ID")
    source_type: str = Field(..., description="Source type")
    original_url: Optional[str] = Field(None, description="Original URL")
    canonical_url: Optional[str] = Field(None, description="Canonical URL")
    storage_path: str = Field(..., description="Storage path")
    status: str = Field(..., description="Source status")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class SourceListResponseModel(BaseModel):
    """Response model for source list"""
    status: str = Field(default="success", description="Response status")
    data: list[SourceResponseModel] = Field(..., description="List of sources")
    message: Optional[str] = Field(None, description="Response message")


class SourceResponse(BaseModel):
    """Single source response"""
    status: str = Field(default="success", description="Response status")
    data: SourceResponseModel = Field(..., description="Source data")
    message: Optional[str] = Field(None, description="Response message")

