import os
from supabase import create_client, Client
import dotenv
from typing import Optional
import logging

dotenv.load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Singleton pattern for database connection management"""
    _instance: Optional['DatabaseManager'] = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    # Right now using ANON key, if client req service key we need to update this with proper env of service key, but this works for user related queries
    def get_client(self) -> Client:
        """Get or create Supabase client with connection pooling"""
        if self._client is None:
            try:
                url: str = os.environ.get("SUPABASE_URL")
                key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
                
                if not url or not key:
                    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
                
                self._client = create_client(url, key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {str(e)}")
                raise
        return self._client
    
    def reset_client(self):
        """Reset client for testing or reconnection"""
        self._client = None
        logger.info("Supabase client reset")


# Global database manager instance
db_manager = DatabaseManager()


def get_supabase_client(access_token: Optional[str] = None, use_service_role: bool = False) -> Client:
    """Get the Supabase client with proper error handling
    
    Args:
        access_token: JWT access token for user-specific operations (RLS enabled).
                     Required if use_service_role is False.
        use_service_role: If True, uses service role key (bypasses RLS).
                         WARNING: Only use for admin operations or auth validation.
    
    Returns:
        Supabase Client instance
        
    Raises:
        ValueError: If access_token is not provided and use_service_role is False
    
    Security Note:
        - Always prefer passing access_token for user operations (RLS enforced)
        - Only use use_service_role=True for legitimate admin/auth operations
        - Default behavior requires access_token (safer by default)
    """
    try:
        url: str = os.environ.get("SUPABASE_URL")
        
        if not url:
            raise ValueError("SUPABASE_URL must be set in environment variables")
        
        if use_service_role:
            # Explicitly request service role (bypasses RLS)
            # Only use for admin operations, auth validation, etc.
            logger.warning("Using service role client (RLS bypassed) - ensure this is intentional")
            return db_manager.get_client()
        
        if not access_token:
            raise ValueError(
                "access_token is required for user operations. "
                "If you need admin access, explicitly set use_service_role=True"
            )
        
        # Use anon key with user token for RLS compliance
        # RLS requires anon key + user's JWT token in Authorization header
        # CRITICAL: We MUST use anon key, NOT service role key, for RLS to work
        anon_key: str = os.environ.get("SUPABASE_ANON_KEY")
        
        if not anon_key:
            raise ValueError(
                "SUPABASE_ANON_KEY must be set for RLS-enabled operations. "
                "Service role key (SUPABASE_SERVICE_KEY) bypasses RLS and should not be used for user operations."
            )
        
        # Create client with anon key
        client = create_client(url, anon_key)
        
        # Log token presence (first 20 chars for debugging, not full token)
        logger.info(f"Setting RLS token for client (token prefix: {access_token[:20] if len(access_token) > 20 else access_token}...)")
        
        # Set the user's access token for RLS
        # The Supabase Python client uses postgrest for database queries
        # We need to set the Authorization header on each request
        # The postgrest client has an 'auth' method or we can monkey-patch the headers
        
        if hasattr(client, 'postgrest'):
            # Try the auth method first (if available in postgrest-py)
            if hasattr(client.postgrest, 'auth'):
                try:
                    client.postgrest.auth(access_token)
                except Exception:
                    # If auth method doesn't work, set headers manually
                    pass
            
            # Always set headers as fallback/primary method
            # The postgrest client typically uses a session with headers
            # We need to intercept requests or set default headers
            
            # Try to access and modify the headers
            if hasattr(client.postgrest, 'session'):
                # httpx or requests session
                if hasattr(client.postgrest.session, 'headers'):
                    client.postgrest.session.headers.update({
                        "Authorization": f"Bearer {access_token}",
                        "apikey": anon_key
                    })
                elif hasattr(client.postgrest.session, '_headers'):
                    if client.postgrest.session._headers is None:
                        client.postgrest.session._headers = {}
                    client.postgrest.session._headers.update({
                        "Authorization": f"Bearer {access_token}",
                        "apikey": anon_key
                    })
            
            # Also try direct headers attribute
            if hasattr(client.postgrest, 'headers'):
                if isinstance(client.postgrest.headers, dict):
                    client.postgrest.headers.update({
                        "Authorization": f"Bearer {access_token}",
                        "apikey": anon_key
                    })
            
            # Fallback to private _headers
            if hasattr(client.postgrest, '_headers'):
                if client.postgrest._headers is None:
                    client.postgrest._headers = {}
                client.postgrest._headers.update({
                    "Authorization": f"Bearer {access_token}",
                    "apikey": anon_key
                })
            
            # Log which method worked
            logger.info(f"Postgrest headers set - session={hasattr(client.postgrest, 'session')}, headers={hasattr(client.postgrest, 'headers')}, _headers={hasattr(client.postgrest, '_headers')}")
        
        return client
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise


# Backward compatibility - DEPRECATED: Use get_supabase_client() with explicit parameters
def supabase_db() -> Client:
    """Legacy function for backward compatibility
    
    DEPRECATED: Use get_supabase_client(use_service_role=True) for admin access
    or get_supabase_client(access_token=token) for user operations.
    """
    logger.warning("supabase_db() is deprecated. Use get_supabase_client() with explicit parameters.")
    return get_supabase_client(use_service_role=True)
