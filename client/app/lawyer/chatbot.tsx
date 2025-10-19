import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { LawyerNavbar } from '../../components/lawyer/shared';
import { SidebarWrapper } from "../../components/AppSidebar";
import {
  LawyerChatbotService,
  LawyerChatMessage,
  LawyerChatResponse,
} from "../../services/lawyerChatbotService";
import { useAuth } from "../../contexts/AuthContext";

// Replace with your lawyer-specific logo if needed
const lawyerLogo = require("../../assets/images/logo.png");

// Markdown-like parser to style text: ###, **bold**, [link](url)
const renderFormattedText = (text: string) => {
  const parts: { type: string; content: string; url?: string }[] = [];
  const regex = /(###\s?([^\n]+))|(\*\*([^\*]+)\*\*)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // ### Header
      parts.push({ type: "header", content: match[2].trim() });
    } else if (match[3]) {
      // **Bold**
      parts.push({ type: "bold", content: match[4] });
    } else if (match[5] && match[6]) {
      // [text](url)
      parts.push({ type: "link", content: match[6], url: match[6] }); // show only the URL, clickable
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.substring(lastIndex) });
  }

  return parts.map((part, index) => {
    switch (part.type) {
      case "header":
        return (
          <Text key={index} style={[tw`font-bold text-lg text-gray-900`]}>
            {part.content}
          </Text>
        );
      case "bold":
        return (
          <Text key={index} style={[tw`font-semibold text-gray-800`]}>
            {part.content}
          </Text>
        );
      case "link":
        return (
          <Text
            key={index}
            style={[tw`underline`]}
            onPress={() => Linking.openURL(part.url!)}
          >
            {part.content}
          </Text>
        );
      default:
        return (
          <Text key={index} style={tw`text-gray-800`}>
            {part.content}
          </Text>
        );
    }
  });
};

export default function LawyerChatbotScreen() {
  const { session } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<LawyerChatMessage[]>([
    {
      id: "1",
      text: "Hello Pañero! I'm your Ai.ttorney, your AI Legal Assistant, specifically designed for lawyers like you. How can I assist you today?",
      fromUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastResponse, setLastResponse] = useState<LawyerChatResponse | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const validation = LawyerChatbotService.validateQuestion(input.trim());
    if (!validation.isValid) {
      Alert.alert("Invalid Question", validation.error);
      return;
    }

    const userMessage: LawyerChatMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      fromUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsTyping(true);

    try {
      const request = LawyerChatbotService.createDefaultRequest(
        currentInput,
        messages
      );
      const result = await LawyerChatbotService.askQuestion(request, session);

      if (result.success && result.data) {
        const response = result.data;
        setLastResponse(response);

        const botReply: LawyerChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.answer,
          fromUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botReply]);
      } else {
        const errorMessage: LawyerChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `I apologize, but I encountered an error: ${
            result.error || "Unable to process your question at this time."
          }. Please try again or contact support if the issue persists.`,
          fromUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: LawyerChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an unexpected error. Please check your connection and try again.",
        fromUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderItem = ({ item }: { item: LawyerChatMessage }) => {
    const isUser = item.fromUser;
    return (
      <View style={tw`px-3 py-2`}>
        <View style={isUser ? tw`items-end` : tw`items-start`}>
          <View
            style={[
              tw`max-w-4/5 rounded-2xl`,
              isUser
                ? { backgroundColor: Colors.primary.blue, paddingHorizontal: 14, paddingVertical: 10 }
                : { backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 10 },
            ]}
          >
            {isUser ? (
              <Text
                style={[
                  tw`text-base`,
                  { color: "white", flexWrap: "wrap" }, // ✅ wrap text properly
                ]}
              >
                {item.text}
              </Text>
            ) : (
              <Text
                style={[
                  tw`text-base text-gray-800`,
                  { flexWrap: "wrap" }, // ✅ prevent overflow for links
                ]}
              >
                {renderFormattedText(item.text)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (showIntro) {
    return (
        <SafeAreaView style={tw`flex-1 bg-white`} edges={['top', 'left', 'right']}>
          <Header
            title="AI Legal Assistant"
            showMenu={true}
          />
          <Text
            style={[
              tw`text-center text-lg font-bold mb-6`,
              { color: Colors.text.head },
            ]}
          >
            Need legal guidance? Your AI Legal Assistant is here to help!
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
              Chat with Legal Assistant
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
                Chat with Legal Assistant
              </Text>
            </TouchableOpacity>
          </View>
          <LawyerNavbar activeTab="chatbot" />
          <SidebarWrapper />
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={['top', 'left', 'right']}>
        <Header
          title="Legal Assistant"
          showMenu={true}
        />

      {isTyping && (
        <View style={tw`px-4 pb-2`}>
          <View style={tw`items-start`}>
            <View style={tw`p-3 rounded-2xl bg-gray-100 flex-row items-center`}>
              <Text style={tw`text-sm text-gray-600 mr-2`}>
                Ai.ttorney is typing...
              </Text>
              <View style={tw`flex-row`}>
                <View
                  style={[
                    tw`w-2 h-2 bg-gray-400 rounded-full mr-1`,
                    { opacity: 0.4 },
                  ]}
                />
                <View
                  style={[
                    tw`w-2 h-2 bg-gray-400 rounded-full mr-1`,
                    { opacity: 0.6 },
                  ]}
                />
                <View
                  style={[
                    tw`w-2 h-2 bg-gray-400 rounded-full`,
                    { opacity: 0.8 },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      )}

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
              placeholder="Ask a professional legal question..."
              placeholderTextColor="#9CA3AF"
              style={[
                tw`border border-gray-200 rounded-full px-4 pt-4`,
                { color: Colors.text.head },
              ]}
              multiline
              maxLength={2000}
            />
            {input.length > 0 && (
              <Text style={tw`text-xs text-gray-500 mt-1 ml-4`}>
                {input.length}/2000 characters
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
        <LawyerNavbar activeTab="chatbot" />
        <SidebarWrapper />
      </SafeAreaView>
  );
}
