from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from controller.user import router as user_router
from controller.bot import router as bot_router
from controller.widget_token import widget_token_router
from controller.source import source_router
from controller.query import query_router
from controller.chunk import chunk_router
from controller.analytics import analytics_router
from controller.prompt_update import prompt_update_router
from controller.plan import plan_router
from config.settings import settings
from core.exceptions import BaseAPIException
from core.logging import setup_logging
from middleware.rate_limit import rate_limit_middleware
from middleware.widget_query_cors import WidgetQueryCORSMiddleware
from services.rate_limit_service import rate_limit_service

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Convot API - Production-ready backend with user authentication check",
    version="1.0.0",
    debug=settings.debug
)

# Add general CORS middleware for other endpoints
logger.info(f"Configuring CORS with allowed origins: {settings.cors_origins}")
# Use regex to allow any origin for now to debug the issue
# This is safer than allow_origins=["*"] with allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add CORS middleware for widget query endpoint (allows all origins)
# This is added AFTER general CORS so it runs first and handles widget query endpoint
app.add_middleware(WidgetQueryCORSMiddleware)

# Add rate limiting middleware
@app.middleware("http")
async def rate_limit(request: Request, call_next):
    """Rate limiting middleware"""
    return await rate_limit_middleware(request, call_next)


# Cleanup old rate limit windows on startup
@app.on_event("startup")
async def startup_event():
    """Cleanup old rate limit windows on startup"""
    try:
        deleted_count = rate_limit_service.cleanup_old_windows(older_than_hours=1)
        logger.info(f"Cleaned up {deleted_count} old rate limit windows on startup")
    except Exception as e:
        logger.warning(f"Failed to cleanup old rate limit windows on startup: {str(e)}")

# Include routers
app.include_router(user_router, prefix="/api/v1", tags=["user"])
app.include_router(bot_router, prefix="/api/v1", tags=["bot"])
app.include_router(widget_token_router, prefix="/api/v1", tags=["widget-token"])
app.include_router(source_router, prefix="/api/v1", tags=["source"])
app.include_router(query_router, prefix="/api/v1", tags=["query"])
app.include_router(chunk_router, prefix="/api/v1", tags=["chunk"])
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(prompt_update_router, prefix="/api/v1", tags=["prompt-update"])
app.include_router(plan_router, prefix="/api/v1", tags=["plan"])


@app.exception_handler(BaseAPIException)
async def api_exception_handler(request: Request, exc: BaseAPIException):
    """Handle custom API exceptions"""
    logger.error(f"API Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "data": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled Exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "data": "Internal server error"}
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "API is running"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"status": "ok", "data": "Convot API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
