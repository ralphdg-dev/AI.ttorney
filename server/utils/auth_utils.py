from fastapi import Request
from typing import Optional


def extract_bearer_token(request: Request) -> str:
    """Extract Bearer token from Authorization header"""
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1)
    
    return ""


def get_auth_header_value(request: Request) -> Optional[str]:
    """Get the raw Authorization header value"""
    return request.headers.get("Authorization")


def is_bearer_token(auth_header: str) -> bool:
    """Check if authorization header contains a Bearer token"""
    return auth_header.startswith("Bearer ") if auth_header else False
