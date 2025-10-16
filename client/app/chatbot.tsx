import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking, ScrollView } from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { SidebarWrapper } from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const birdLogo = require("../assets/images/logo.png");
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
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "1", 
      text: "May tanong tungkol sa batas? AI got you!", 
      fromUser: false 
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<{role: string, content: string}[]>([]);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

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

      // Call enhanced chatbot API
      const response = await axios.post(endpoint, {
        question: userMessage,
        conversation_history: formattedHistory,
        max_tokens: 1200,
        user_id: user?.id || null
      });

      const { 
        answer, 
        sources, 
        confidence, 
        language, 
        simplified_summary,
        legal_disclaimer,
        fallback_suggestions,
        normalized_query,
        is_complex_query
      } = response.data;

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: answer }
      ]);

      // Add bot reply with all enhanced data
      const reply: Message = {
        id: (Date.now() + 1).toString(),
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
        <View style={isUser ? tw`items-end` : tw`items-start`}>
          <View
            style={[
              tw`max-w-4/5 p-3 rounded-2xl`,
              isUser
                ? { backgroundColor: Colors.primary.blue }
                : { backgroundColor: "#F3F4F6" },
            ]}
          >
            {/* Normalized query indicator */}
            {!isUser && item.normalized_query && (
              <View style={tw`mb-2 p-2 bg-blue-50 rounded-lg`}>
                <Text style={tw`text-xs text-blue-600`}>
                  📝 Understood as: {item.normalized_query}
                </Text>
              </View>
            )}

            {/* Main answer */}
            <Text
              style={[
                tw`text-base`,
                isUser ? tw`text-white` : tw`text-gray-800`,
              ]}
            >
              {item.text}
            </Text>
            {!isUser && item.confidence && (
              <View style={tw`mt-2`}>
                <Text style={tw`text-xs text-gray-500`}>
                  {item.confidence === 'high' && '✅ High confidence'}
                  {item.confidence === 'medium' && '⚠️ Medium confidence'}
                  {item.confidence === 'low' && '❓ Low confidence - consider consulting a lawyer'}
                </Text>
              </View>
            )}
            
            {/* Show sources with URLs */}
            {!isUser && item.sources && item.sources.length > 0 && (
              <View style={tw`mt-3 pt-2 border-t border-gray-300`}>
                <Text style={tw`text-xs text-gray-700 font-semibold mb-2`}>📚 Sources:</Text>
                {item.sources.map((source, idx) => (
                  <View key={idx} style={tw`mb-2`}>
                    <Text style={tw`text-xs text-gray-700 font-medium`}>
                      • {source.law} - Art. {source.article_number}
                    </Text>
                    {source.article_title && (
                      <Text style={tw`text-xs text-gray-600 ml-3`}>
                        {source.article_title}
                      </Text>
                    )}
                    {source.source_url && (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(source.source_url!)}
                        style={tw`ml-3 mt-1`}
                      >
                        <Text style={tw`text-xs text-blue-600 underline`}>
                          🔗 View source
                        </Text>
                      </TouchableOpacity>
                    )}
                    <Text style={tw`text-xs text-gray-500 ml-3`}>
                      Relevance: {(source.relevance_score * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Legal disclaimer */}
            {!isUser && item.legal_disclaimer && (
              <View style={tw`mt-3 pt-2 border-t border-gray-300`}>
                <Text style={tw`text-xs text-gray-600 italic`}>
                  {item.legal_disclaimer}
                </Text>
              </View>
            )}

            {/* Fallback suggestions for complex queries */}
            {!isUser && item.fallback_suggestions && item.fallback_suggestions.length > 0 && (
              <View style={tw`mt-3 pt-2 border-t border-yellow-300 bg-yellow-50 p-2 rounded-lg`}>
                <Text style={tw`text-xs text-yellow-800 font-semibold mb-2`}>
                  💡 Recommended Next Steps:
                </Text>
                {item.fallback_suggestions.map((suggestion, idx) => (
                  <View key={idx} style={tw`mb-2`}>
                    <Text style={tw`text-xs text-yellow-800 font-medium`}>
                      {suggestion.description}
                    </Text>
                    <Text style={tw`text-xs text-yellow-700 ml-2`}>
                      {suggestion.reason}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Language indicator */}
            {!isUser && item.language && (
              <View style={tw`mt-2`}>
                <Text style={tw`text-xs text-gray-400`}>
                  Language: {item.language}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };


  return (
      <View style={tw`flex-1 bg-white`}>
        {/* ✅ Header on Chat screen */}
        <Header
          title="Chat"
          showMenu={true}
        />

        {/* Messages list */}
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={tw`px-4 pb-2`}>
            <View style={tw`items-start`}>
              <View style={tw`p-3 rounded-2xl bg-gray-100 flex-row items-center`}>
                <ActivityIndicator size="small" color={Colors.primary.blue} style={tw`mr-2`} />
                <Text style={tw`text-sm text-gray-600`}>Thinking...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={tw`px-4 pb-2`}>
            <View style={[tw`p-3 rounded-lg`, { backgroundColor: "#FEE2E2" }]}>
              <Text style={tw`text-sm text-red-600`}>{error}</Text>
            </View>
          </View>
        )}

        {/* Composer */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ marginBottom: 80 }}
        >
          <View
            style={tw`flex-row items-center px-4 pt-4 border-t border-gray-200 bg-white`}
          >
            <TouchableOpacity style={tw`p-2`}>
              <Ionicons name="add" size={22} color={Colors.primary.blue} />
            </TouchableOpacity>

            <View style={tw`flex-1 ml-2 mr-2`}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message"
                placeholderTextColor="#9CA3AF"
                style={[
                  tw`border border-gray-200 rounded-full px-4 pt-4`,
                  { color: Colors.text.head },
                ]}
                multiline
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={isTyping || !input.trim()}
              style={[
                tw`p-2 rounded-full`,
                { backgroundColor: (isTyping || !input.trim()) ? "#9CA3AF" : Colors.primary.blue }
              ]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        <Navbar activeTab="ask" />
        <SidebarWrapper />
      </View>
  );
}
