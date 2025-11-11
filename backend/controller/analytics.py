"""
Analytics API Controller

Handles analytics and reporting endpoints.
"""

from fastapi import APIRouter, Request, HTTPException, status, Query
from typing import Optional
from uuid import UUID
import logging

from middleware.auth_guard import auth_guard
from services.analytics_service import AnalyticsService
from core.exceptions import ValidationError, DatabaseError, AuthorizationError

logger = logging.getLogger(__name__)

analytics_router = APIRouter()


@analytics_router.get("/bots/{bot_id}/analytics/summary")
@auth_guard
async def get_analytics_summary(
    request: Request,
    bot_id: UUID,
    days: Optional[int] = Query(30, ge=1, le=365, description="Number of days to look back")
):
    """Get summary analytics for a bot"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        access_token = None
        try:
            from controller.source import get_access_token_from_request
            access_token = get_access_token_from_request(request)
        except Exception:
            pass

        analytics = AnalyticsService(access_token=access_token)
        summary = analytics.get_summary_stats(bot_id, str(user_id), access_token=access_token, days=days or 30)

        return {
            "status": "success",
            "data": summary,
            "message": f"Analytics summary for the last {days} days",
        }

    except AuthorizationError as e:
        logger.error(f"Authorization error in analytics summary: {str(e)}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error in analytics summary: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error in analytics summary: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in analytics summary: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


@analytics_router.get("/bots/{bot_id}/analytics/queries")
@auth_guard
async def get_top_queries(
    request: Request,
    bot_id: UUID,
    limit: Optional[int] = Query(10, ge=1, le=50, description="Number of top queries to return"),
    days: Optional[int] = Query(30, ge=1, le=365, description="Number of days to look back")
):
    """Get top queries by frequency"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        access_token = None
        try:
            from controller.source import get_access_token_from_request
            access_token = get_access_token_from_request(request)
        except Exception:
            pass

        analytics = AnalyticsService(access_token=access_token)
        top_queries = analytics.get_top_queries(bot_id, str(user_id), access_token=access_token, limit=limit or 10, days=days or 30)

        return {
            "status": "success",
            "data": top_queries,
            "message": f"Top {len(top_queries)} queries by frequency for the last {days} days",
        }

    except AuthorizationError as e:
        logger.error(f"Authorization error in top queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error in top queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error in top queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in top queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


@analytics_router.get("/bots/{bot_id}/analytics/unanswered")
@auth_guard
async def get_unanswered_queries(
    request: Request,
    bot_id: UUID,
    limit: Optional[int] = Query(20, ge=1, le=100, description="Number of queries to return"),
    days: Optional[int] = Query(30, ge=1, le=365, description="Number of days to look back")
):
    """Get queries that may not have been answered well"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        access_token = None
        try:
            from controller.source import get_access_token_from_request
            access_token = get_access_token_from_request(request)
        except Exception:
            pass

        analytics = AnalyticsService(access_token=access_token)
        unanswered = analytics.get_unanswered_queries(bot_id, str(user_id), access_token=access_token, limit=limit or 20, days=days or 30)

        return {
            "status": "success",
            "data": unanswered,
            "message": f"Found {len(unanswered)} potentially unanswered queries for the last {days} days",
        }

    except AuthorizationError as e:
        logger.error(f"Authorization error in unanswered queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error in unanswered queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error in unanswered queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in unanswered queries: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


@analytics_router.get("/bots/{bot_id}/analytics/usage")
@auth_guard
async def get_usage_over_time(
    request: Request,
    bot_id: UUID,
    days: Optional[int] = Query(30, ge=1, le=365, description="Number of days to look back")
):
    """Get token usage and query volume over time"""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        access_token = None
        try:
            from controller.source import get_access_token_from_request
            access_token = get_access_token_from_request(request)
        except Exception:
            pass

        analytics = AnalyticsService(access_token=access_token)
        usage_data = analytics.get_usage_over_time(bot_id, str(user_id), access_token=access_token, days=days or 30)

        return {
            "status": "success",
            "data": usage_data,
            "message": f"Daily usage statistics for the last {days} days",
        }

    except AuthorizationError as e:
        logger.error(f"Authorization error in usage over time: {str(e)}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error in usage over time: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error in usage over time: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in usage over time: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


@analytics_router.get("/bots/{bot_id}/analytics/overview")
@auth_guard
async def get_analytics_overview(
    request: Request,
    bot_id: UUID,
    days: Optional[int] = Query(30, ge=1, le=365),
    top_limit: Optional[int] = Query(10, ge=1, le=50),
    unanswered_limit: Optional[int] = Query(20, ge=1, le=100),
):
    """Return all analytics sections in a single response."""
    try:
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        access_token = None
        try:
            from controller.source import get_access_token_from_request
            access_token = get_access_token_from_request(request)
        except Exception:
            pass

        analytics = AnalyticsService(access_token=access_token)
        summary = analytics.get_summary_stats(bot_id, str(user_id), access_token=access_token, days=days or 30)
        top_queries = analytics.get_top_queries(bot_id, str(user_id), access_token=access_token, limit=top_limit or 10, days=days or 30)
        unanswered = analytics.get_unanswered_queries(bot_id, str(user_id), access_token=access_token, limit=unanswered_limit or 20, days=days or 30)
        usage = analytics.get_usage_over_time(bot_id, str(user_id), access_token=access_token, days=days or 30)

        return {
            "status": "success",
            "data": {
                "summary": summary,
                "top_queries": top_queries,
                "unanswered": unanswered,
                "usage": usage,
            },
            "message": f"Analytics overview for the last {days} days",
        }

    except AuthorizationError as e:
        logger.error(f"Authorization error in analytics overview: {str(e)}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error in analytics overview: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in analytics overview: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")
