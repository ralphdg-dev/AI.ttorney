import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { SidebarWrapper } from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import ChatHistorySidebar from "../components/chatbot/ChatHistorySidebar";
import { ChatHistoryService } from "../services/chatHistoryService";
import { Sparkles, Send } from "lucide-react-native";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface SourceCitation {
  source: string;
  law: string;
  article_number: string;
  article_title?: string;
  text_preview: string;
  source_url?: string;
  relevance_score: number;
}

interface FallbackSuggestion {
  action: string;
  description: string;
  reason: string;
}

interface Message {
  id: string;
  text: string;
  fromUser: boolean;
  isTyping?: boolean;
  sources?: SourceCitation[];
  confidence?: string;
  language?: string;
  legal_disclaimer?: string;
  fallback_suggestions?: FallbackSuggestion[];
  normalized_query?: string;
  is_complex_query?: boolean;
}

export default function ChatbotScreen() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<{role: string, content: string}[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    initializeConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initializeConversation = useCallback(async () => {
    const convId = await ChatHistoryService.getCurrentConversationId(user?.id);
    if (convId) {
      setCurrentConversationId(convId);
      await loadConversation(convId);
    } else {
      // No current conversation - start fresh (will create session on first message)
      setCurrentConversationId('');
      setMessages([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadConversation = async (conversationId: string) => {
    if (!conversationId) {
      console.warn('⚠️  No conversation ID provided');
      return;
    }
    
    console.log('📥 Loading conversation:', conversationId);
    console.log('   User ID:', user?.id);
    
    try {
      const loadedMessages = await ChatHistoryService.loadConversation(conversationId, user?.id);
      console.log('✅ Loaded messages:', loadedMessages.length);
      
      if (loadedMessages.length === 0) {
        console.warn('⚠️  No messages found for this conversation');
      } else {
        console.log('   First message:', loadedMessages[0].text.substring(0, 50));
      }
      
      // ALWAYS set messages, even if empty
      setMessages(loadedMessages as Message[]);
      
      // Rebuild conversation history for context
      const history = loadedMessages.map(msg => ({
        role: msg.fromUser ? 'user' : 'assistant',
        content: msg.text
      }));
      setConversationHistory(history);
      
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      throw error;
    }
  };

  const handleNewChat = async () => {
    const newConvId = await ChatHistoryService.startNewConversation(user?.id);
    setCurrentConversationId(newConvId);
    setMessages([]);
    setConversationHistory([]);
    setError(null);
  };

  const handleConversationSelect = async (conversationId: string) => {
    console.log('🔄 Switching to conversation:', conversationId);
    
    // Update current conversation ID first
    setCurrentConversationId(conversationId);
    
    // Clear existing state
    setMessages([]);
    setConversationHistory([]);
    setError(null);
    
    // Load the conversation
    try {
      await loadConversation(conversationId);
      console.log('✅ Conversation loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load conversation:', error);
      setError('Failed to load conversation. Please try again.');
    }
  };

  // Helper function to render legal disclaimer with clickable links
  const renderLegalDisclaimer = (disclaimer: string) => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    // Parse markdown links [text](/path) and make them clickable
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: { text: string; isLink: boolean; path?: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(disclaimer)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push({ text: disclaimer.substring(lastIndex, match.index), isLink: false });
      }
      // Add the link
      parts.push({ text: match[1], isLink: true, path: match[2] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < disclaimer.length) {
      parts.push({ text: disclaimer.substring(lastIndex), isLink: false });
    }

    return (
      <Text style={tw`text-xs text-gray-600 italic`}>
        {parts.map((part, index) => 
          part.isLink ? (
            <Text
              key={index}
              style={tw`text-blue-600 underline`}
              onPress={() => {
                // Navigate to in-app route
                if (part.path) {
                  // Use router navigation for in-app links
                  const router = require('expo-router').router;
                  router.push(part.path);
                }
              }}
            >
              {part.text}
            </Text>
          ) : (
            <Text key={index}>{part.text}</Text>
          )
        )}
      </Text>
    );
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    const newMsg: Message = {
      id: Date.now().toString(),
      text: userMessage,
      fromUser: true,
    };
    
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    // Don't create session here - let backend create it on first message
    // This is the industry-standard approach (ChatGPT/Claude)
    let sessionId = currentConversationId;

    try {
      // Determine endpoint based on user role
      const userRole = user?.role || 'guest';
      let endpoint = '';
      
      if (userRole === 'verified_lawyer') {
        // Lawyer endpoint (to be implemented)
        endpoint = `${API_URL}/api/chatbot/lawyer/ask`;
      } else {
        // General public endpoint (registered_user, guest, etc.)
        endpoint = `${API_URL}/api/chatbot/user/ask`;
      }

      // Prepare conversation history in the format expected by backend
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Prepare headers with authentication token if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Call enhanced chatbot API with authentication
      const response = await axios.post(endpoint, {
        question: userMessage,
        conversation_history: formattedHistory,
        max_tokens: 1200,
        user_id: user?.id || null,
        session_id: sessionId || null
      }, { headers });

      const { 
        answer, 
        sources, 
        confidence, 
        language,
        legal_disclaimer,
        fallback_suggestions,
        normalized_query,
        is_complex_query,
        session_id: returnedSessionId,
        message_id: assistantMessageId,
        user_message_id: userMessageId
      } = response.data;
      
      console.log('📨 Backend response:', {
        sessionId: returnedSessionId,
        userMessageId,
        assistantMessageId,
        messagesSaved: !!(userMessageId && assistantMessageId)
      });
      
      // Update session ID if backend created a new one
      if (returnedSessionId) {
        if (!sessionId || sessionId !== returnedSessionId) {
          console.log('🆕 New session created:', returnedSessionId);
          setCurrentConversationId(returnedSessionId);
          sessionId = returnedSessionId;
          
          // Store in AsyncStorage for persistence
          if (user?.id) {
            await ChatHistoryService.setCurrentConversationId(returnedSessionId, user.id);
          }
        }
      }

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: answer }
      ]);

      // Update the user message with the real ID from backend
      if (userMessageId) {
        setMessages((prev) => prev.map(msg => 
          msg.id === newMsg.id ? { ...msg, id: userMessageId } : msg
        ));
      }
      
      // Add bot reply with all enhanced data and real ID from backend
      const reply: Message = {
        id: assistantMessageId || (Date.now() + 1).toString(),
        text: answer,
        fromUser: false,
        sources: sources || [],
        confidence: confidence,
        language: language,
        legal_disclaimer: legal_disclaimer,
        fallback_suggestions: fallback_suggestions,
        normalized_query: normalized_query,
        is_complex_query: is_complex_query
      };
      
      setMessages((prev) => [...prev, reply]);
      
      console.log('✅ Messages saved to database:', {
        session: sessionId,
        userMsg: userMessageId,
        assistantMsg: assistantMessageId
      });
      
    } catch (err: any) {
      console.error("Chat error:", err);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      if (err.response?.status === 400) {
        // Handle prohibited input or validation errors
        errorMessage = err.response.data.detail || "Invalid question. Please rephrase your query.";
      } else if (err.response?.status === 503) {
        errorMessage = "The legal knowledge base is not yet initialized. Please contact support.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
      
      const errorReply: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        fromUser: false,
      };
      
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.fromUser;
    return (
      <View style={tw`px-4 py-2`}>
        <View style={isUser ? tw`items-end` : tw`items-start flex-row`}>
          {!isUser && (
            <View
              style={[
                tw`w-8 h-8 rounded-full items-center justify-center mr-3 mt-1`,
                { backgroundColor: Colors.primary.blue },
              ]}
            >
              <Sparkles size={16} color="#fff" />
            </View>
          )}
          <View
            style={[
              tw`flex-1 rounded-2xl`,
              isUser
                ? { 
                    backgroundColor: Colors.primary.blue,
                    maxWidth: '85%',
                    alignSelf: 'flex-end',
                    padding: 16,
                    ...(Platform.OS === 'web'
                      ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 8,
                          elevation: 2,
                        }),
                  }
                : { 
                    backgroundColor: Colors.background.secondary,
                    maxWidth: '100%',
                    padding: 16,
                    ...(Platform.OS === 'web'
                      ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 3,
                          elevation: 1,
                        }),
                  },
            ]}
          >
            {/* Normalized query indicator */}
            {!isUser && item.normalized_query && (
              <View style={[tw`mb-3 p-3 rounded-lg`, { backgroundColor: Colors.status.info + '15' }]}>
                <Text style={[tw`text-xs font-medium`, { color: Colors.status.info }]}>
                  Understood as: {item.normalized_query}
                </Text>
              </View>
            )}

            {/* Main answer */}
            <Text
              style={[
                tw`text-base`,
                { lineHeight: 26 },
                isUser ? tw`text-white` : { color: Colors.text.primary },
              ]}
            >
              {item.text || ''}
            </Text>
            {!isUser && item.confidence && (
              <View style={[tw`mt-4 p-3 rounded-lg`, { backgroundColor: Colors.background.tertiary }]}>
                <Text style={[tw`text-xs font-semibold`, { color: Colors.text.secondary }]}>
                  Confidence: {item.confidence === 'high' && 'High'}
                  {item.confidence === 'medium' && 'Medium'}
                  {item.confidence === 'low' && 'Low - consider consulting a lawyer'}
                </Text>
              </View>
            )}
            
            {/* Show sources with URLs */}
            {!isUser && item.sources && item.sources.length > 0 && (
              <View style={[tw`mt-4 pt-3 border-t`, { borderTopColor: Colors.border.light }]}>
                <Text style={[tw`text-sm font-bold mb-3`, { color: Colors.text.primary }]}>Legal Sources</Text>
                {item.sources.map((source, idx) => (
                  <View key={idx} style={[tw`mb-3 p-4 rounded-lg`, { backgroundColor: Colors.background.tertiary }]}>
                    <Text style={[tw`text-sm font-bold mb-1`, { color: Colors.text.primary }]}>
                      {source.law.toUpperCase()}
                    </Text>
                    <Text style={[tw`text-xs mb-2`, { color: Colors.text.secondary }]}>
                      Article {source.article_number}
                    </Text>
                    {source.article_title && (
                      <Text style={[tw`text-xs mb-3`, { color: Colors.text.secondary }]}>
                        {source.article_title}
                      </Text>
                    )}
                    <View style={tw`flex-row items-center justify-between mt-2`}>
                      {source.source_url && (
                        <TouchableOpacity 
                          onPress={() => Linking.openURL(source.source_url!)}
                        >
                          <Text style={[tw`text-xs font-semibold`, { color: Colors.primary.blue }]}>
                            View full source
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Text style={[tw`text-xs`, { color: Colors.text.tertiary }]}>
                        Relevance: {(source.relevance_score * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Legal disclaimer */}
            {!isUser && item.legal_disclaimer && (
              <View style={[tw`mt-4 pt-3 border-t`, { borderTopColor: Colors.border.light }]}>
                <View style={[tw`p-3 rounded-lg`, { backgroundColor: Colors.status.warning + '15' }]}>
                  {renderLegalDisclaimer(item.legal_disclaimer)}
                </View>
              </View>
            )}

            {/* Fallback suggestions for complex queries */}
            {!isUser && item.fallback_suggestions && item.fallback_suggestions.length > 0 && (
              <View style={[tw`mt-4 p-4 rounded-lg`, { backgroundColor: Colors.status.info + '15' }]}>
                <Text style={[tw`text-sm font-bold mb-3`, { color: Colors.status.info }]}>
                  Recommended Next Steps
                </Text>
                {item.fallback_suggestions.map((suggestion, idx) => (
                  <View key={idx} style={tw`mb-2`}>
                    <Text style={[tw`text-xs font-semibold mb-1`, { color: Colors.text.primary }]}>
                      • {suggestion.description}
                    </Text>
                    <Text style={[tw`text-xs ml-3`, { color: Colors.text.secondary }]}>
                      {suggestion.reason}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          </View>
        </View>
      </View>
    );
  };


  return (
      <View style={[tw`flex-1`, { backgroundColor: Colors.background.primary, overflow: 'hidden' }]}>
        {/* Chat History Sidebar */}
        <ChatHistorySidebar
          userId={user?.id}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewChat={handleNewChat}
        />

        {/* Header */}
        <Header
          title="AI Legal Assistant"
          showMenu={true}
        />

        {/* Messages list or centered placeholder */}
        <View style={tw`flex-1`}>
        {messages.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center px-8`}>
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center mb-6`,
                { backgroundColor: Colors.primary.blue + '15' },
              ]}
            >
              <Sparkles size={40} color={Colors.primary.blue} />
            </View>
            <Text style={[tw`text-2xl font-bold text-center mb-3`, { color: Colors.text.primary }]}>
              May tanong tungkol sa batas?
            </Text>
            <Text style={[tw`text-base text-center`, { color: Colors.text.secondary }]}>
              I specialize in Civil, Criminal, Consumer, Family, and Labor Law. Ask away!
            </Text>
            <View style={tw`mt-8 w-full px-4`}>
              <Text style={[tw`text-sm font-semibold mb-3`, { color: Colors.text.primary }]}>
                Try asking:
              </Text>
              {[
                'What are my rights as a tenant?',
                'How do I file a small claims case?',
                'What is the legal age of consent?',
              ].map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setInput(suggestion)}
                  style={[
                    tw`p-4 mb-2 rounded-xl`,
                    { backgroundColor: Colors.background.secondary },
                  ]}
                >
                  <Text style={[tw`text-sm`, { color: Colors.text.primary }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw`px-4 pb-4 pt-2`}
            showsVerticalScrollIndicator={false}
            style={tw`flex-1`}
          />
        )}
        </View>

        {/* Typing indicator */}
        {isTyping && (
          <View style={tw`px-6 pb-3`}>
            <View style={tw`flex-row items-start`}>
              <View
                style={[
                  tw`w-8 h-8 rounded-full items-center justify-center mr-3`,
                  { backgroundColor: Colors.primary.blue },
                ]}
              >
                <Sparkles size={16} color="#fff" />
              </View>
              <View style={[tw`p-4 rounded-2xl flex-row items-center`, { backgroundColor: Colors.background.secondary }]}>
                <ActivityIndicator size="small" color={Colors.primary.blue} style={tw`mr-3`} />
                <Text style={[tw`text-sm font-medium`, { color: Colors.text.secondary }]}>Analyzing your question...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={tw`px-6 pb-3`}>
            <View style={[tw`p-4 rounded-xl flex-row items-start`, { backgroundColor: Colors.status.error + '15' }]}>
              <Ionicons name="alert-circle" size={20} color={Colors.status.error} style={tw`mr-2`} />
              <Text style={[tw`text-sm flex-1`, { color: Colors.status.error }]}>{error}</Text>
            </View>
          </View>
        )}

        {/* Composer */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View
            style={[
              tw`px-4 pt-3 pb-2 border-t`,
              { 
                borderTopColor: Colors.border.light,
                backgroundColor: Colors.background.primary,
                marginBottom: 80,
              },
            ]}
          >
            <View style={tw`flex-row items-end`}>
              <View style={tw`flex-1 mr-3`}>
                <View
                  style={[
                    tw`rounded-3xl px-5 py-3`,
                    {
                      backgroundColor: Colors.background.secondary,
                      borderWidth: 1.5,
                      borderColor: Colors.border.light,
                      minHeight: 50,
                      maxHeight: 120,
                      ...(Platform.OS === 'web'
                        ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }
                        : {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: 1,
                          }),
                    },
                  ]}
                >
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask about Civil, Criminal, Consumer, Family, or Labor Law..."
                    placeholderTextColor={Colors.text.tertiary}
                    style={[
                      tw`text-base`,
                      { 
                        color: Colors.text.primary,
                        paddingTop: Platform.OS === 'ios' ? 2 : 0,
                        outlineStyle: 'none',
                      },
                    ]}
                    multiline
                    maxLength={1000}
                    onSubmitEditing={sendMessage}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={sendMessage}
                disabled={isTyping || !input.trim()}
                style={[
                  tw`w-12 h-12 rounded-full items-center justify-center`,
                  { 
                    backgroundColor: (isTyping || !input.trim()) 
                      ? Colors.border.medium 
                      : Colors.primary.blue,
                    ...(Platform.OS === 'web'
                      ? { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }),
                  }
                ]}
              >
                <Send size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        <Navbar activeTab="ask" />
        <SidebarWrapper />
      </View>
  );
}
