/**
 * Content validation utilities for forum posts
 * Detects prohibited content like external links and promotional material
 */

export interface ContentValidationResult {
  isValid: boolean;
  reason?: string;
  details?: string;
}

/**
 * Detect contact information and external links
 * Enhanced with comprehensive patterns matching server-side validation
 */
const detectContactInfo = (content: string): boolean => {
  const contactPatterns = [
    // Phone numbers (all formats including spelled out)
    /\b\d{4}[-\s]?\d{3}[-\s]?\d{4}\b/,  // 0917-123-4567
    /\b\+63[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/,  // +63-917-123-4567
    /\b(zero|oh)\s*(nine|8|7)\s*(one|two|three|four|five|six|seven|eight|nine)\s*\d+\b/i,  // spelled out numbers
    
    // Email addresses (standard and obfuscated)
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    /\b\w+\s*\(\s*at\s*\)\s*\w+\s*\(\s*dot\s*\)\s*\w+\b/i,  // user (at) example (dot) com
    /\b\w+\s*\[\s*at\s*\]\s*\w+\s*\[\s*dot\s*\]\s*\w+\b/i,  // user [at] example [dot] com
    
    // Social media handles and platform links
    /@\w+/,  // @username
    /\b(instagram\.com|facebook\.com|twitter\.com|tiktok\.com|youtube\.com)\/\w+/i,
    /\b(t\.me|discord\.gg|wa\.me)\/\w+/i,
    /\b(ig|fb|twitter|tiktok|youtube):\s*@?\w+/i,
    
    // Payment identifiers
    /\b(gcash|paypal|paymaya|bpi|bdo|metrobank|unionbank)\b.*\b\d+\b/i,
    /\b(account\s+number|bank\s+account)\b.*\b\d+\b/i,
  ];
  
  return contactPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect external links and URLs
 */
const detectExternalLinks = (content: string): boolean => {
  const urlPatterns = [
    // Standard URLs
    /https?:\/\/[^\s]+/i,
    /www\.[^\s]+/i,
    /ftp:\/\/[^\s]+/i,
    
    // Domain patterns (expanded)
    /\b\w+\.(com|net|org|ph|gov|edu|co|io|app|dev|tech|law|legal|biz|info|online|site|xyz|me|us|uk|ca|au|tv|cc|ly|gl|be|it|de|fr|jp|cn|in|br|mx|es|ru|kr|sg|my|th|vn|id|tw|hk|nz|za|ae|sa|eg|ng|ke|gh|tz|ug|zm|zw|mw|bw|sz|ls|na|ao|mz|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss|ly|tn|dz|ma|eh|mr|ml|bf|ne|td|cf|cm|gq|ga|cg|cd|ao|zm|na|bw|sz|ls|za|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss)\b/i,
    
    // URL shorteners
    /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|buff\.ly|adf\.ly|is\.gd|cli\.gs|short\.link|tiny\.cc|rb\.gy|cutt\.ly|shorturl\.at)\/[^\s]+/i,
    
    // Obfuscated URLs (enhanced)
    /\b\w+\s*[\.\[\(]\s*(dot|\.)\s*[\.\]\)]\s*\w+/i,  // various obfuscation patterns
    /\b\w+\s+dot\s+\w+/i,  // "example dot com"
    /\b\w+\s*\[\s*\.\s*\]\s*\w+/i,  // "example[.]com"
    /\b\w+\s*\(\s*\.\s*\)\s*\w+/i,  // "example(.)com"
  ];
  
  return urlPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect promotional content matching your comprehensive rules
 * Enhanced with specific patterns for selling, donations, and business promotion
 */
const detectPromotionalContent = (content: string): boolean => {
  const promotionalPatterns = [
    // Direct selling/offering keywords
    /\b(buy|order|for\s+sale|discount|promo|checkout|shop\s+now|limited\s+stock)\b/i,
    /\b(selling|offering|available|pre\s*order|preorder)\b/i,
    
    // Contact solicitation
    /\b(dm\s+me|message\s+me|contact\s+for\s+order|link\s+in\s+bio)\b/i,
    /\b(follow\s+my|support\s+my|booking|appointment)\b/i,
    
    // Food/product specific (common in Filipino context)
    /\b(kutsinta|kakanin|food|products|items|goods)\b.*\b(order|buy|available)\b/i,
    
    // Business promotion
    /\b(small\s+business|hobby|event|promotion)\b/i,
    
    // Donation/support requests
    /\b(donation|support|followers|subscribe)\b/i,
    
    // Obfuscation detection - spaced out words
    /\b[a-z]\s+[a-z]\s+[a-z]\s+[a-z]+\b/i,
    
    // Law firm/office references (existing patterns)
    /\b(my|our|the)\s+(law\s+)?(firm|office|practice|company|business|agency)\b/i,
    /\b(attorney|lawyer|legal)\s+(at|from|with)\s+\w+/i,
    
    // Contact solicitation (existing patterns)
    /\b(contact|call|email|text|message|reach|visit|dm|pm)\s+(me|us|our\s+office)\b/i,
    /\b(get\s+in\s+touch|reach\s+out|send\s+me)\b/i,
    /\b(available\s+for|offering|providing)\s+(help|assistance|services|consultation)\b/i,
    
    // Service offerings (existing patterns)
    /\b(free\s+)?(consultation|initial\s+meeting|case\s+evaluation|legal\s+advice)\b/i,
    /\b(hire|retain|engage|book|schedule)\s+(me|us|our\s+services|an?\s+appointment)\b/i,
    /\b(we|i)\s+(can\s+help|offer|provide|specialize)\b/i,
    /\b(accepting|taking)\s+(new\s+)?(clients|cases)\b/i,
    
    // Direct solicitation (existing patterns)
    /\b(dm|message|pm|email|call)\s+me\s+(for|if|to)\b/i,
    /\b(let\s+me\s+help|i\s+can\s+assist|we\s+can\s+handle)\b/i,
    /\b(visit\s+our|check\s+out\s+our|see\s+our)\b/i,
  ];
  
  return promotionalPatterns.some(pattern => pattern.test(content));
};

/**
 * Validate forum post content
 * Returns validation result with reason if content is blocked
 * 
 * NOTE: This is client-side validation for immediate feedback.
 * The server performs additional AI-powered validation that catches more variations.
 */
export const validatePostContent = (content: string): ContentValidationResult => {
  const trimmedContent = content.trim();
  
  // Check for contact information first (includes social media, payment info, etc.)
  if (detectContactInfo(trimmedContent)) {
    return {
      isValid: false,
      reason: 'External Links Detected',
      details: 'Posts containing external links, URLs, email addresses, phone numbers, social media handles, or any contact information are not allowed. Please remove all links and contact details and try again.',
    };
  }
  
  // Check for external links and URLs
  if (detectExternalLinks(trimmedContent)) {
    return {
      isValid: false,
      reason: 'External Links Detected',
      details: 'Posts containing external links, URLs, email addresses, phone numbers, or any contact information are not allowed. Please remove all links and contact details and try again.',
    };
  }
  
  // Check for promotional content (comprehensive patterns)
  if (detectPromotionalContent(trimmedContent)) {
    return {
      isValid: false,
      reason: 'Promotional Content Detected',
      details: 'Posts containing promotional content, selling products/services, asking for donations, or soliciting clients are not allowed. Please remove any promotional content and try again.',
    };
  }
  
  return {
    isValid: true,
  };
};
