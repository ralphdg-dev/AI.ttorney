import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView } from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { SidebarProvider, SidebarWrapper } from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import axios from "axios";

const birdLogo = require("../assets/images/logo.png");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  text: string;
  fromUser: boolean;
  sources?: Array<{
    law: string;
    article: string;
    title: string;
    relevance: number;
  }>;
}

export default function ChatbotScreen() {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "1", 
      text: "Kumusta! I'm Ai.ttorney, your legal assistant. Ask me anything about Philippine law in English or Filipino. 🇵🇭", 
      fromUser: false 
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
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
      // Call chatbot API
      const response = await axios.post(`${API_URL}/api/chatbot/chat`, {
        message: userMessage,
        conversation_history: conversationHistory
      });

      const { response: botResponse, sources, language } = response.data;

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: botResponse }
      ]);

      // Add bot reply with sources
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        fromUser: false,
        sources: sources
      };
      
      setMessages((prev) => [...prev, reply]);
      
    } catch (err: any) {
      console.error("Chat error:", err);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      if (err.response?.status === 503) {
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
            <Text
              style={[
                tw`text-base`,
                isUser ? tw`text-white` : tw`text-gray-800`,
              ]}
            >
              {item.text}
            </Text>
            
            {/* Show sources for bot messages */}
            {!isUser && item.sources && item.sources.length > 0 && (
              <View style={tw`mt-2 pt-2 border-t border-gray-300`}>
                <Text style={tw`text-xs text-gray-600 font-semibold mb-1`}>Sources:</Text>
                {item.sources.map((source, idx) => (
                  <Text key={idx} style={tw`text-xs text-gray-600`}>
                    • {source.law} - Article {source.article}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };


  if (showIntro) {
    return (
      <SidebarProvider>
        <View style={tw`flex-1 bg-white`}>
          <Header
            title="AI.ttorney"
            showMenu={true}
          />

          <View style={tw`flex-1 justify-center items-center px-6`}>
            <Image
              source={birdLogo}
              style={tw`w-32 h-32 mb-3`}
              resizeMode="contain"
            />
            <Text
              style={[
                tw`text-center text-lg font-bold mb-6`,
                { color: Colors.text.head },
              ]}
            >
              May tanong sa batas? &apos;Wag mag-alala, AI got you!{"\n"}Ask in English or Filipino - I understand both!
            </Text>

            <TouchableOpacity
              style={[
                tw`flex-row items-center px-6 py-3 rounded-full`,
                { backgroundColor: Colors.primary.blue },
              ]}
              onPress={() => setShowIntro(false)}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="white"
                style={tw`mr-2`}
              />
              <Text style={tw`text-white font-semibold text-base`}>
                Chat with Ai.ttorney
              </Text>
            </TouchableOpacity>
          </View>
          <Navbar activeTab="ask" />
          <SidebarWrapper />
        </View>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}

