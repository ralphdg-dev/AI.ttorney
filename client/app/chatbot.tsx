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
  Linking,
  Image,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { SidebarWrapper } from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import { LawyerNavbar } from "../components/lawyer/shared";
import { useAuth } from "../contexts/AuthContext";
import ChatHistorySidebar, { ChatHistorySidebarRef } from "../components/chatbot/ChatHistorySidebar";
import { ChatHistoryService } from "../services/chatHistoryService";
import { Send } from "lucide-react-native";
import { MarkdownText } from "../components/chatbot/MarkdownText";
import { NetworkConfig } from "../utils/networkConfig";
import { LAYOUT, getTotalUIHeight } from "../constants/LayoutConstants";

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
  }, [dot1, dot2, dot3]);

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
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [currentConversationId, setCurrentConversationId] =
    useState<string>("");
  const [isLoadingConversation, setIsLoadingConversation] = useState(false); // Track if loading a conversation
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true); // Track if scrolled to bottom to prevent flash
  const flatRef = useRef<FlatList>(null);
  const sidebarRef = useRef<ChatHistorySidebarRef>(null);
  const isFirstMessageRef = useRef<boolean>(true); // Track if this is the first message in conversation
  const isStreamingRef = useRef<boolean>(false); // Track if currently streaming
  const lastContentHeight = useRef<number>(0); // Track content height for smooth scrolling
  const shouldAutoScroll = useRef<boolean>(true); // Track if we should auto-scroll (user hasn't scrolled up)
  const scrollAnimationFrame = useRef<number | null>(null); // Animation frame for smooth scrolling
  const inputContainerHeight = useRef<number>(0); // Measured height of input container
  const navbarHeight = useRef<number>(60); // Navbar height (fixed)
  
  // Calculate bottom padding based on actual measured UI elements
  // This is more accurate than percentage-based guessing
  const getBottomPadding = useCallback(() => {
    // Real measurements: navbar + input container + comfortable spacing
    const totalUIHeight = navbarHeight.current + inputContainerHeight.current;
    const breathingRoom = 20; // Small fixed spacing for comfort
    
    return totalUIHeight + breathingRoom;
  }, []);

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

  // OpenAI-style smooth continuous scrolling
  // Automatically keeps bottom visible as content grows, mimicking human scrolling
  const smoothScrollToBottom = useCallback(() => {
    if (!shouldAutoScroll.current) return;
    
    // Cancel any pending scroll animation
    if (scrollAnimationFrame.current) {
      cancelAnimationFrame(scrollAnimationFrame.current);
    }
    
    // Scroll to absolute bottom with large offset to ensure complete visibility
    // This ensures the entire chat bubble (including sources) is visible
    flatRef.current?.scrollToOffset({ 
      offset: 999999, // Large number ensures we reach absolute bottom
      animated: true 
    });
  }, []);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimationFrame.current) {
        cancelAnimationFrame(scrollAnimationFrame.current);
        scrollAnimationFrame.current = null;
      }
    };
  }, []);

  useEffect(() => {
    initializeConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initializeConversation = useCallback(async () => {
    try {
      console.log('🔄 Initializing conversation - always starting fresh');
      // Always start with greeting screen, don't auto-load last conversation
      setCurrentConversationId("");
      isFirstMessageRef.current = true; // New conversation
      setMessages([]);
      setConversationHistory([]);
      
      // Clear any stored conversation ID so we start fresh
      if (user?.id) {
        await ChatHistoryService.setCurrentConversationId("", user.id);
      }
    } catch (error) {
      console.error('❌ Error initializing conversation:', error);
      // Graceful fallback: start with empty state
      setCurrentConversationId("");
      setMessages([]);
      setConversationHistory([]);
    }
  }, [user?.id]);

  const loadConversation = async (conversationId: string) => {
    if (!conversationId) {
      console.warn("⚠️  No conversation ID provided");
      return;
    }

    console.log("📥 Loading conversation:", conversationId);
    console.log("   User ID:", user?.id);

    setIsLoadingConversation(true); // Start loading

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

      // Set messages - FlatList will automatically position at bottom via onContentSizeChange
      setMessages(loadedMessages as Message[]);
    } catch (error) {
      console.error("❌ Error loading conversation:", error);
      // Clear invalid conversation ID and start fresh
      setCurrentConversationId("");
      setMessages([]);
      setConversationHistory([]);
      setError("Failed to load conversation. Starting a new chat.");
      throw error;
    } finally {
      setIsLoadingConversation(false); // Done loading
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
    setIsScrolledToBottom(false); // Hide content until scrolled to bottom

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
    
    // Prevent duplicate sends (important for when Enter key triggers both onSubmitEditing and onPress)
    if (isTyping || isStreamingRef.current) return;

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
    isStreamingRef.current = false; // Reset streaming flag

    // Enable auto-scroll for new message
    shouldAutoScroll.current = true;
    smoothScrollToBottom();

    // Don't create session here - let backend create it on first message
    // This is the industry-standard approach (ChatGPT/Claude)
    let sessionId = currentConversationId;

    try {
      // Get API URL dynamically using NetworkConfig
      const apiUrl = await NetworkConfig.getBestApiUrl();
      console.log('🌐 API URL detected:', apiUrl);
      
      // Determine endpoint based on user role
      const userRole = user?.role || "guest";
      let endpoint = "";

      if (userRole === "verified_lawyer") {
        // Lawyer endpoint - formal legal analysis with legalese - STREAMING!
        endpoint = `${apiUrl}/api/chatbot/lawyer/ask/stream`;
      } else {
        // General public endpoint (registered_user, guest, etc.) - STREAMING!
        endpoint = `${apiUrl}/api/chatbot/user/ask/stream`;
      }
      
      console.log('📍 Full endpoint URL:', endpoint);

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
      let fallback_suggestions: any = undefined;
      let normalized_query = "";
      let is_complex_query = false;
      let returnedSessionId = null;
      let assistantMessageId = null;
      let userMessageId = null;

      // Both lawyers and general users get STREAMING responses!
      if (true) {
        console.log('📤 Sending request to streaming endpoint:', endpoint);
        const streamingMsgId = (Date.now() + 1).toString();
        const streamingMsg: Message = {
          id: streamingMsgId,
          text: "",
          fromUser: false,
          sources: [],
        };
        setMessages((prev) => [...prev, streamingMsg]);
        isStreamingRef.current = true; // Mark as streaming

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              question: userMessage,
              conversation_history: formattedHistory,
              max_tokens: userRole === "verified_lawyer" ? 1500 : 400, // Lawyers get more tokens for formal responses
              user_id: user?.id || null,
              session_id: sessionId || null,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Check response status
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('❌ Streaming endpoint error:', response.status, response.statusText);
            console.error('❌ Error details:', errorText);
            throw new Error(`Server returned ${response.status}: ${response.statusText}\n${errorText}`);
          }

          console.log('✅ Streaming endpoint connected');
          console.log('📋 Response headers:', {
            contentType: response.headers.get('content-type'),
            hasBody: !!response.body
          });

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let lastUpdateTime = 0;
          const UPDATE_INTERVAL = 50; // Update every 50ms (matches backend batching for smooth, natural speed)

          if (!reader) {
            console.error('❌ No reader available from response body');
            console.error('❌ Response details:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              bodyUsed: response.bodyUsed,
              hasBody: !!response.body
            });
            throw new Error('Unable to read streaming response. Server may not be running or endpoint may not support streaming.');
          }

          console.log('📖 Reading stream...');
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('✅ Stream completed');
              isStreamingRef.current = false; // Mark streaming as complete
              
              // Final update with sources and disclaimer (CRITICAL: ensures sources are always displayed)
              setMessages((prev) => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === streamingMsgId);
                if (msgIndex !== -1) {
                  newMessages[msgIndex] = { 
                    ...newMessages[msgIndex], 
                    text: answer,
                    sources: sources, // Add sources to message
                    language: language,
                    confidence: confidence,
                    legal_disclaimer: legal_disclaimer // Add disclaimer only if provided
                  };
                  console.log('✅ Final message updated with sources:', sources.length, 'and disclaimer:', !!legal_disclaimer);
                }
                return newMessages;
              });
              
              // Final smooth scroll to show sources
              setTimeout(() => {
                shouldAutoScroll.current = true;
                smoothScrollToBottom();
              }, 100);
              
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.content) {
                    answer += data.content;
                    
                    // Turn off typing indicator as soon as first text arrives
                    setIsTyping(false);
                    
                    // Throttled updates for smooth typing effect (ChatGPT-style)
                    const now = Date.now();
                    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
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

                  // Store sources - will be displayed after streaming completes
                  if (data.sources) {
                    sources = data.sources;
                    console.log('📚 Legal sources received:', sources.length);
                  }

                  // Store legal disclaimer if provided
                  if (data.type === 'disclaimer' && data.disclaimer) {
                    legal_disclaimer = data.disclaimer;
                    console.log('⚖️ Legal disclaimer received');
                  }

                  if (data.type === 'metadata') {
                    language = data.language;
                  }
                } catch (e) {
                  console.error('❌ Error parsing stream data:', e, 'Line:', line);
                }
              }
            }
          }
        } catch (streamError: any) {
          clearTimeout(timeoutId);
          console.error('❌ Streaming error:', streamError);
          
          // Remove empty streaming message on error
          setMessages((prev) => prev.filter(m => m.id !== streamingMsgId));
          
          if (streamError.name === 'AbortError') {
            throw new Error('Request timed out after 60 seconds. Please try again.');
          }
          throw streamError;
        }
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

      // NOTE: Streaming already adds the message, so we don't need to add it again here
      // This code block is no longer needed since both lawyers and users use streaming
      if (false) { // Disabled - streaming handles message display
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
        
        // Scroll to show lawyer response
        setTimeout(() => {
          shouldAutoScroll.current = true;
          smoothScrollToBottom();
        }, 100);
      }
      // For streaming users, sources are already added in the final update

      console.log("✅ Messages saved to database:", {
        session: sessionId,
        userMsg: userMessageId,
        assistantMsg: assistantMessageId,
      });
    } catch (err: any) {
      console.error("❌ Chat error:", err);
      console.error("   Error type:", err.name);
      console.error("   Error message:", err.message);
      if (err.response) {
        console.error("   Response status:", err.response.status);
        console.error("   Response data:", err.response.data);
      }

      let errorMessage = "Sorry, I encountered an error. Please try again.";

      // Network errors
      if (err.message?.includes('Network') || err.code === 'ECONNABORTED') {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      // Timeout errors
      else if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
        errorMessage = "Request timed out. The server is taking too long to respond. Please try again.";
      }
      // HTTP errors
      else if (err.response?.status === 400) {
        errorMessage =
          err.response.data.detail ||
          "Invalid question. Please rephrase your query.";
      } else if (err.response?.status === 503) {
        errorMessage =
          "The legal knowledge base is not yet initialized. Please contact support.";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again in a moment.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      // Use error message if available
      else if (err.message && !err.message.includes('undefined')) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error("   Showing error to user:", errorMessage);

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
    
    // Don't render empty bot messages (streaming placeholder)
    if (!isUser && !item.text?.trim()) {
      return null;
    }
    
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
              style={[tw`text-base`, { lineHeight: 22, maxWidth: 600 }]}
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
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: Colors.background.primary },
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
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
      <Header 
        title="AI Legal Assistant" 
        showMenu={true}
        showChatHistoryToggle={true}
        isChatHistoryOpen={sidebarRef.current?.isOpen?.() || false}
        onChatHistoryToggle={() => sidebarRef.current?.toggleSidebar?.()}
      />

      {/* Messages list or centered placeholder */}
      <View style={tw`flex-1`}>
        {messages.length === 0 ? (
          isLoadingConversation ? (
            // Show blank screen when loading a conversation from history
            <View style={tw`flex-1`} />
          ) : (
            // Show greeting screen only for new conversations
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
                  tw`text-2xl font-bold text-center mb-2`,
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
          )
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              tw`pt-2`,
              { 
                // Padding based on actual measured UI elements (navbar + input)
                // More accurate than percentage-based calculations
                paddingBottom: getBottomPadding()
              }
            ]}
            showsVerticalScrollIndicator={false}
            onLayout={() => {
              // Initial scroll when conversation loads - scroll to absolute bottom
              if (messages.length > 0 && !isTyping) {
                setTimeout(() => {
                  shouldAutoScroll.current = true;
                  flatRef.current?.scrollToOffset({ offset: 999999, animated: false });
                  setTimeout(() => setIsScrolledToBottom(true), 50);
                }, 50);
              }
            }}
            onContentSizeChange={(width: number, height: number) => {
              // OpenAI-style: Smooth continuous scroll as content grows
              // This is the key - it scrolls automatically as new content appears
              const heightIncreased = height > lastContentHeight.current;
              lastContentHeight.current = height;
              
              if (!isScrolledToBottom) {
                // Initial load: instant scroll to absolute bottom
                shouldAutoScroll.current = true;
                flatRef.current?.scrollToOffset({ offset: 999999, animated: false });
                setTimeout(() => setIsScrolledToBottom(true), 100);
              } else if (heightIncreased && shouldAutoScroll.current) {
                // Content grew: smoothly scroll to show ALL content including sources
                // Using scrollToOffset with large value ensures we reach absolute bottom
                smoothScrollToBottom();
              }
            }}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            onScroll={(event) => {
              // Detect if user manually scrolled up
              // If they did, stop auto-scrolling until new message
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              // More lenient threshold (100px) to account for chat bubble height
              const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
              
              // Only disable auto-scroll if user actively scrolled up (not at bottom)
              if (!isAtBottom && !isStreamingRef.current) {
                shouldAutoScroll.current = false;
              }
            }}
            scrollEventThrottle={16} // 60fps scroll event handling
            style={[tw`flex-1`, { opacity: isScrolledToBottom ? 1 : 0 }]}
            ListFooterComponent={
              <>
                {/* Typing indicator - only show when actively typing */}
                {isTyping && (
        <View style={tw`px-4 py-1.5`}>
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{
          position: 'absolute',
          bottom: getTotalUIHeight(insets.bottom),
          left: 0,
          right: 0,
          zIndex: LAYOUT.Z_INDEX.fixed,
          backgroundColor: '#FFFFFF',
        }}
      >
        <View
          onLayout={(event) => {
            // Measure actual input container height for accurate padding
            const { height } = event.nativeEvent.layout;
            inputContainerHeight.current = height;
          }}
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
    </SafeAreaView>
  );
}
