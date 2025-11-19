"""
Server-Sent Events (SSE) Formatter Utility

Shared utility for formatting SSE messages consistently across all streaming endpoints.
Follows DRY principles to avoid code duplication.
"""

import json
from typing import Dict, Any


def format_sse(data: Dict[str, Any]) -> str:
    """
    Format data as Server-Sent Events (SSE) message.
    
    Args:
        data: Dictionary containing the message data
        
    Returns:
        Formatted SSE string with 'data: ' prefix and double newline
        
    Example:
        >>> format_sse({'content': 'Hello'})
        'data: {"content": "Hello"}\\n\\n'
        
        >>> format_sse({'type': 'metadata', 'language': 'english'})
        'data: {"type": "metadata", "language": "english"}\\n\\n'
    """
    return f"data: {json.dumps(data)}\n\n"
