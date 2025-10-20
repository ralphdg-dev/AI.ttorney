import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  id: string;
  text: string;
  fromUser: boolean;
  timestamp: string;
  sources?: any[];
  confidence?: string;
  language?: string;
  legal_disclaimer?: string;
  fallback_suggestions?: any[];
  normalized_query?: string;
  is_complex_query?: boolean;
  role?: string;
  content?: string;
  metadata?: Record<string, any>;
  tokens_used?: number;
  response_time_ms?: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  preview?: string;
  is_archived?: boolean;
  language?: string;
}

const CURRENT_CONVERSATION_KEY = '@current_conversation_id';
const ACTIVE_CONVERSATIONS_KEY = '@active_conversations';

/**
 * Chat History Service
 * Manages conversation persistence using session-based backend API
 */
export class ChatHistoryService {
  
  private static getHeaders(token?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }
  
  static async getCurrentConversationId(userId?: string): Promise<string | null> {
    try {
      const key = userId ? `${CURRENT_CONVERSATION_KEY}_${userId}` : CURRENT_CONVERSATION_KEY;
      const conversationId = await AsyncStorage.getItem(key);
      
      // Return null if no current conversation - let the UI create a new one
      return conversationId;
    } catch (error) {
      console.error('Error getting conversation ID:', error);
      return null;
    }
  }
  
  static async setCurrentConversationId(conversationId: string, userId?: string): Promise<void> {
    try {
      const key = userId ? `${CURRENT_CONVERSATION_KEY}_${userId}` : CURRENT_CONVERSATION_KEY;
      await AsyncStorage.setItem(key, conversationId);
      console.log('💾 Stored current conversation ID:', conversationId);
    } catch (error) {
      console.error('Error setting conversation ID:', error);
    }
  }

  static async startNewConversation(userId?: string, title: string = 'New Conversation', token?: string): Promise<string> {
    try {
      console.log('✨ Creating new conversation for user:', userId);
      // Create a new session via the backend API
      const headers = this.getHeaders(token);
      const response = await axios.post(
        `${API_BASE_URL}/api/chat-history/sessions`,
        { title, language: 'en' },
        { headers, timeout: 10000 }
      );

      const sessionId = response.data.id;
      console.log('✅ New session created:', sessionId);
      
      // Store the new session ID as current
      const key = userId ? `${CURRENT_CONVERSATION_KEY}_${userId}` : CURRENT_CONVERSATION_KEY;
      await AsyncStorage.setItem(key, sessionId);
      console.log('💾 Stored session ID in local storage');
      
      return sessionId;
    } catch (error: any) {
      console.error('❌ Error starting new conversation:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      throw error;
    }
  }

  static async saveMessage(
    message: ChatMessage,
    conversationId: string,
    userId?: string,
    token?: string
  ): Promise<boolean> {
    try {
      // Messages are now saved automatically by the backend
      // This method is kept for backward compatibility
      await this.updateConversationMetadata(conversationId, message, userId, token);
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      return false;
    }
  }

  static async loadConversation(
    conversationId: string,
    userId?: string,
    token?: string
  ): Promise<ChatMessage[]> {
    try {
      console.log('📡 ChatHistoryService.loadConversation called');
      console.log('   Conversation ID:', conversationId);
      console.log('   User ID:', userId);
      
      // Validate that conversationId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        console.warn('❌ Invalid conversation ID format (not a UUID):', conversationId);
        // Clear the invalid ID from storage
        const key = userId ? `${CURRENT_CONVERSATION_KEY}_${userId}` : CURRENT_CONVERSATION_KEY;
        await AsyncStorage.removeItem(key);
        return [];
      }

      const headers = this.getHeaders(token);
      console.log('   Headers:', Object.keys(headers));
      
      const url = `${API_BASE_URL}/api/chat-history/sessions/${conversationId}`;
      console.log('   URL:', url);
      
      const response = await axios.get(url, { headers });
      console.log('   Response status:', response.status);
      console.log('   Response data keys:', Object.keys(response.data));

      if (response.data && response.data.messages) {
        const messages = response.data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          fromUser: msg.role === 'user',
          timestamp: msg.created_at,
          sources: msg.metadata?.sources,
          confidence: msg.metadata?.confidence,
          language: msg.metadata?.language,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata,
          tokens_used: msg.tokens_used,
          response_time_ms: msg.response_time_ms
        }));
        
        console.log('✅ Transformed', messages.length, 'messages');
        return messages;
      }

      console.warn('⚠️  No messages in response');
      return [];
    } catch (error: any) {
      console.error('❌ Error loading conversation:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      // Clear invalid conversation ID
      const key = userId ? `${CURRENT_CONVERSATION_KEY}_${userId}` : CURRENT_CONVERSATION_KEY;
      await AsyncStorage.removeItem(key);
      return [];
    }
  }

  static async getConversationsList(userId?: string, includeArchived: boolean = false, token?: string): Promise<Conversation[]> {
    try {
      console.log('📜 Fetching conversations list for user:', userId);
      const headers = this.getHeaders(token);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/chat-history/sessions`,
        { 
          headers,
          params: { include_archived: includeArchived, page: 1, page_size: 50 },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data && response.data.sessions) {
        console.log('✅ Loaded', response.data.sessions.length, 'conversations');
        return response.data.sessions;
      }
      
      console.warn('⚠️  No sessions in response');
      return [];
    } catch (error: any) {
      console.error('❌ Error getting conversations list:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      // Return empty array on error - let UI handle gracefully
      return [];
    }
  }

  static async deleteConversation(conversationId: string, userId?: string, token?: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting conversation:', conversationId);
      const headers = this.getHeaders(token);
      
      const response = await axios.delete(
        `${API_BASE_URL}/api/chat-history/sessions/${conversationId}`,
        { headers }
      );
      
      console.log('✅ Delete response:', response.data);
      
      // Clear from local storage if it's the current conversation
      const key = userId ? `${CURRENT_CONVERSATION_KEY}_${userId}` : CURRENT_CONVERSATION_KEY;
      const currentId = await AsyncStorage.getItem(key);
      if (currentId === conversationId) {
        await AsyncStorage.removeItem(key);
        console.log('🧹 Cleared current conversation from storage');
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      return false;
    }
  }
  
  static async archiveConversation(conversationId: string, token?: string): Promise<boolean> {
    try {
      const headers = this.getHeaders(token);
      await axios.post(
        `${API_BASE_URL}/api/chat-history/sessions/${conversationId}/archive`,
        {},
        { headers }
      );
      
      return true;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      return false;
    }
  }
  
  static async updateConversationTitle(conversationId: string, title: string, token?: string): Promise<boolean> {
    try {
      const headers = this.getHeaders(token);
      await axios.patch(
        `${API_BASE_URL}/api/chat-history/sessions/${conversationId}`,
        { title },
        { headers }
      );
      
      return true;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }
  }

  private static generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async updateActiveConversationsList(
    conversationId: string,
    userId?: string,
    token?: string
  ): Promise<void> {
    try {
      const conversations = await this.getConversationsList(userId, false, token);
      
      const exists = conversations.find(c => c.id === conversationId);
      if (exists) return;

      const newConversation: Conversation = {
        id: conversationId,
        title: 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        message_count: 0,
        preview: '',
      };

      conversations.unshift(newConversation);
      
      const key = userId ? `${ACTIVE_CONVERSATIONS_KEY}_${userId}` : ACTIVE_CONVERSATIONS_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(conversations.slice(0, 50)));
    } catch (error) {
      console.error('Error updating conversations list:', error);
    }
  }

  private static async updateConversationMetadata(
    conversationId: string,
    message: ChatMessage,
    userId?: string,
    token?: string
  ): Promise<void> {
    try {
      const conversations = await this.getConversationsList(userId, false, token);
      const index = conversations.findIndex(c => c.id === conversationId);

      if (index !== -1) {
        conversations[index].updated_at = new Date().toISOString();
        conversations[index].message_count += 1;
        
        if (message.fromUser && conversations[index].title === 'New Chat') {
          conversations[index].title = message.text.substring(0, 50);
        }
        
        if (!message.fromUser) {
          conversations[index].preview = message.text.substring(0, 100);
        }

        const key = userId ? `${ACTIVE_CONVERSATIONS_KEY}_${userId}` : ACTIVE_CONVERSATIONS_KEY;
        await AsyncStorage.setItem(key, JSON.stringify(conversations));
      }
    } catch (error) {
      console.error('Error updating conversation metadata:', error);
    }
  }
}
