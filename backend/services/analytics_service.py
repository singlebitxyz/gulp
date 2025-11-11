"""
Analytics Service

Provides analytics and insights from query data.
Aggregates query statistics, usage patterns, and performance metrics.
"""

from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta
import logging

from core.exceptions import DatabaseError, AuthorizationError
from config.supabasedb import get_supabase_client
from services.bot_service import BotService

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics operations"""

    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the analytics service.

        Args:
            access_token: User's JWT token for RLS-enabled operations
        """
        self.access_token = access_token
        # Use service role for analytics queries (admin-level access needed)
        self.client = get_supabase_client(use_service_role=True)
        self.bot_service = BotService()

    def get_summary_stats(self, bot_id: UUID, user_id: str, access_token: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """
        Get summary statistics for a bot.

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)
            days: Number of days to look back (default: 30)

        Returns:
            Dictionary with summary statistics
        """
        # Verify user owns the bot
        try:
            self.bot_service.get_bot(str(bot_id), user_id, access_token=access_token)
        except Exception:
            raise AuthorizationError("You do not have access to this bot's analytics")

        start_date = datetime.now() - timedelta(days=days)

        try:
            # Get total queries
            total_queries_resp = self.client.table("queries")\
                .select("*", count="exact")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()

            total_queries = total_queries_resp.count or 0

            # Get unique sessions
            unique_sessions_resp = self.client.table("queries")\
                .select("session_id")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()

            unique_sessions = len(set(row["session_id"] for row in unique_sessions_resp.data or []))

            # Get token usage stats
            token_stats_resp = self.client.table("queries")\
                .select("tokens_used, prompt_tokens, completion_tokens")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()

            token_data = token_stats_resp.data or []
            total_tokens = sum(row.get("tokens_used", 0) for row in token_data)
            prompt_tokens = sum(row.get("prompt_tokens", 0) for row in token_data if row.get("prompt_tokens"))
            completion_tokens = sum(row.get("completion_tokens", 0) for row in token_data if row.get("completion_tokens"))

            # Get average confidence
            confidence_resp = self.client.table("queries")\
                .select("confidence")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()

            confidence_scores = [row["confidence"] for row in confidence_resp.data or [] if row["confidence"] is not None]
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else None

            # Get average latency
            latency_resp = self.client.table("queries")\
                .select("latency_ms")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()

            latency_scores = [row["latency_ms"] for row in latency_resp.data or [] if row["latency_ms"] is not None]
            avg_latency = sum(latency_scores) / len(latency_scores) if latency_scores else None

            return {
                "total_queries": total_queries,
                "unique_sessions": unique_sessions,
                "total_tokens": total_tokens,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "avg_confidence": avg_confidence,
                "avg_latency_ms": avg_latency,
                "period_days": days,
            }

        except Exception as e:
            logger.error(f"Error getting summary stats for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to get summary statistics: {str(e)}")

    def get_top_queries(self, bot_id: UUID, user_id: str, access_token: Optional[str] = None, limit: int = 10, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get top queries by frequency.

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)
            access_token: User's access token for authorization
            limit: Number of top queries to return
            days: Number of days to look back

        Returns:
            List of top queries with frequency and stats
        """
        # Verify user owns the bot
        try:
            self.bot_service.get_bot(str(bot_id), user_id, access_token=access_token)
        except Exception:
            raise AuthorizationError("You do not have access to this bot's analytics")

        start_date = datetime.now() - timedelta(days=days)

        try:
            # Use RPC to aggregate queries by text
            # This would need a custom RPC function in Supabase, but for now we'll fetch and aggregate in Python
            queries_resp = self.client.table("queries")\
                .select("query_text, confidence, tokens_used, created_at")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .order("created_at", desc=True)\
                .execute()

            query_data = queries_resp.data or []

            # Aggregate by query text
            query_stats = {}
            for row in query_data:
                query_text = row["query_text"].strip().lower()[:100]  # Normalize and truncate
                if query_text not in query_stats:
                    query_stats[query_text] = {
                        "query_text": row["query_text"],
                        "count": 0,
                        "total_confidence": 0,
                        "total_tokens": 0,
                        "confidence_count": 0,
                        "first_seen": row["created_at"],
                        "last_seen": row["created_at"],
                    }

                stats = query_stats[query_text]
                stats["count"] += 1
                stats["total_tokens"] += row.get("tokens_used", 0)

                if row.get("confidence") is not None:
                    stats["total_confidence"] += row["confidence"]
                    stats["confidence_count"] += 1

                # Update date range
                if row["created_at"] < stats["first_seen"]:
                    stats["first_seen"] = row["created_at"]
                if row["created_at"] > stats["last_seen"]:
                    stats["last_seen"] = row["created_at"]

            # Calculate averages and sort by frequency
            top_queries = []
            for query_text, stats in query_stats.items():
                if stats["count"] >= 2:  # Only include queries that appear multiple times
                    avg_confidence = stats["total_confidence"] / stats["confidence_count"] if stats["confidence_count"] > 0 else None
                    top_queries.append({
                        "query_text": stats["query_text"],
                        "frequency": stats["count"],
                        "avg_confidence": avg_confidence,
                        "total_tokens": stats["total_tokens"],
                        "first_seen": stats["first_seen"],
                        "last_seen": stats["last_seen"],
                    })

            # Sort by frequency (descending) and return top N
            top_queries.sort(key=lambda x: x["frequency"], reverse=True)
            return top_queries[:limit]

        except Exception as e:
            logger.error(f"Error getting top queries for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to get top queries: {str(e)}")

    def get_unanswered_queries(self, bot_id: UUID, user_id: str, access_token: Optional[str] = None, limit: int = 20, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get queries that may not have been answered well (low confidence or no sources).

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)
            access_token: User's access token for authorization
            limit: Number of queries to return
            days: Number of days to look back

        Returns:
            List of unanswered queries
        """
        # Verify user owns the bot
        try:
            self.bot_service.get_bot(str(bot_id), user_id, access_token=access_token)
        except Exception:
            raise AuthorizationError("You do not have access to this bot's analytics")

        start_date = datetime.now() - timedelta(days=days)

        try:
            # Get queries with low confidence (filter in Python)
            low_confidence_resp = self.client.table("queries")\
                .select("query_text, confidence, returned_sources, response_summary, created_at")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .order("created_at", desc=True)\
                .execute()

            # Get queries with empty sources (check array length in Python)
            empty_sources_resp = self.client.table("queries")\
                .select("query_text, confidence, returned_sources, response_summary, created_at")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .order("created_at", desc=True)\
                .execute()

            # Combine and deduplicate results
            all_unanswered = []
            seen_queries = set()

            # Process low confidence queries
            for row in low_confidence_resp.data or []:
                confidence = row.get("confidence")
                if confidence is not None and confidence < 0.3:
                    query_key = (row["query_text"], row["created_at"])
                    if query_key not in seen_queries:
                        seen_queries.add(query_key)
                        all_unanswered.append(row)

            # Process queries with empty sources
            for row in empty_sources_resp.data or []:
                sources = row.get("returned_sources", [])
                if len(sources) == 0:  # Check for empty sources
                    query_key = (row["query_text"], row["created_at"])
                    if query_key not in seen_queries:
                        seen_queries.add(query_key)
                        all_unanswered.append(row)

            # Sort by created_at desc and limit
            unanswered_resp = sorted(all_unanswered, key=lambda x: x["created_at"], reverse=True)[:limit]

            unanswered_queries = []
            for row in unanswered_resp:
                # Check if sources array is empty or confidence is very low
                sources_count = len(row.get("returned_sources", []))
                confidence = row.get("confidence")

                is_unanswered = (
                    confidence is not None and confidence < 0.3
                ) or (
                    sources_count == 0
                )

                if is_unanswered:
                    unanswered_queries.append({
                        "query_text": row["query_text"],
                        "confidence": confidence,
                        "sources_count": sources_count,
                        "response_summary": row.get("response_summary", "")[:200],
                        "created_at": row["created_at"],
                    })

            return unanswered_queries

        except Exception as e:
            logger.error(f"Error getting unanswered queries for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to get unanswered queries: {str(e)}")

    def get_usage_over_time(self, bot_id: UUID, user_id: str, access_token: Optional[str] = None, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get token usage and query volume over time.

        Args:
            bot_id: ID of the bot
            user_id: ID of the user (for authorization)
            access_token: User's access token for authorization
            days: Number of days to look back

        Returns:
            List of daily usage statistics
        """
        # Verify user owns the bot
        try:
            self.bot_service.get_bot(str(bot_id), user_id, access_token=access_token)
        except Exception:
            raise AuthorizationError("You do not have access to this bot's analytics")

        start_date = datetime.now() - timedelta(days=days)

        try:
            # Get daily aggregates
            usage_resp = self.client.table("queries")\
                .select("created_at, tokens_used, confidence")\
                .eq("bot_id", str(bot_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()

            # Aggregate by date
            daily_stats = {}
            for row in usage_resp.data or []:
                date = row["created_at"][:10]  # Extract YYYY-MM-DD

                if date not in daily_stats:
                    daily_stats[date] = {
                        "date": date,
                        "query_count": 0,
                        "total_tokens": 0,
                        "avg_confidence": 0,
                        "confidence_count": 0,
                    }

                stats = daily_stats[date]
                stats["query_count"] += 1
                stats["total_tokens"] += row.get("tokens_used", 0)

                if row.get("confidence") is not None:
                    stats["avg_confidence"] += row["confidence"]
                    stats["confidence_count"] += 1

            # Calculate averages and return sorted by date
            usage_data = []
            for date, stats in daily_stats.items():
                if stats["confidence_count"] > 0:
                    stats["avg_confidence"] = stats["avg_confidence"] / stats["confidence_count"]
                else:
                    stats["avg_confidence"] = None
                del stats["confidence_count"]
                usage_data.append(stats)

            usage_data.sort(key=lambda x: x["date"])
            return usage_data

        except Exception as e:
            logger.error(f"Error getting usage over time for bot {bot_id}: {str(e)}")
            raise DatabaseError(f"Failed to get usage statistics: {str(e)}")
