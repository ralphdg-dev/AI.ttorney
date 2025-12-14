"""
IBP Card OCR Service using OpenAI Vision API
Extracts lawyer information (name, roll number) from IBP ID card images
"""

import logging
import base64
import asyncio
from typing import Optional, Dict, Any
from dataclasses import dataclass
from services.client_cache import get_openai_client

logger = logging.getLogger(__name__)


@dataclass
class IbpOcrResult:
    """Result of OCR extraction from IBP card"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    roll_number: Optional[str] = None
    confidence: str = "low"  # low, medium, high
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "extracted_first_name": self.first_name,
            "extracted_last_name": self.last_name,
            "extracted_roll_number": self.roll_number,
            "extraction_confidence": self.confidence,
        }


async def extract_ibp_fields_from_bytes(content: bytes) -> IbpOcrResult:
    """
    Run OCR over IBP card image bytes using OpenAI Vision API.
    
    Extracts:
    - First name
    - Last name  
    - Roll number
    
    Returns IbpOcrResult with extracted fields. If parsing fails,
    returns empty fields so the client can fall back to manual input.
    """
    try:
        # Encode image to base64
        base64_image = base64.b64encode(content).decode('utf-8')
        
        # Get OpenAI client
        client = get_openai_client()
        
        # Use GPT-4 Vision to extract structured data (run sync call in executor)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an OCR assistant specialized in reading Philippine IBP (Integrated Bar of the Philippines) ID cards.

Extract the following information from the IBP card image:
1. First Name (given name) - the lawyer's first/given name
2. Last Name (surname/family name) - the lawyer's surname
3. Roll Number - the lawyer's roll number (usually a 5-6 digit number)

IMPORTANT RULES:
- Names on IBP cards are often in "SURNAME, GIVEN NAME" format or "ATTY. GIVEN NAME SURNAME" format
- The roll number is typically labeled as "Roll No." or just appears as a prominent number
- If you see "ATTY." or "ATTORNEY" prefix, ignore it - just extract the name
- Return ONLY the extracted values, nothing else
- If you cannot clearly read a field, return null for that field
- Be conservative - only extract what you can clearly see

Respond in this exact JSON format:
{
  "first_name": "string or null",
  "last_name": "string or null", 
  "roll_number": "string or null",
  "confidence": "low|medium|high"
}"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Please extract the lawyer's first name, last name, and roll number from this IBP ID card image."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=200,
                temperature=0.1
            )
        )
        
        # Parse the response
        response_text = response.choices[0].message.content.strip()
        logger.info(f"IBP OCR raw response: {response_text}")
        
        # Try to parse JSON from response
        import json
        
        # Handle markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```") and not in_json:
                    in_json = True
                    continue
                elif line.startswith("```") and in_json:
                    break
                elif in_json:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)
        
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            logger.warning(f"IBP OCR: Failed to parse JSON response: {response_text}")
            return IbpOcrResult()
        
        # Extract and clean values
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        roll_number = data.get("roll_number")
        confidence = data.get("confidence", "low")
        
        # Clean up values
        if first_name:
            first_name = first_name.strip().title()
        if last_name:
            last_name = last_name.strip().title()
        if roll_number:
            # Keep only digits
            roll_number = ''.join(c for c in str(roll_number) if c.isdigit())
            if not roll_number:
                roll_number = None
        
        logger.info(f"IBP OCR extracted: first_name={first_name}, last_name={last_name}, roll_number={roll_number}, confidence={confidence}")
        
        return IbpOcrResult(
            first_name=first_name,
            last_name=last_name,
            roll_number=roll_number,
            confidence=confidence
        )
        
    except Exception as e:
        logger.error(f"IBP OCR extraction failed: {e}")
        return IbpOcrResult()
