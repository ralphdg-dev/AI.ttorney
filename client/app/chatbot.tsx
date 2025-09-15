import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { SidebarProvider, SidebarWrapper } from "../components/AppSidebar";
import Navbar from "../components/Navbar";
// Replace with your bird logo after upload
const birdLogo = require("../assets/images/logo.png");

export default function ChatbotScreen() {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState([
    { id: "1", text: "Hello, how can I help you today?", fromUser: false },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

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

    // Simulated bot reply, replace with API call
    setTimeout(() => {
      const reply = {
        id: (Date.now() + 1).toString(),
        text: "Got it. I will fetch that for you.",
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
              May tanong sa batas? &apos;Wag mag-alala, AI got you!
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
              style={tw`p-2 bg-blue-900 rounded-full`}
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

