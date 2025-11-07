"""
Widget Query CORS Middleware

Handles CORS for widget query endpoint to allow all origins.
This middleware only applies to /api/v1/widget/query endpoint.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

logger = logging.getLogger(__name__)


class WidgetQueryCORSMiddleware(BaseHTTPMiddleware):
    """
    Middleware that handles CORS for widget query endpoint.
    Allows all origins for the widget query endpoint.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Only handle widget query endpoint
        if request.url.path != "/api/v1/widget/query":
            return await call_next(request)
        
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            origin = request.headers.get("Origin")
            response = Response(status_code=204)  # No Content status for OPTIONS
            
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
            
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Max-Age"] = "3600"
            
            return response
        
        # For POST requests, process and add CORS headers
        response = await call_next(request)
        
        # Add CORS headers to response
        origin = request.headers.get("Origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response

