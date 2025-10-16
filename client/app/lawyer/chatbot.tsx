import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert, ScrollView } from "react-native";
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import LawyerNavbar from "../../components/lawyer/LawyerNavbar";
import { LawyerChatbotService, LawyerChatMessage, LawyerChatResponse } from '../../services/lawyerChatbotService';
import { useAuth } from '../../contexts/AuthContext';

// Replace with your lawyer-specific logo if needed
const lawyerLogo = require("../../assets/images/logo.png");

export default function LawyerChatbotScreen() {
  const { session } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<LawyerChatMessage[]>([
    { 
      id: "1", 
      text: "Hello! I'm your AI Legal Assistant, specifically designed for lawyers. I can help you with legal research, case analysis, procedural questions, and professional guidance. How can I assist you today?", 
      fromUser: false,
      timestamp: new Date()
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastResponse, setLastResponse] = useState<LawyerChatResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);


  const sendMessage = async () => {
    if (!input.trim()) return;

    // Validate question
    const validation = LawyerChatbotService.validateQuestion(input.trim());
    if (!validation.isValid) {
      Alert.alert('Invalid Question', validation.error);
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
      // Create request with conversation history
      const request = LawyerChatbotService.createDefaultRequest(currentInput, messages);
      
      // Call the API
      const result = await LawyerChatbotService.askQuestion(request, session);
      
      if (result.success && result.data) {
        const response = result.data;
        setLastResponse(response);
        
        // Create bot reply message
        const botReply: LawyerChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.answer,
          fromUser: false,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, botReply]);
      } else {
        // Handle API error
        const errorMessage: LawyerChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `I apologize, but I encountered an error: ${result.error || 'Unable to process your question at this time.'}. Please try again or contact support if the issue persists.`,
          fromUser: false,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage: LawyerChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an unexpected error. Please check your connection and try again.',
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
    const isLastBotMessage = !isUser && item.id === messages[messages.length - 1]?.id;
    
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
            
            {/* Show confidence and details button for last bot response */}
            {isLastBotMessage && lastResponse && (
              <View style={tw`mt-2 pt-2 border-t border-gray-300`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-row items-center`}>
                    <View 
                      style={[
                        tw`px-2 py-1 rounded-full`,
                        { backgroundColor: LawyerChatbotService.getConfidenceDisplay(lastResponse.confidence).color }
                      ]}
                    >
                      <Text style={tw`text-xs text-white font-semibold`}>
                        {LawyerChatbotService.getConfidenceDisplay(lastResponse.confidence).text}
                      </Text>
                    </View>
                    <Text style={tw`text-xs text-gray-600 ml-2`}>
                      {lastResponse.sources.length} sources
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => setShowDetails(!showDetails)}
                    style={tw`flex-row items-center`}
                  >
                    <Text style={tw`text-xs text-blue-600 mr-1`}>Details</Text>
                    <Ionicons 
                      name={showDetails ? "chevron-up" : "chevron-down"} 
                      size={12} 
                      color={Colors.primary.blue} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (showIntro) {
    return (
        <View style={tw`flex-1 bg-white`}>
          <Header
            title="AI Legal Assistant"
            showMenu={true}
          />

          <View style={tw`flex-1 justify-center items-center px-6`}>
            <Image
              source={lawyerLogo}
              style={tw`w-32 h-32 mb-3`}
              resizeMode="contain"
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
            </TouchableOpacity>
          </View>
          <LawyerNavbar activeTab="chatbot" />
        </View>
    );
  }

  return (
      <View style={tw`flex-1 bg-white`}>
        <Header
          title="Legal Assistant"
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

        {/* Legal Analysis Details Panel */}
        {showDetails && lastResponse && (
          <View style={tw`mx-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200`}>
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={tw`text-sm font-semibold text-blue-800 mb-2`}>Legal Analysis Details</Text>
              
              {/* Confidence and Language */}
              <View style={tw`flex-row justify-between mb-3`}>
                <Text style={tw`text-xs text-gray-600`}>
                  Language: {lastResponse.language.charAt(0).toUpperCase() + lastResponse.language.slice(1)}
                </Text>
                <Text style={tw`text-xs text-gray-600`}>
                  Confidence: {lastResponse.confidence.toUpperCase()}
                </Text>
              </View>

              {/* Legal Analysis */}
              {lastResponse.legal_analysis && (
                <View style={tw`mb-3`}>
                  <Text style={tw`text-xs font-semibold text-gray-700 mb-1`}>Key Legal Analysis:</Text>
                  <Text style={tw`text-xs text-gray-600`}>{lastResponse.legal_analysis}</Text>
                </View>
              )}

              {/* Related Provisions */}
              {lastResponse.related_provisions && lastResponse.related_provisions.length > 0 && (
                <View style={tw`mb-3`}>
                  <Text style={tw`text-xs font-semibold text-gray-700 mb-1`}>Related Provisions:</Text>
                  {lastResponse.related_provisions.map((provision, index) => (
                    <Text key={index} style={tw`text-xs text-gray-600 mb-1`}>• {provision}</Text>
                  ))}
                </View>
              )}

              {/* Case Law References */}
              {lastResponse.case_law_references && lastResponse.case_law_references.length > 0 && (
                <View style={tw`mb-3`}>
                  <Text style={tw`text-xs font-semibold text-gray-700 mb-1`}>Case Law References:</Text>
                  {lastResponse.case_law_references.map((caseRef, index) => (
                    <Text key={index} style={tw`text-xs text-gray-600 mb-1`}>• {caseRef}</Text>
                  ))}
                </View>
              )}

              {/* Sources */}
              <View>
                <Text style={tw`text-xs font-semibold text-gray-700 mb-1`}>Sources ({lastResponse.sources.length}):</Text>
                {lastResponse.sources.map((source, index) => (
                  <View key={index} style={tw`mb-2 p-2 bg-white rounded border border-gray-200`}>
                    <Text style={tw`text-xs font-semibold text-gray-800`}>
                      {source.law} - Article {source.article_number}
                    </Text>
                    {source.article_title && (
                      <Text style={tw`text-xs text-gray-600 mb-1`}>{source.article_title}</Text>
                    )}
                    <Text style={tw`text-xs text-gray-600`}>{source.text_preview}</Text>
                    <Text style={tw`text-xs text-blue-600 mt-1`}>
                      Relevance: {Math.round(source.relevance_score * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <View style={tw`px-4 pb-2`}>
            <View style={tw`items-start`}>
              <View style={tw`p-3 rounded-2xl bg-gray-100 flex-row items-center`}>
                <Text style={tw`text-sm text-gray-600 mr-2`}>AI is analyzing...</Text>
                <View style={tw`flex-row`}>
                  <View style={[tw`w-2 h-2 bg-gray-400 rounded-full mr-1`, { opacity: 0.4 }]} />
                  <View style={[tw`w-2 h-2 bg-gray-400 rounded-full mr-1`, { opacity: 0.6 }]} />
                  <View style={[tw`w-2 h-2 bg-gray-400 rounded-full`, { opacity: 0.8 }]} />
                </View>
              </View>
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

            <TouchableOpacity
              onPress={sendMessage}
              style={[tw`p-2 rounded-full`, { backgroundColor: Colors.primary.blue }]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        <LawyerNavbar activeTab="chatbot" />
      </View>
  );
}
