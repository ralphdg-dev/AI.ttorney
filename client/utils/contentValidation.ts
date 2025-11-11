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
 * Detect external links in content
 */
const detectExternalLinks = (content: string): boolean => {
  // Common URL patterns
  const urlPatterns = [
    /https?:\/\//i,                           // http:// or https://
    /www\./i,                                  // www.
    /\w+\.(com|net|org|ph|gov|edu|co|io|app|dev|tech|law|legal)/i,  // domain extensions
    /bit\.ly|tinyurl|goo\.gl|t\.co/i,         // URL shorteners
  ];
  
  return urlPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect promotional content for law firms or legal services
 */
const detectPromotionalContent = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  
  // Promotional keywords and phrases
  const promotionalPatterns = [
    /\b(my|our)\s+(law\s+)?(firm|office|practice|company)\b/i,
    /\b(contact|call|email|visit)\s+(me|us)\b/i,
    /\b(free\s+)?(consultation|initial\s+meeting)\b/i,
    /\b(hire|retain|engage)\s+(me|us|our\s+services)\b/i,
    /\brates?\s+(starting|from|as\s+low\s+as)\b/i,
    /\b(affordable|competitive|best)\s+(rates|prices|fees)\b/i,
    /\bspeciali(z|s)ing\s+in\b/i,
    /\byears?\s+of\s+experience\b/i,
    /\bserving\s+(clients|the\s+community)\b/i,
    /\b(dm|message|pm)\s+me\s+(for|if)\b/i,
    /\bbook\s+(an?\s+)?appointment\b/i,
    /\bschedule\s+(a|your)\s+consultation\b/i,
    /\bcontact\s+(information|details)\b/i,
    /\bphone\s*:?\s*\d/i,                     // Phone numbers
    /\bemail\s*:?\s*\S+@\S+/i,                // Email addresses
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,      // Phone number patterns
  ];
  
  return promotionalPatterns.some(pattern => pattern.test(lowerContent));
};

/**
 * Validate forum post content
 * Returns validation result with reason if content is blocked
 */
export const validatePostContent = (content: string): ContentValidationResult => {
  const trimmedContent = content.trim();
  
  // Check for external links
  if (detectExternalLinks(trimmedContent)) {
    return {
      isValid: false,
      reason: 'External Links Detected',
      details: 'Posts containing external links or URLs are not allowed. Please remove any links and try again.',
    };
  }
  
  // Check for promotional content
  if (detectPromotionalContent(trimmedContent)) {
    return {
      isValid: false,
      reason: 'Promotional Content Detected',
      details: 'Posts promoting law firms, legal services, or soliciting clients are not allowed. Please share general legal information only.',
    };
  }
  
  return {
    isValid: true,
  };
};
