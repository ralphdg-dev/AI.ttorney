import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Image,
  Animated,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { SidebarWrapper } from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import { LawyerNavbar } from "../components/lawyer/shared";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import ChatHistorySidebar, { ChatHistorySidebarRef } from "../components/chatbot/ChatHistorySidebar";
import { ChatHistoryService } from "../services/chatHistoryService";
import { Send } from "lucide-react-native";
import { MarkdownText } from "../components/chatbot/MarkdownText";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// ChatGPT-style animated thinking indicator
const ThinkingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  const dotStyle = (animatedValue: Animated.Value) => ({
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={tw`flex-row items-center`}>
      <Animated.View
        style={[
          tw`w-2 h-2 rounded-full mx-0.5`,
          { backgroundColor: '#3B82F6' },
          dotStyle(dot1),
        ]}
      />
      <Animated.View
        style={[
          tw`w-2 h-2 rounded-full mx-0.5`,
          { backgroundColor: '#3B82F6' },
          dotStyle(dot2),
        ]}
      />
      <Animated.View
        style={[
          tw`w-2 h-2 rounded-full mx-0.5`,
          { backgroundColor: '#3B82F6' },
          dotStyle(dot3),
        ]}
      />
    </View>
  );
};

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
  const { user, session, isLawyer } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [currentConversationId, setCurrentConversationId] =
    useState<string>("");
  const flatRef = useRef<FlatList>(null);
  const sidebarRef = useRef<ChatHistorySidebarRef>(null);
  const isFirstMessageRef = useRef<boolean>(true); // Track if this is the first message in conversation

  // Dynamic greeting that changes per session
  const greeting = useMemo(() => {
    const fullName =
      user?.full_name ||
      user?.username ||
      user?.email?.split("@")[0] ||
      "there";
    const firstName = fullName.split(" ")[0]; // Extract first name only
    const greetings = [
      `${firstName} returns! May legal puzzle ba tayo ngayon?`,
      `Welcome back, ${firstName}! Ready to decode some laws?`,
      `Uy ${firstName}! Anong legal tanong natin today?`,
      `${firstName}'s here! What legal mystery shall we solve?`,
      `Kamusta ${firstName}! May kaso ba o chismis lang? Joke!`,
      `Hey ${firstName}! Let's make Philippine law make sense.`,
      `${firstName} is back! Time for some legal wisdom?`,
      `Mabuhay ${firstName}! Ano'ng legal concern natin?`,
      `Look who's back—${firstName}! Ready to tackle the law?`,
      `${firstName} returns! Let's navigate some legal waters.`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }, [user]); // Changes when user changes

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
    try {
      console.log('🔄 Initializing conversation for user:', user?.id);
      const convId = await ChatHistoryService.getCurrentConversationId(user?.id);
      
      if (convId) {
        console.log('📂 Found existing conversation:', convId);
        setCurrentConversationId(convId);
        isFirstMessageRef.current = false; // Existing conversation
        await loadConversation(convId);
      } else {
        console.log('✨ No existing conversation, starting fresh');
        // No current conversation - start fresh (will create session on first message)
        setCurrentConversationId("");
        isFirstMessageRef.current = true; // New conversation
        setMessages([]);
        setConversationHistory([]);
      }
    } catch (error) {
      console.error('❌ Error initializing conversation:', error);
      // Graceful fallback: start with empty state
      setCurrentConversationId("");
      setMessages([]);
      setConversationHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token]);

  const loadConversation = async (conversationId: string) => {
    if (!conversationId) {
      console.warn("⚠️  No conversation ID provided");
      return;
    }

    console.log("📥 Loading conversation:", conversationId);
    console.log("   User ID:", user?.id);

    try {
      const loadedMessages = await ChatHistoryService.loadConversation(
        conversationId,
        user?.id,
        session?.access_token
      );
      console.log("✅ Loaded messages:", loadedMessages.length);

      if (loadedMessages.length === 0) {
        console.warn("⚠️  No messages found for this conversation");
      } else {
        console.log(
          "   First message:",
          loadedMessages[0].text.substring(0, 50)
        );
      }

      // ALWAYS set messages, even if empty
      setMessages(loadedMessages as Message[]);

      // Rebuild conversation history for context
      const history = loadedMessages.map((msg) => ({
        role: msg.fromUser ? "user" : "assistant",
        content: msg.text,
      }));
      setConversationHistory(history);
      
      // Store the conversation ID for persistence
      if (user?.id) {
        await ChatHistoryService.setCurrentConversationId(conversationId, user.id);
      }

      // Scroll to bottom after messages are set (ChatGPT behavior)
      setTimeout(() => {
        flatRef.current?.scrollToEnd({ animated: false });
      }, 300);
    } catch (error) {
      console.error("❌ Error loading conversation:", error);
      // Clear invalid conversation ID and start fresh
      setCurrentConversationId("");
      setMessages([]);
      setConversationHistory([]);
      setError("Failed to load conversation. Starting a new chat.");
      throw error;
    }
  };

  // Utility: Generate conversation title from user message (DRY principle)
  const generateConversationTitle = useCallback((message: string): string => {
    const maxLength = 50;
    const cleanMessage = message.trim();
    return cleanMessage.length > maxLength 
      ? cleanMessage.substring(0, maxLength) + '...'
      : cleanMessage;
  }, []);

  const handleNewChat = async () => {
    // Industry-standard approach (ChatGPT/Claude): Don't create session until first message
    // This prevents "New Conversation" titles from appearing
    console.log('✨ Starting new chat - will create session on first message');
    
    setCurrentConversationId("");
    isFirstMessageRef.current = true;
    setMessages([]);
    setConversationHistory([]);
    setError(null);
    
    // Clear stored conversation ID
    if (user?.id) {
      await ChatHistoryService.setCurrentConversationId("", user.id);
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    console.log("🔄 Switching to conversation:", conversationId);

    // Update current conversation ID first
    setCurrentConversationId(conversationId);
    isFirstMessageRef.current = false; // Existing conversation

    // Clear existing state
    setMessages([]);
    setConversationHistory([]);
    setError(null);

    // Load the conversation
    try {
      await loadConversation(conversationId);
      console.log("✅ Conversation loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load conversation:", error);
      // Error is already handled in loadConversation
    }
  };

  // Helper function to render legal disclaimer with clickable links and bold text
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
        parts.push({
          text: disclaimer.substring(lastIndex, match.index),
          isLink: false,
        });
      }
      // Add the link
      parts.push({ text: match[1], isLink: true, path: match[2] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < disclaimer.length) {
      parts.push({ text: disclaimer.substring(lastIndex), isLink: false });
    }

    // Helper to render text with bold support
    const renderTextWithBold = (text: string, key: number) => {
      const boldRegex = /\*\*(.+?)\*\*/g;
      const textParts: (string | React.ReactElement)[] = [];
      let currentIndex = 0;
      let boldMatch;
      let partIndex = 0;

      while ((boldMatch = boldRegex.exec(text)) !== null) {
        if (boldMatch.index > currentIndex) {
          textParts.push(text.substring(currentIndex, boldMatch.index));
        }
        textParts.push(
          <Text key={`${key}-bold-${partIndex++}`} style={tw`font-bold`}>
            {boldMatch[1]}
          </Text>
        );
        currentIndex = boldMatch.index + boldMatch[0].length;
      }

      if (currentIndex < text.length) {
        textParts.push(text.substring(currentIndex));
      }

      return textParts.length > 0 ? textParts : [text];
    };

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
                  const router = require("expo-router").router;
                  router.push(part.path);
                }
              }}
            >
              {renderTextWithBold(part.text, index)}
            </Text>
          ) : (
            <Text key={index}>{renderTextWithBold(part.text, index)}</Text>
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

    // Scroll to show the user's message immediately (like ChatGPT)
    setTimeout(() => {
      flatRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Don't create session here - let backend create it on first message
    // This is the industry-standard approach (ChatGPT/Claude)
    let sessionId = currentConversationId;

    try {
      // Determine endpoint based on user role
      const userRole = user?.role || "guest";
      let endpoint = "";

      if (userRole === "verified_lawyer") {
        // Lawyer endpoint - formal legal analysis with legalese
        endpoint = `${API_URL}/api/chatbot/lawyer/ask`;
      } else {
        // General public endpoint (registered_user, guest, etc.) - STREAMING!
        endpoint = `${API_URL}/api/chatbot/user/ask/stream`;
      }

      // Prepare conversation history in the format expected by backend
      const formattedHistory = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Prepare headers with authentication token if available
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Variables to store response data
      let answer = "";
      let sources: any[] = [];
      let confidence = "";
      let language = "";
      let legal_disclaimer = "";
      let fallback_suggestions = null;
      let normalized_query = "";
      let is_complex_query = false;
      let returnedSessionId = null;
      let assistantMessageId = null;
      let userMessageId = null;

      if (userRole === "verified_lawyer") {
        // Lawyers use regular non-streaming endpoint
        const response = await axios.post(
          endpoint,
          {
            question: userMessage,
            conversation_history: formattedHistory,
            max_tokens: 2000,
            user_id: user?.id || null,
            session_id: sessionId || null,
          },
          { headers }
        );

        const data = response.data;
        answer = data.answer;
        sources = data.sources;
        confidence = data.confidence;
        language = data.language;
        legal_disclaimer = data.legal_disclaimer;
        fallback_suggestions = data.fallback_suggestions;
        normalized_query = data.normalized_query;
        is_complex_query = data.is_complex_query;
        returnedSessionId = data.session_id;
        assistantMessageId = data.message_id;
        userMessageId = data.user_message_id;
      } else {
        // General users get STREAMING responses!
        const streamingMsgId = (Date.now() + 1).toString();
        const streamingMsg: Message = {
          id: streamingMsgId,
          text: "",
          fromUser: false,
          sources: [],
        };
        setMessages((prev) => [...prev, streamingMsg]);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            question: userMessage,
            conversation_history: formattedHistory,
            max_tokens: 400,
            user_id: user?.id || null,
            session_id: sessionId || null,
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let lastUpdateTime = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.content) {
                    answer += data.content;
                    const now = Date.now();
                    if (now - lastUpdateTime > 100) {
                      lastUpdateTime = now;
                      setMessages((prev) => {
                        const newMessages = [...prev];
                        const msgIndex = newMessages.findIndex(m => m.id === streamingMsgId);
                        if (msgIndex !== -1) {
                          newMessages[msgIndex] = { ...newMessages[msgIndex], text: answer };
                        }
                        return newMessages;
                      });
                    }
                  }

                  if (data.sources) {
                    sources = data.sources;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const msgIndex = newMessages.findIndex(m => m.id === streamingMsgId);
                      if (msgIndex !== -1) {
                        newMessages[msgIndex] = { ...newMessages[msgIndex], sources: data.sources };
                      }
                      return newMessages;
                    });
                  }

                  if (data.type === 'metadata') {
                    language = data.language;
                  }
                } catch (e) {
                  console.error('Error parsing stream data:', e);
                }
              }
            }
          }
        }

        // Final update
        setMessages((prev) => {
          const newMessages = [...prev];
          const msgIndex = newMessages.findIndex(m => m.id === streamingMsgId);
          if (msgIndex !== -1) {
            newMessages[msgIndex] = {
              ...newMessages[msgIndex],
              text: answer,
              sources: sources,
              confidence: confidence,
              language: language,
            };
          }
          return newMessages;
        });

        assistantMessageId = streamingMsgId;
      }

      console.log("📨 Backend response:", {
        sessionId: returnedSessionId,
        userMessageId,
        assistantMessageId,
        messagesSaved: !!(userMessageId && assistantMessageId),
      });

      // Update session ID if backend created a new one
      if (returnedSessionId) {
        const isNewSession = !sessionId || sessionId !== returnedSessionId;
        
        if (isNewSession) {
          console.log("🆕 New session created:", returnedSessionId);
          setCurrentConversationId(returnedSessionId);
          sessionId = returnedSessionId;

          // Store in AsyncStorage for persistence
          if (user?.id) {
            await ChatHistoryService.setCurrentConversationId(
              returnedSessionId,
              user.id
            );
          }

          // Optimistic UI update: Add conversation to sidebar immediately (first message only)
          if (isFirstMessageRef.current) {
            const title = generateConversationTitle(userMessage);
            console.log("⚡ Optimistically adding conversation to sidebar:", title);
            console.log("   Session ID:", returnedSessionId);
            console.log("   Title:", title);
            console.log("   Sidebar ref exists:", !!sidebarRef.current);
            
            if (sidebarRef.current?.addNewConversation) {
              sidebarRef.current.addNewConversation(returnedSessionId, title);
              console.log("✅ Conversation added to sidebar");
            } else {
              console.warn("⚠️ Sidebar ref not ready, refreshing list instead");
              sidebarRef.current?.refreshConversations();
            }
            
            isFirstMessageRef.current = false;
          }
        }
      } else if (isFirstMessageRef.current && user?.id) {
        // FALLBACK: Backend didn't return session_id, refresh sidebar to show new conversation
        console.warn("⚠️ Backend didn't return session_id, refreshing sidebar as fallback");
        setTimeout(() => {
          sidebarRef.current?.refreshConversations();
        }, 500); // Small delay to let backend finish saving
        isFirstMessageRef.current = false;
      }

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: answer },
      ]);

      // Update the user message with the real ID from backend
      if (userMessageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMsg.id ? { ...msg, id: userMessageId } : msg
          )
        );
      }

      // For non-streaming (lawyers), add bot reply with all enhanced data
      if (userRole === "verified_lawyer") {
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
          is_complex_query: is_complex_query,
        };

        setMessages((prev) => [...prev, reply]);
      }
      // For streaming users, the message already exists and was updated in real-time

      // Scroll to show the bot's response (like ChatGPT)
      setTimeout(() => {
        flatRef.current?.scrollToEnd({ animated: true });
      }, 100);

      console.log("✅ Messages saved to database:", {
        session: sessionId,
        userMsg: userMessageId,
        assistantMsg: assistantMessageId,
      });
    } catch (err: any) {
      console.error("Chat error:", err);

      let errorMessage = "Sorry, I encountered an error. Please try again.";

      if (err.response?.status === 400) {
        // Handle prohibited input or validation errors
        errorMessage =
          err.response.data.detail ||
          "Invalid question. Please rephrase your query.";
      } else if (err.response?.status === 503) {
        errorMessage =
          "The legal knowledge base is not yet initialized. Please contact support.";
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
      <View style={tw`px-4 py-1.5`}>
        <View style={isUser ? tw`items-end` : tw`items-start flex-row`}>
          {!isUser && (
            <View style={tw`mr-2.5`}>
              <Image
                source={require("../assets/images/logo.png")}
                style={{ width: 34, height: 34, marginTop: 2 }}
                resizeMode="contain"
              />
            </View>
          )}
          <View
            style={[
              tw`flex-1 rounded-2xl`,
              isUser
                ? {
                    backgroundColor: Colors.primary.blue,
                    maxWidth: "85%",
                    alignSelf: "flex-end",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    ...(Platform.OS === "web"
                      ? { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }
                      : {
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 8,
                          elevation: 2,
                        }),
                  }
                : {
                    backgroundColor: Colors.background.secondary,
                    maxWidth: "100%",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    ...(Platform.OS === "web"
                      ? { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }
                      : {
                          shadowColor: "#000",
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
              <View
                style={[
                  tw`mb-2 p-2 rounded-lg`,
                  { backgroundColor: Colors.status.info + "15" },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs font-medium`,
                    { color: Colors.status.info },
                  ]}
                >
                  Understood as: {item.normalized_query}
                </Text>
              </View>
            )}

            {/* Main answer with markdown support */}
            <MarkdownText
              text={item.text || ""}
              isUserMessage={isUser}
              style={[tw`text-base`, { lineHeight: 22}]}
            />

            {/* Show sources with URLs */}
            {!isUser && item.sources && item.sources.length > 0 && (
              <View
                style={[
                  tw`mt-3 pt-2 border-t`,
                  { borderTopColor: Colors.border.light },
                ]}
              >
                <Text
                  style={[
                    tw`text-sm font-bold mb-2`,
                    { color: Colors.text.primary },
                  ]}
                >
                  Legal Sources
                </Text>
                {item.sources.map((source, idx) => (
                  <View
                    key={idx}
                    style={[
                      tw`mb-3 p-3 rounded-lg`,
                      { backgroundColor: Colors.background.tertiary },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-sm font-bold mb-1`,
                        { color: Colors.text.primary },
                      ]}
                    >
                      {source.law.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        tw`text-xs mb-2`,
                        { color: Colors.text.secondary },
                      ]}
                    >
                      Article {source.article_number}
                    </Text>
                    {source.article_title && (
                      <Text
                        style={[
                          tw`text-xs mb-2`,
                          { color: Colors.text.secondary, lineHeight: 18 },
                        ]}
                      >
                        {source.article_title}
                      </Text>
                    )}
                    {/* Show text preview if available */}
                    {source.text_preview && (
                      <Text
                        style={[
                          tw`text-xs mb-3`,
                          { color: Colors.text.secondary, lineHeight: 18 },
                        ]}
                        numberOfLines={3}
                      >
                        {source.text_preview}
                      </Text>
                    )}
                    <View
                      style={tw`flex-row items-center justify-between mt-2`}
                    >
                      {source.source_url && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(source.source_url!)}
                        >
                          <Text
                            style={[
                              tw`text-xs font-semibold`,
                              { color: Colors.primary.blue },
                            ]}
                          >
                            View full source
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Text
                        style={[tw`text-xs`, { color: Colors.text.tertiary }]}
                      >
                        Relevance: {(source.relevance_score * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Legal disclaimer */}
            {!isUser && item.legal_disclaimer && (
              <View
                style={[
                  tw`mt-3 pt-2 border-t`,
                  { borderTopColor: Colors.border.light },
                ]}
              >
                <View
                  style={[
                    tw`p-2 rounded-lg`,
                    { backgroundColor: Colors.status.warning + "15" },
                  ]}
                >
                  {renderLegalDisclaimer(item.legal_disclaimer)}
                </View>
              </View>
            )}

            {/* Fallback suggestions for complex queries */}
            {!isUser && !isLawyer() && 
              item.fallback_suggestions &&
              item.fallback_suggestions.length > 0 && (
                <View
                  style={[
                    tw`mt-3 p-3 rounded-lg`,
                    { backgroundColor: Colors.status.info + "15" },
                  ]}
                >
                  <Text
                    style={[
                      tw`text-sm font-bold mb-2`,
                      { color: Colors.status.info },
                    ]}
                  >
                    Recommended Next Steps
                  </Text>
                  {item.fallback_suggestions.map((suggestion, idx) => (
                    <View key={idx} style={tw`mb-2`}>
                      <Text
                        style={[
                          tw`text-xs font-semibold mb-1`,
                          { color: Colors.text.primary },
                        ]}
                      >
                        • {suggestion.description}
                      </Text>
                      <Text
                        style={[
                          tw`text-xs ml-3`,
                          { color: Colors.text.secondary },
                        ]}
                      >
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
    <View
      style={[
        tw`flex-1`,
        { backgroundColor: Colors.background.primary, overflow: "hidden" },
      ]}
    >
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        ref={sidebarRef}
        userId={user?.id}
        sessionToken={session?.access_token}
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
      />

      {/* Header */}
      <Header title="AI Legal Assistant" showMenu={true} />

      {/* Messages list or centered placeholder */}
      <View style={tw`flex-1`}>
        {messages.length === 0 ? (
          <ScrollView
            contentContainerStyle={tw`items-center px-6 pt-12 pb-48`}
            showsVerticalScrollIndicator={false}
            style={tw`flex-1`}
          >
            {/* Logo */}
            <View style={tw`mb-6`}>
              <Image
                source={require("../assets/images/logo.png")}
                style={{ width: 88, height: 88 }}
                resizeMode="contain"
              />
            </View>

            {/* Greeting */}
            <Text
              style={[
                tw`text-3xl font-bold text-center mb-2`,
                { color: Colors.text.primary },
              ]}
            >
              {greeting}
            </Text>

            {/* Subtitle */}
            <Text
              style={[
                tw`text-base text-center mb-10 px-4`,
                { color: Colors.text.secondary, lineHeight: 24 },
              ]}
            >
              I specialize in Civil, Criminal, Consumer, Family, and Labor Law.
              Ask away!
            </Text>

            {/* Suggestions */}
            <View style={tw`w-full px-2`}>
              <Text
                style={[
                  tw`text-sm font-semibold mb-4 px-2`,
                  { color: Colors.text.secondary },
                ]}
              >
                Quick start prompts:
              </Text>
              {(isLawyer() ? [
                "Analyze the elements of estafa under Article 315 RPC",
                "Compare grounds for annulment vs legal separation",
                "Summarize employer obligations under DOLE DO 174",
              ] : [
                "What are my rights as a tenant?",
                "How do I file a small claims case?",
                "What is the legal age of consent?",
              ]).map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setInput(suggestion)}
                  style={[
                    tw`p-4 mb-3 rounded-2xl flex-row items-center`,
                    {
                      backgroundColor: Colors.background.secondary,
                      borderWidth: 1,
                      borderColor: Colors.border.light,
                      ...(Platform.OS === "web"
                        ? { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }
                        : {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: 1,
                          }),
                    },
                  ]}
                >
                  <View
                    style={[
                      tw`w-8 h-8 rounded-full items-center justify-center mr-3`,
                      { backgroundColor: Colors.primary.blue + "15" },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color={Colors.primary.blue}
                    />
                  </View>
                  <Text
                    style={[
                      tw`text-sm flex-1`,
                      { color: Colors.text.primary, lineHeight: 20 },
                    ]}
                  >
                    {suggestion}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={Colors.text.tertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw`pb-48 pt-2`}
            showsVerticalScrollIndicator={false}
            style={tw`flex-1`}
            ListFooterComponent={
              <>
                {/* Typing indicator */}
                {isTyping && (
        <View style={tw`px-4 pb-3`}>
          <View style={tw`flex-row items-start`}>
            <View style={tw`mr-2.5`}>
              <Image
                source={require("../assets/images/logo.png")}
                style={{ width: 34, height: 34, marginTop: 2 }}
                resizeMode="contain"
              />
            </View>
            <View
              style={[
                tw`px-4 py-3 rounded-2xl flex-row items-center`,
                { backgroundColor: Colors.background.secondary },
              ]}
            >
              <ThinkingIndicator />
            </View>
          </View>
        </View>
                )}

                {/* Error message */}
                {error && (
        <View style={tw`px-6 pb-3`}>
          <View
            style={[
              tw`p-4 rounded-xl flex-row items-start`,
              { backgroundColor: Colors.status.error + "15" },
            ]}
          >
            <Ionicons
              name="alert-circle"
              size={20}
              color={Colors.status.error}
              style={tw`mr-2`}
            />
            <Text style={[tw`text-sm flex-1`, { color: Colors.status.error }]}>
              {error}
            </Text>
          </View>
        </View>
                )}
              </>
            }
          />
        )}
      </View>

      {/* Composer - Fixed at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: '#FFFFFF',
        }}
      >
        <View
          style={[
            tw`px-4 pt-3 pb-4 border-t border-b`,
            {
              borderTopColor: Colors.border.light,
              borderBottomColor: Colors.border.light,
              backgroundColor: '#FFFFFF',
            },
          ]}
        >
          <View style={tw`flex-row items-center`}>
            <View style={tw`flex-1 mr-3`}>
              <View
                style={[
                  tw`rounded-full px-5`,
                  {
                    backgroundColor: Colors.background.secondary,
                    borderWidth: 1,
                    borderColor: Colors.border.light,
                    height: 50,
                    ...(Platform.OS === "web"
                      ? { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }
                      : {
                          shadowColor: "#000",
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
                  placeholder="Ask your legal question..."
                  placeholderTextColor="#9CA3AF"
                  style={[
                    tw`text-base flex-1`,
                    {
                      color: Colors.text.primary,
                      outlineStyle: "none",
                      paddingVertical: 0,
                      height: 48,
                    },
                  ]}
                  maxLength={1000}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={isTyping || !input.trim()}
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center`,
                {
                  backgroundColor:
                    isTyping || !input.trim()
                      ? Colors.border.medium
                      : Colors.primary.blue,
                  ...(Platform.OS === "web"
                    ? { boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }
                    : {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }),
                },
              ]}
            >
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Conditionally render navbar based on user role */}
      {user?.role === "verified_lawyer" ? (
        <LawyerNavbar activeTab="chatbot" />
      ) : (
        <Navbar activeTab="ask" />
      )}
      <SidebarWrapper />
    </View>
  );
}
