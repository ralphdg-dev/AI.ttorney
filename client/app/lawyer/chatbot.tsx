import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from "react-native";
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import LawyerNavbar from "../../components/lawyer/LawyerNavbar";
import { SidebarWrapper } from "../../components/AppSidebar";

// Replace with your lawyer-specific logo if needed
const lawyerLogo = require("../../assets/images/logo.png");

export default function LawyerChatbotScreen() {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState([
    { id: "1", text: "Hello! I'm your AI Legal Assistant, specifically designed for lawyers. I can help you with legal research, case analysis, procedural questions, and professional guidance. How can I assist you today?", fromUser: false },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);


  const simulateLawyerResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Lawyer-specific responses
    if (lowerMessage.includes('precedent') || lowerMessage.includes('case law')) {
      return 'For legal precedent analysis, I recommend checking recent Supreme Court decisions and Court of Appeals rulings. Would you like me to help you identify key cases related to your specific legal issue?';
    }
    
    if (lowerMessage.includes('contract') || lowerMessage.includes('agreement')) {
      return 'When drafting contracts, ensure you include: 1) Clear identification of parties, 2) Specific terms and conditions, 3) Consideration clauses, 4) Termination provisions, 5) Dispute resolution mechanisms. What type of contract are you working on?';
    }
    
    if (lowerMessage.includes('court') || lowerMessage.includes('procedure') || lowerMessage.includes('filing')) {
      return 'Court procedures vary by jurisdiction and case type. For Philippine courts, ensure you follow the Rules of Court. Key considerations include: proper venue, jurisdiction, filing deadlines, and required documentation.';
    }
    
    if (lowerMessage.includes('client') || lowerMessage.includes('consultation')) {
      return 'For effective client consultations: 1) Prepare thoroughly by reviewing case materials, 2) Listen actively to client concerns, 3) Explain legal options clearly, 4) Document all discussions, 5) Set clear expectations about outcomes and fees.';
    }
    
    if (lowerMessage.includes('research') || lowerMessage.includes('law')) {
      return 'Legal research best practices: 1) Start with primary sources (statutes, regulations, case law), 2) Use reliable legal databases, 3) Check for recent updates and amendments, 4) Cross-reference multiple sources, 5) Document your research trail.';
    }
    
    if (lowerMessage.includes('ethics') || lowerMessage.includes('professional')) {
      return 'Professional ethics are crucial in legal practice. Key principles include: client confidentiality, conflict of interest avoidance, competent representation, and honest communication. Always consult the Code of Professional Responsibility and IBP guidelines.';
    }
    
    // Default professional response
    return 'I can help with legal research, case analysis, procedural questions, and professional guidance. Could you provide more specific details about your legal question?';
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      text: input.trim(),
      fromUser: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    // Simulated bot reply with lawyer-specific responses
    setTimeout(() => {
      const reply = {
        id: (Date.now() + 1).toString(),
        text: simulateLawyerResponse(input.trim()),
        fromUser: false,
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 900);
  };

  const renderItem = ({ item }: { item: { id: string; text: string; fromUser: boolean } }) => {
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
          <SidebarWrapper />
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

        {/* Typing indicator */}
        {isTyping && (
          <View style={tw`px-4 pb-2`}>
            <View style={tw`items-start`}>
              <View style={tw`p-3 rounded-2xl bg-gray-100`}>
                <Text style={tw`text-sm text-gray-600`}>Typing...</Text>
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
                placeholder="Ask a legal question"
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
              style={[tw`p-2 rounded-full`, { backgroundColor: Colors.primary.blue }]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        <LawyerNavbar activeTab="chatbot" />
        <SidebarWrapper />
      </View>
  );
}
