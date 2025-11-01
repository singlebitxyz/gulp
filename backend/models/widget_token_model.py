from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class WidgetTokenCreateModel(BaseModel):
    """Model for creating a new widget token"""
    name: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional descriptive name for the token"
    )
    allowed_domains: List[str] = Field(
        ...,
        min_length=1,
        description="List of allowed domains (origins) for the token"
    )
    expires_at: Optional[datetime] = Field(
        None,
        description="Optional expiration date for the token"
    )

    @field_validator('allowed_domains')
    @classmethod
    def validate_domains(cls, v: List[str]) -> List[str]:
        if not v or len(v) == 0:
            raise ValueError("At least one allowed domain is required")
        
        # Basic domain validation
        for domain in v:
            domain = domain.strip()
            if not domain:
                raise ValueError("Domain cannot be empty")
            # Allow localhost for development
            if not (domain.startswith("http://") or 
                   domain.startswith("https://") or
                   domain.startswith("localhost") or
                   domain.startswith("127.0.0.1") or
                   "." in domain):
                raise ValueError(f"Invalid domain format: {domain}")
        
        return [d.strip() for d in v]


class WidgetTokenResponseModel(BaseModel):
    """Response model for widget token data"""
    id: str = Field(..., description="Token ID")
    bot_id: str = Field(..., description="Bot ID")
    token_prefix: Optional[str] = Field(None, description="First 8 chars of token (for identification)")
    name: Optional[str] = Field(None, description="Token name")
    allowed_domains: List[str] = Field(..., description="Allowed domains")
    expires_at: Optional[str] = Field(None, description="Expiration timestamp")
    last_used_at: Optional[str] = Field(None, description="Last usage timestamp")
    created_at: str = Field(..., description="Creation timestamp")
    
    # Security: Never return the actual token or hash
    # The token is only returned once during creation
    
    model_config = {"from_attributes": True}


class WidgetTokenCreateResponseModel(BaseModel):
    """Response model when creating a widget token (includes plain token once)"""
    status: str = Field(default="success", description="Response status")
    data: WidgetTokenResponseModel = Field(..., description="Token data")
    token: str = Field(..., description="Plain token (shown only once during creation)")
    message: Optional[str] = Field(None, description="Response message")


class WidgetTokenListResponseModel(BaseModel):
    """Response model for widget token list"""
    status: str = Field(default="success", description="Response status")
    data: List[WidgetTokenResponseModel] = Field(..., description="List of tokens")
    message: Optional[str] = Field(None, description="Response message")

