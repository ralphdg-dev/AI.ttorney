"""
Industry-Standard Streaming Response Accumulator
Following OpenAI/Anthemic patterns for robust response handling
"""

import json
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

class ResponseType(Enum):
    """Standard response types for consistency"""
    METADATA = "metadata"
    CONTENT = "content"
    SOURCES = "sources"
    ERROR = "error"
    DONE = "done"

@dataclass
class AccumulatedResponse:
    """Thread-safe response accumulator with type safety"""
    type: Optional[str] = None
    language: Optional[str] = None
    content: str = ""
    sources: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    disclaimer: Optional[str] = None
    session_id: Optional[str] = None
    new_session_id: Optional[str] = None
    guest_session_token: Optional[str] = None
    done: bool = False
    
    def update_from_chunk(self, chunk_data: Dict[str, Any]) -> None:
        """
        Safely update response from streaming chunk
        Following OpenAI's chunk accumulation pattern
        """
        try:
            # Handle content accumulation (most critical)
            if chunk_data.get("content"):
                if self.content:
                    self.content += chunk_data["content"]
                else:
                    self.content = chunk_data["content"]
            
            # Handle metadata preservation
            for key, value in chunk_data.items():
                if key == "content":
                    continue  # Already handled above
                elif key == "sources" and isinstance(value, list):
                    # Append sources instead of overwriting
                    self.sources.extend(value)
                elif hasattr(self, key):
                    setattr(self, key, value)
            
            # Mark completion
            if chunk_data.get("done"):
                self.done = True
                
        except Exception as e:
            logger.error(f"Error accumulating response chunk: {e}")
            # Don't fail the entire response for chunk errors
            
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with proper field filtering"""
        result = {}
        for key, value in self.__dict__.items():
            if value is not None and value != "" and value != []:
                if key == "sources" and not value:
                    continue  # Skip empty sources
                result[key] = value
        return result

class StreamingResponseAccumulator:
    """
    Production-ready streaming response accumulator
    Handles SSE chunk parsing and response building
    """
    
    def __init__(self):
        self.response = AccumulatedResponse()
        self.chunk_count = 0
        self.error_count = 0
        
    def process_sse_chunk(self, chunk: str) -> bool:
        """
        Process a single SSE chunk
        Returns True if processing should continue, False if done
        """
        try:
            self.chunk_count += 1
            
            # Parse SSE format
            if not chunk.startswith("data: "):
                return True
                
            # Extract and parse JSON
            json_data = chunk[6:].strip()
            if not json_data:
                return True
                
            data = json.loads(json_data)
            self.response.update_from_chunk(data)
            
            # Check for completion
            if data.get("done"):
                logger.info(f"Response accumulation complete: {self.chunk_count} chunks processed")
                return False
                
            return True
            
        except json.JSONDecodeError as e:
            self.error_count += 1
            logger.warning(f"JSON decode error in chunk {self.chunk_count}: {e}")
            return True  # Continue processing despite errors
        except Exception as e:
            self.error_count += 1
            logger.error(f"Unexpected error processing chunk {self.chunk_count}: {e}")
            return True
    
    def get_final_response(self) -> Dict[str, Any]:
        """
        Get the final accumulated response with validation
        """
        result = self.response.to_dict()
        
        # Add debugging metadata
        result["_debug"] = {
            "chunks_processed": self.chunk_count,
            "errors_encountered": self.error_count
        }
        
        # Validate critical fields
        if not result.get("content") or result["content"].strip() == ".":
            logger.warning("Response content is minimal or missing")
            result["content"] = "I apologize, but I encountered an issue generating a complete response. Please try asking your question again."
        
        return result

def accumulate_streaming_response(chunks: List[str]) -> Dict[str, Any]:
    """
    Factory function to accumulate streaming response from chunks
    Following industry-standard factory pattern
    """
    accumulator = StreamingResponseAccumulator()
    
    for chunk in chunks:
        should_continue = accumulator.process_sse_chunk(chunk)
        if not should_continue:
            break
    
    return accumulator.get_final_response()
