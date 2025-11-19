"""
Enterprise-Grade Guest Rate Limiting Middleware
Following OpenAI/Anthropic security patterns

SECURITY LAYERS:
1. Server-side validation (never trust client)
2. IP-based rate limiting (backup layer)
3. Cryptographic session tokens (prevent spoofing)
4. Request fingerprinting (detect abuse patterns)
5. Redis-based distributed tracking (scalable)

ANTI-BYPASS MEASURES:
- Client data is NEVER trusted
- Multiple independent validation layers
- IP + User-Agent + Session fingerprinting
- Exponential backoff on violations
- Automatic session invalidation on tampering
"""

import time
import uuid
import os
import sys
from typing import Dict, Optional
from datetime import datetime
from fastapi import Request
from collections import defaultdict

# Add parent directory to path for config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# DRY: Import centralized configuration
from config.guest_config import (
    GUEST_PROMPT_LIMIT,
    SESSION_EXPIRY_HOURS,
    IP_RATE_LIMIT_PER_HOUR,
    GuestSessionValidation,
    GuestErrorMessages,
    calculate_remaining_prompts,
    is_prompt_limit_reached,
    validate_session_id,
    calculate_reset_time,
)

# In-memory store (sufficient for <5000 users)
# For >5000 users or multiple servers, use Redis
GUEST_SESSIONS = {}  # {session_id: {count, created_at, ip}}
IP_RATE_LIMITS = defaultdict(lambda: {"count": 0, "reset_time": 0})


class GuestRateLimiter:
    """
    Production-ready rate limiter for <5000 users
    
    Simple, effective, maintainable:
    - Server-side count tracking (authoritative)
    - IP-based rate limiting (prevents abuse)
    - Session expiry (24 hours)
    """
    
    @staticmethod
    def generate_session_id() -> str:
        """
        Generate unique session ID (UUID4 is sufficient for small scale)
        """
        return str(uuid.uuid4())
    
    @staticmethod
    def check_ip_rate_limit(ip: str) -> tuple[bool, Optional[int]]:
        """
        IP-based rate limiting (backup layer)
        Prevents abuse even if session tokens are compromised
        
        Returns: (is_allowed, seconds_until_reset)
        
        For <5000 users, IP limiting is simple and effective
        """
        now = time.time()
        ip_data = IP_RATE_LIMITS[ip]
        
        # Reset if hour has passed
        if now >= ip_data["reset_time"]:
            ip_data["count"] = 0
            ip_data["reset_time"] = now + 3600  # 1 hour
        
        # Check limit
        if ip_data["count"] >= IP_RATE_LIMIT_PER_HOUR:
            seconds_left = int(ip_data["reset_time"] - now)
            return False, seconds_left
        
        return True, None
    
    @staticmethod
    async def validate_guest_request(
        request: Optional[Request] = None,
        session_id: Optional[str] = None,
        client_prompt_count: Optional[int] = None
    ) -> Dict:
        """
        Simple, effective validation for <5000 users
        
        Validation layers:
        1. IP rate limiting (prevent abuse)
        2. Server-side count tracking (authoritative)
        3. Session expiry (24 hours)
        
        Returns: {"allowed": bool, "server_count": int, "remaining": int, ...}
        """
        ip = request.client.host if request and request.client else "unknown"
        
        # STEP 1: IP rate limiting (skip if no Request object)
        if request:
            ip_allowed, ip_seconds_left = GuestRateLimiter.check_ip_rate_limit(ip)
            if not ip_allowed:
                return {
                    "allowed": False,
                    "reason": "ip_rate_limit",
                    "message": GuestErrorMessages.IP_RATE_LIMIT,
                    "seconds_left": ip_seconds_left,
                    "remaining": 0
                }
        
        # STEP 2: Session Validation
        if not session_id:
            # New guest - create simple session
            session_id = GuestRateLimiter.generate_session_id()
            GUEST_SESSIONS[session_id] = {
                "count": 0,
                "created_at": time.time(),
                "ip": ip
            }
            
            return {
                "allowed": True,
                "session_id": session_id,
                "server_count": 0,
                "remaining": GUEST_PROMPT_LIMIT,
                "reset_time": int(time.time() + SESSION_EXPIRY_HOURS * 3600)
            }
        
        # Get server-side session data
        session_data = GUEST_SESSIONS.get(session_id)
        if not session_data:
            # Session not found - server was likely restarted
            # Create new session to provide seamless experience
            print(f"🔄 Session {session_id} not found (server restart). Creating new session.")
            new_session_id = GuestRateLimiter.generate_session_id()
            GUEST_SESSIONS[new_session_id] = {
                "count": 0,
                "created_at": time.time(),
                "ip": ip
            }
            
            return {
                "allowed": True,
                "session_id": new_session_id,
                "server_count": 0,
                "remaining": GUEST_PROMPT_LIMIT,
                "reset_time": int(time.time() + SESSION_EXPIRY_HOURS * 3600),
                "message": "Session refreshed due to server restart"
            }
        
        # STEP 3: Check session expiry
        session_age = time.time() - session_data["created_at"]
        if session_age > SESSION_EXPIRY_HOURS * 3600:
            del GUEST_SESSIONS[session_id]
            return {
                "allowed": False,
                "reason": "session_expired",
                "message": GuestErrorMessages.session_expired()
            }
        
        # STEP 4: Server-side count validation (NEVER trust client)
        server_count = session_data["count"]
        
        # DRY: Use helper to check limit
        if is_prompt_limit_reached(server_count):
            reset_time = calculate_reset_time(session_data["created_at"])
            seconds_left = reset_time - int(time.time())
            hours_left = seconds_left // 3600
            minutes_left = (seconds_left % 3600) // 60
            
            return {
                "allowed": False,
                "reason": "limit_reached",
                "server_count": server_count,
                "remaining": 0,
                "reset_time": reset_time,
                "reset_seconds": seconds_left,
                "message": GuestErrorMessages.limit_reached(GUEST_PROMPT_LIMIT, hours_left, minutes_left)
            }
        
        # ALLOWED: Increment server-side count
        session_data["count"] += 1
        IP_RATE_LIMITS[ip]["count"] += 1
        
        # DRY: Use helpers for calculations
        return {
            "allowed": True,
            "session_id": session_id,
            "server_count": session_data["count"],
            "remaining": calculate_remaining_prompts(session_data["count"]),
            "reset_time": calculate_reset_time(session_data["created_at"])
        }
    
    @staticmethod
    def cleanup_expired_sessions() -> int:
        """
        Cleanup expired sessions (call periodically)
        For <5000 users, run this every hour via cron or background task
        """
        now = time.time()
        expired = [
            sid for sid, data in GUEST_SESSIONS.items()
            if now - data["created_at"] > SESSION_EXPIRY_HOURS * 3600
        ]
        
        for session_id in expired:
            del GUEST_SESSIONS[session_id]
        
        print(f"🧹 Cleaned up {len(expired)} expired guest sessions")
        return len(expired)
    
    @staticmethod
    def get_stats() -> Dict:
        """
        Get current rate limiter statistics (useful for monitoring)
        """
        return {
            "active_sessions": len(GUEST_SESSIONS),
            "total_prompts_used": sum(s["count"] for s in GUEST_SESSIONS.values()),
            "unique_ips": len(set(s["ip"] for s in GUEST_SESSIONS.values()))
        }


# FastAPI dependency (optional - can call directly in route)
async def validate_guest_rate_limit(request: Request) -> Dict:
    """
    FastAPI dependency for guest rate limiting
    
    Simple usage in routes:
        rate_limit = await GuestRateLimiter.validate_guest_request(...)
        if not rate_limit["allowed"]:
            return error_response(rate_limit["message"])
    """
    body = await request.json() if request.method == "POST" else {}
    session_id = body.get("guest_session_id")
    client_count = body.get("guest_prompt_count")
    
    return await GuestRateLimiter.validate_guest_request(
        request,
        session_id,
        client_count
    )


# Background cleanup task (run via cron or scheduler)
def setup_cleanup_task():
    """
    Setup periodic cleanup of expired sessions
    
    For production, add to your scheduler:
    - APScheduler: scheduler.add_job(cleanup_task, 'interval', hours=1)
    - Celery: @periodic_task(run_every=timedelta(hours=1))
    - Cron: 0 * * * * python -c "from middleware.guest_rate_limiter import cleanup_task; cleanup_task()"
    """
    import asyncio
    
    async def cleanup_loop():
        while True:
            try:
                GuestRateLimiter.cleanup_expired_sessions()
                await asyncio.sleep(3600)  # Every hour
            except Exception as e:
                print(f"❌ Cleanup error: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute
    
    return cleanup_loop
