import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Types for lawyer chatbot
export interface LawyerChatMessage {
  id: string;
  text: string;
  fromUser: boolean;
  timestamp?: Date;
}

export interface LawyerChatRequest {
  question: string;
  conversation_history?: Array<{ role: string; content: string }>;
  max_tokens?: number;
  include_case_law?: boolean;
  include_cross_references?: boolean;
}

export interface SourceCitation {
  source: string;
  law: string;
  article_number: string;
  article_title?: string;
  text_preview: string;
  relevance_score: number;
}

export interface LawyerChatResponse {
  answer: string;
  sources: SourceCitation[];
  confidence: string; // "high", "medium", "low"
  language: string; // "english", "tagalog", "mixed"
  legal_analysis?: string;
  related_provisions?: string[];
  case_law_references?: string[];
}

export class LawyerChatbotService {
  private static async getAuthHeaders(session?: any): Promise<HeadersInit> {
    try {
      // First try to get token from AuthContext session if provided
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      return { 'Content-Type': 'application/json' };
    }
  }

  /**
   * Send a question to the lawyer chatbot API
   */
  static async askQuestion(
    request: LawyerChatRequest,
    session?: any
  ): Promise<{ success: boolean; data?: LawyerChatResponse; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI responses
      
      const response = await fetch(`${API_BASE_URL}/api/chatbot/lawyer/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result: LawyerChatResponse = await response.json();
        return { success: true, data: result };
      } else {
        const errorResult = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return { 
          success: false, 
          error: errorResult.detail || errorResult.error || 'Failed to get response from lawyer chatbot' 
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timed out. Please try again.' };
      }
      console.error('LawyerChatbotService error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Check the health status of the lawyer chatbot service
   */
  static async checkHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/lawyer/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result };
      } else {
        const errorResult = await response.json().catch(() => ({ detail: 'Health check failed' }));
        return { success: false, error: errorResult.detail || 'Service unavailable' };
      }
    } catch (error) {
      return { success: false, error: 'Unable to connect to lawyer chatbot service' };
    }
  }

  /**
   * Convert chat messages to conversation history format for API
   */
  static convertMessagesToHistory(messages: LawyerChatMessage[]): Array<{ role: string; content: string }> {
    const history: Array<{ role: string; content: string }> = [];
    
    // Skip the first message if it's the initial greeting
    const chatMessages = messages.length > 1 && !messages[0].fromUser ? messages.slice(1) : messages;
    
    for (const message of chatMessages) {
      history.push({
        role: message.fromUser ? 'user' : 'assistant',
        content: message.text
      });
    }
    
    return history;
  }

  /**
   * Format sources for display in the UI
   */
  static formatSources(sources: SourceCitation[]): string {
    if (!sources || sources.length === 0) {
      return 'No sources available';
    }

    return sources
      .map((source, index) => {
        const relevancePercent = Math.round(source.relevance_score * 100);
        return `${index + 1}. ${source.law} - Article ${source.article_number}${source.article_title ? ` (${source.article_title})` : ''} [${relevancePercent}% relevant]`;
      })
      .join('\n');
  }

  /**
   * Get confidence level display text
   */
  static getConfidenceDisplay(confidence: string): { text: string; color: string } {
    switch (confidence.toLowerCase()) {
      case 'high':
        return { text: 'High Confidence', color: '#10B981' }; // Green
      case 'medium':
        return { text: 'Medium Confidence', color: '#F59E0B' }; // Amber
      case 'low':
        return { text: 'Low Confidence', color: '#EF4444' }; // Red
      default:
        return { text: 'Unknown Confidence', color: '#6B7280' }; // Gray
    }
  }

  /**
   * Create a default lawyer chat request with professional settings
   */
  static createDefaultRequest(question: string, conversationHistory?: LawyerChatMessage[]): LawyerChatRequest {
    return {
      question,
      conversation_history: conversationHistory ? this.convertMessagesToHistory(conversationHistory) : [],
      max_tokens: 2000, // Higher token limit for lawyers
      include_case_law: true, // Enable case law analysis
      include_cross_references: true, // Enable cross-references
    };
  }

  /**
   * Validate question before sending to API
   */
  static validateQuestion(question: string): { isValid: boolean; error?: string } {
    if (!question || question.trim().length === 0) {
      return { isValid: false, error: 'Please enter a question' };
    }
    
    if (question.trim().length < 5) {
      return { isValid: false, error: 'Question is too short. Please provide more details.' };
    }
    
    if (question.length > 2000) {
      return { isValid: false, error: 'Question is too long. Please keep it under 2000 characters.' };
    }
    
    return { isValid: true };
  }
}
