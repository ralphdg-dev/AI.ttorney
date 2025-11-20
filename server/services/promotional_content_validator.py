from openai import AsyncOpenAI
import os
import re
from typing import Dict, Any, List, Optional
import logging
from dotenv import load_dotenv

                            
load_dotenv()

                   
logger = logging.getLogger(__name__)


class PromotionalContentValidator:
    """
    AI-powered validator for detecting promotional content and external links.
    
    Uses GPT-4 to analyze content with high accuracy, catching variations that
    simple regex patterns would miss.
    """
    
    def __init__(self):
        """Initialize the validator with OpenAI client."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not found in environment variables")
            raise ValueError("OPENAI_API_KEY must be set for promotional content validation")
        
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"                                          
        
                                                                  
        self.promotional_patterns = [
                                              
            r'\b(buy|order|for\s+sale|discount|promo|checkout|shop\s+now|limited\s+stock)\b',
            r'\b(selling|offering|available|pre\s*order|preorder)\b',
            
                                  
            r'\b(dm\s+me|message\s+me|contact\s+for\s+order|link\s+in\s+bio)\b',
            r'\b(follow\s+my|support\s+my|booking|appointment)\b',
            
                                                                
            r'\b(kutsinta|kakanin|food|products|items|goods)\b.*\b(order|buy|available)\b',
            
                                
            r'\b(small\s+business|hobby|event|promotion)\b',
            
                                       
            r'\b(donation|support|followers|subscribe)\b',
        ]
        
                                      
        self.contact_patterns = [
                                                               
            r'\b\d{4}[-\s]?\d{3}[-\s]?\d{4}\b',                 
            r'\b\+63[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{4}\b',                    
            r'\b(zero|oh)\s*(nine|8|7)\s*(one|two|three|four|five|six|seven|eight|nine)\s*\d+\b',                       
            
                                                       
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            r'\b\w+\s*\(\s*at\s*\)\s*\w+\s*\(\s*dot\s*\)\s*\w+\b',                               
            r'\b\w+\s*\[\s*at\s*\]\s*\w+\s*\[\s*dot\s*\]\s*\w+\b',                               
            
                                                     
            r'@\w+',             
            r'\b(instagram\.com|facebook\.com|twitter\.com|tiktok\.com|youtube\.com)/\w+',
            r'\b(t\.me|discord\.gg|wa\.me)/\w+',
            r'\b(ig|fb|twitter|tiktok|youtube):\s*@?\w+',
            
                                 
            r'\b(gcash|paypal|paymaya|bpi|bdo|metrobank|unionbank)\b.*\b\d+\b',
            r'\b(account\s+number|bank\s+account)\b.*\b\d+\b',
        ]
        
                                         
        self.url_patterns = [
                           
            r'https?://[^\s]+',
            r'www\.[^\s]+',
            r'ftp://[^\s]+',
            
                                        
            r'\b\w+\.(com|net|org|ph|gov|edu|co|io|app|dev|tech|law|legal|biz|info|online|site|xyz|me|us|uk|ca|au|tv|cc|ly|gl|be|it|de|fr|jp|cn|in|br|mx|es|ru|kr|sg|my|th|vn|id|tw|hk|nz|za|ae|sa|eg|ng|ke|gh|tz|ug|zm|zw|mw|bw|sz|ls|na|ao|mz|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss|ly|tn|dz|ma|eh|mr|ml|bf|ne|td|cf|cm|gq|ga|cg|cd|ao|zm|na|bw|sz|ls|za|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss)\b',
            
                            
            r'\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|buff\.ly|adf\.ly|is\.gd|cli\.gs|short\.link|tiny\.cc|rb\.gy|cutt\.ly|shorturl\.at)/[^\s]+',
            
                                        
            r'\b\w+\s*[\.\[\(]\s*(dot|\.)\s*[\.\]\)]\s*\w+',                                
            r'\b\w+\s+dot\s+\w+',                     
            r'\b\w+\s*\[\s*\.\s*\]\s*\w+',                   
            r'\b\w+\s*\(\s*\.\s*\)\s*\w+',                   
        ]
        
                                        
        self.obfuscation_patterns = [
                                                
            r'\b[a-z]\s+[a-z]\s+[a-z]\s+[a-z]+\b',
            
                                                                            
            r'[\u200b-\u200d\u2060\ufeff]',                         
            
                                              
            r'\b[A-Za-z0-9+/]{20,}={0,2}\b',
        ]
        
        logger.info(" Promotional content validator initialized with AI-powered detection")
    
    async def validate_content(self, content: str) -> Dict[str, Any]:
        """
        Validate content for promotional material and external links using AI.
        
        Args:
            content: The text content to validate
        
        Returns:
            Dict containing:
                - is_valid (bool): Whether content is allowed
                - reason (str): Reason for blocking (if blocked)
                - details (str): Detailed explanation
                - violation_type (str): Type of violation ("external_link", "promotional", or None)
                - detected_items (list): List of detected problematic items
        """
        try:
                                                         
            regex_result = self._quick_regex_check(content)
            if not regex_result["is_valid"]:
                logger.warning(f"🚫 Content blocked by regex: {regex_result['reason']}")
                return regex_result
            
                                              
            ai_result = await self._ai_deep_analysis(content)
            
            if not ai_result["is_valid"]:
                logger.warning(f"🚫 Content blocked by AI: {ai_result['reason']}")
            else:
                logger.info(" Content passed promotional validation")
            
            return ai_result
            
        except Exception as e:
            logger.error(f" Promotional validation failed: {str(e)}")
                                                                                              
            logger.warning("  Allowing content due to validation error (fail-open)")
            return {
                "is_valid": True,
                "reason": None,
                "details": None,
                "violation_type": None,
                "detected_items": []
            }
    
    def _quick_regex_check(self, content: str) -> Dict[str, Any]:
        """
        Quick regex-based check for promotional content, external links, and contact info.
        
        This catches most common cases before using AI.
        """
        detected_items = []
        violation_type = None
        
                                        
        for pattern in self.promotional_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                detected_items.append(match.group(0))
                violation_type = "promotional"
        
                                       
        for pattern in self.contact_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                detected_items.append(match.group(0))
                if violation_type == "promotional":
                    violation_type = "both"
                else:
                    violation_type = "external_link"
        
                                           
        for pattern in self.url_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                detected_items.append(match.group(0))
                if violation_type == "promotional":
                    violation_type = "both"
                else:
                    violation_type = "external_link"
        
                                        
        for pattern in self.obfuscation_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                detected_items.append(match.group(0))
                if not violation_type:
                    violation_type = "external_link"
        
        if detected_items:
            if violation_type == "promotional" or violation_type == "both":
                reason = "Promotional Content Detected"
                details = "Posts containing promotional content, selling products/services, asking for donations, or soliciting clients are not allowed. Please remove any promotional content and try again."
            else:
                reason = "External Links Detected" 
                details = "Posts containing external links, URLs, email addresses, phone numbers, social media handles, or any contact information are not allowed. Please remove all links and contact details and try again."
            
            return {
                "is_valid": False,
                "reason": reason,
                "details": details,
                "violation_type": violation_type,
                "detected_items": list(set(detected_items))[:5]                       
            }
        
        return {
            "is_valid": True,
            "reason": None,
            "details": None,
            "violation_type": None,
            "detected_items": []
        }
    
    async def _ai_deep_analysis(self, content: str) -> Dict[str, Any]:
        """
        Use AI to deeply analyze content for promotional material and hidden links.
        
        This catches creative attempts to bypass filters.
        """
        
        system_prompt = """You are an automated content validator. Your task is to determine whether a user's post or reply contains any kind of promotional content or solicitation, or any contact information, and block it if so. Do not store logs or return JSON; just indicate "block" or "allow" internally in the frontend.

Rules to follow:

PROMOTIONAL CONTENT includes, but is not limited to:
- Selling or offering products, services, food, items, or digital goods
- Asking for donations, support, or followers
- Promotions for hobbies, small businesses, or events
- Phrases like: buy, order, for sale, discount, promo, checkout, shop now, limited stock, DM me, message me, contact for order, link in bio, follow my, support my, booking, appointment, preorder

CONTACT INFORMATION includes:
- Phone numbers (all formats, spelled-out numbers, or obfuscated)
- Emails (standard and obfuscated: user@example.com, user (at) example (dot) com)
- Social media handles and platform links (@username, instagram.com/..., t.me/..., discord.gg/..., wa.me/...)
- Payment identifiers or bank numbers (GCash, PayPal, PayMaya, bank accounts)

OBFUSCATION DETECTION:
- Words or letters separated by spaces or punctuation (k u t s i n t a, example (dot) com, john [at] example [dot] com)
- Unicode look-alikes and invisible characters
- Base64 or encoded text that decodes to promotional content

LANGUAGES:
- Detect promotional intent in English, Filipino, Taglish, or slang

INTENT:
- If the content encourages users to contact, buy, order, follow, support, or book, it should be blocked
- Neutral advice, experience sharing, questions, or informational posts are allowed

CONSERVATIVE APPROACH:
- When in doubt, block. It's better to prevent potential promotion than allow it
- Be EXTREMELY strict and catch ALL variations and creative attempts to bypass filters
- Flag ANY mention that could be construed as promotional or contact solicitation

Examples:
 "Buy my kutsinta! DM me for orders" → block
 "Check out my baking page @lyannas_bakes" → block  
 "I went through this legal process last year" → allow
 "Have you tried filing a complaint with the barangay?" → allow

Respond in JSON format:
{
  "is_promotional": true/false,
  "has_external_links": true/false,
  "violation_type": "promotional" or "external_link" or "both" or null,
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation of what was detected",
  "detected_items": ["list", "of", "specific", "violations"]
}"""

        user_prompt = f"""Analyze this forum post content for promotional material and external links:

Content: "{content}"

Is this content promoting legal services, law firms, businesses, or containing external links/contact info?"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,                                          
                response_format={"type": "json_object"}
            )
            
                               
            import json
            ai_analysis = json.loads(response.choices[0].message.content)
            
            logger.info(f"🤖 AI Analysis: {ai_analysis}")
            
                                                    
            is_promotional = ai_analysis.get("is_promotional", False)
            has_external_links = ai_analysis.get("has_external_links", False)
            confidence = ai_analysis.get("confidence", 0.0)
            
                                                                                         
            should_block = (is_promotional or has_external_links) and confidence >= 0.5
            
            if should_block:
                violation_type = ai_analysis.get("violation_type", "promotional")
                
                if violation_type == "external_link" or violation_type == "both":
                    reason = "External Links Detected"
                    details = "Posts containing external links, URLs, email addresses, phone numbers, or any contact information are not allowed. Please remove all links and contact details and try again."
                else:
                    reason = "Promotional Content Detected"
                    details = "Posts promoting law firms, legal services, businesses, or soliciting clients are not allowed. This is a community forum for sharing general legal information and experiences only. Please remove any promotional content and try again."
                
                return {
                    "is_valid": False,
                    "reason": reason,
                    "details": details,
                    "violation_type": violation_type,
                    "detected_items": ai_analysis.get("detected_items", []),
                    "ai_explanation": ai_analysis.get("explanation", ""),
                    "confidence": confidence
                }
            
            return {
                "is_valid": True,
                "reason": None,
                "details": None,
                "violation_type": None,
                "detected_items": [],
                "confidence": confidence
            }
            
        except Exception as e:
            logger.error(f" AI analysis failed: {str(e)}")
                                    
            return {
                "is_valid": True,
                "reason": None,
                "details": None,
                "violation_type": None,
                "detected_items": []
            }


                                                     
_promotional_validator_instance: Optional[PromotionalContentValidator] = None

def get_promotional_validator() -> PromotionalContentValidator:
    """
    Get or create the singleton promotional validator instance.
    
    Returns:
        PromotionalContentValidator instance
    """
    global _promotional_validator_instance
    
    if _promotional_validator_instance is None:
        _promotional_validator_instance = PromotionalContentValidator()
    
    return _promotional_validator_instance
