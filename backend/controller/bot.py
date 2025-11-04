from fastapi import APIRouter, Request, HTTPException, status
from typing import Dict, Any, Optional
import logging
from models.bot_model import (
    BotCreateModel,
    BotUpdateModel,
    BotResponseModel,
    BotListResponseModel,
    BotResponse
)
from repositories.bot_repo import BotRepository
from services.bot_service import BotService
from middleware.auth_guard import auth_guard
from core.exceptions import BaseAPIException, NotFoundError, ValidationError, AuthorizationError
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize service (repository created per request with access token)
bot_service = BotService()


def get_access_token_from_request(request: Request) -> Optional[str]:
    """Extract access token from request cookies"""
    try:
        import base64
        import json
        
        # Get the Supabase auth token cookie
        supabase_cookie = None
        for cookie_name, cookie_value in request.cookies.items():
            if cookie_name.startswith("sb-") and cookie_name.endswith("-auth-token"):
                supabase_cookie = cookie_value
                break
        
        if not supabase_cookie:
            return None
        
        # Parse the cookie value to extract the access token
        if supabase_cookie.startswith('base64-'):
            encoded_data = supabase_cookie[7:]  # Remove 'base64-' prefix
        else:
            encoded_data = supabase_cookie
        
        # Add padding to the base64 string if needed
        missing_padding = len(encoded_data) % 4
        if missing_padding:
            encoded_data += '=' * (4 - missing_padding)
        
        # Decode the base64-encoded JSON
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


@router.post("/bots", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
@auth_guard
async def create_bot(request: Request, bot: BotCreateModel):
    """
    Create a new bot.
    
    Requires authentication. The bot will be associated with the authenticated user.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )

        # Get access token for RLS
        access_token = get_access_token_from_request(request)
        
        result = await run_in_threadpool(bot_service.create_bot, bot, user_id, access_token)
        
        return {
            "status": "success",
            "data": result,
            "message": "Bot created successfully"
        }
    except ValidationError as e:
        logger.error(f"Create bot validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )
    except BaseAPIException as e:
        raise
    except Exception as e:
        logger.error(f"Create bot error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bot"
        )


@router.get("/bots", response_model=BotListResponseModel)
@auth_guard
async def list_bots(request: Request):
    """
    List all bots created by the authenticated user.
    
    Returns all bots associated with the current user.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )

        # Get access token for RLS
        access_token = get_access_token_from_request(request)
        
        bots = await run_in_threadpool(bot_service.get_user_bots, user_id, access_token)
        
        return {
            "status": "success",
            "data": bots,
            "message": f"Retrieved {len(bots)} bot(s)"
        }
    except Exception as e:
        logger.error(f"List bots error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve bots"
        )


@router.get("/bots/{bot_id}", response_model=BotResponse)
@auth_guard
async def get_bot(request: Request, bot_id: str):
    """
    Get a specific bot by ID.
    
    Only returns the bot if it belongs to the authenticated user.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )

        # Get access token for RLS
        access_token = get_access_token_from_request(request)
        
        bot = await run_in_threadpool(bot_service.get_bot, bot_id, user_id, access_token)
        
        return {
            "status": "success",
            "data": bot,
            "message": "Bot retrieved successfully"
        }
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.detail)
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(f"Get bot error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve bot"
        )


@router.patch("/bots/{bot_id}", response_model=BotResponse)
@auth_guard
async def update_bot(request: Request, bot_id: str, bot: BotUpdateModel):
    """
    Update a bot.
    
    Only allows updating bots that belong to the authenticated user.
    Partial updates are supported - only provided fields will be updated.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )

        # Get access token for RLS
        access_token = get_access_token_from_request(request)
        
        result = await run_in_threadpool(bot_service.update_bot, bot_id, bot, user_id, access_token)
        
        return {
            "status": "success",
            "data": result,
            "message": "Bot updated successfully"
        }
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.detail)
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e.detail)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(f"Update bot error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update bot"
        )


@router.delete("/bots/{bot_id}", status_code=status.HTTP_200_OK)
@auth_guard
async def delete_bot(request: Request, bot_id: str):
    """
    Delete a bot.
    
    Only allows deleting bots that belong to the authenticated user.
    This action cannot be undone.
    """
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )

        # Get access token for RLS
        access_token = get_access_token_from_request(request)
        
        await run_in_threadpool(bot_service.delete_bot, bot_id, user_id, access_token)
        
        return {
            "status": "success",
            "data": {"id": bot_id},
            "message": "Bot deleted successfully"
        }
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.detail)
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(f"Delete bot error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete bot"
        )

