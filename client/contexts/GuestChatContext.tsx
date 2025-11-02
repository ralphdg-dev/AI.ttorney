import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Guest Chat Context - In-Memory Chat Persistence
 * Follows OpenAI/Anthropic pattern:
 * - Messages persist during app session (survive page navigation)
 * - Cleared when app closes (not persisted to storage)
 * - Separate from GuestContext which handles rate limiting
 */

export interface Message {
  id: string;
  text: string;
  fromUser: boolean;
  sources?: any[];
  language?: string;
}

interface GuestSession {
  id: string;
  serverToken?: string;  // Cryptographic token from server
}

interface GuestChatContextType {
  messages: Message[];
  conversationHistory: { role: string; content: string }[];
  currentConversationId: string;
  guestSession: GuestSession | null;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setConversationHistory: (history: { role: string; content: string }[]) => void;
  setCurrentConversationId: (id: string) => void;
  setGuestSession: (session: GuestSession | null) => void;
}

const GuestChatContext = createContext<GuestChatContextType | undefined>(undefined);

export const GuestChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // In-memory state - survives navigation but NOT app close
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    setCurrentConversationId('');
    setGuestSession(null);
    console.log('🗑️ Guest chat cleared');
  }, []);

  const value: GuestChatContextType = {
    messages,
    conversationHistory,
    currentConversationId,
    guestSession,
    addMessage,
    updateMessage,
    clearMessages,
    setConversationHistory,
    setCurrentConversationId,
    setGuestSession,
  };

  return <GuestChatContext.Provider value={value}>{children}</GuestChatContext.Provider>;
};

export const useGuestChat = (): GuestChatContextType => {
  const context = useContext(GuestChatContext);
  if (!context) {
    throw new Error('useGuestChat must be used within a GuestChatProvider');
  }
  return context;
};
