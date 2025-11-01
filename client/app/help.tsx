import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Colors from "../constants/Colors";
import Header from "@/components/Header";

const { width, height } = Dimensions.get("window");

// Skeleton Loading Component
const SkeletonLoader = () => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={tw`px-6`}>
      <Animated.View
        style={[tw`h-12 bg-gray-200 rounded-xl mb-6`, { opacity }]}
      />
      <Animated.View
        style={[tw`h-5 w-48 bg-gray-200 rounded mb-3`, { opacity }]}
      />
      {[1, 2, 3, 4].map((item) => (
        <Animated.View
          key={item}
          style={[
            tw`mb-3 border rounded-xl p-4`,
            { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", opacity },
          ]}
        >
          <View style={tw`h-5 bg-gray-200 rounded w-3/4 mb-2`} />
          <View style={tw`h-4 bg-gray-200 rounded w-1/2`} />
        </Animated.View>
      ))}
      <Animated.View
        style={[tw`h-5 w-32 bg-gray-200 rounded mt-8 mb-3`, { opacity }]}
      />
      <View style={tw`flex-row justify-between`}>
        {[1, 2].map((item) => (
          <Animated.View
            key={item}
            style={[
              tw`flex-1 p-4 rounded-xl border mx-1`,
              { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", opacity },
            ]}
          >
            <View
              style={tw`w-10 h-10 bg-gray-200 rounded-full self-center mb-2`}
            />
            <View style={tw`h-4 bg-gray-200 rounded w-24 self-center mb-1`} />
            <View style={tw`h-3 bg-gray-200 rounded w-32 self-center`} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

export default function HelpAndSupport() {
  const [search, setSearch] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Email form states
  const [emailName, setEmailName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Fade animation for modal
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showEmailForm) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showEmailForm]);

  const faqs = [
    {
      question: "How do I reset my password?",
      answer:
        "Go to the login screen and tap 'Forgot password'. Follow the steps to receive a reset link in your email.",
    },
    {
      question: "Can I use the app as a guest?",
      answer:
        "Yes! Guests can ask up to 15 legal questions through the chatbot and browse the legal glossary. To access the full Legal Aid Directory, Community Forum, and save your history, you'll need to create an account.",
    },
    {
      question: "What legal topics does Ai.ttorney cover?",
      answer:
        "The platform focuses on five key areas: Family Law, Civil Law, Criminal Law, Labor Law, and Consumer Law.",
    },
    {
      question: "Is the chatbot's advice legally binding?",
      answer:
        "No. The chatbot provides educational information based on Philippine law, but it does not constitute legal advice or create a lawyer-client relationship.",
    },
    {
      question: "How do I find a lawyer near me?",
      answer:
        "Go to the Legal Aid Directory and use the filters to search by location, specialization, and consultation mode.",
    },
    {
      question: "How does lawyer verification work?",
      answer:
        "All lawyers are verified through the Supreme Court Roll of Attorneys or IBP QR code validation.",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const filteredFaqs = faqs.filter((item) =>
    item.question.toLowerCase().includes(search.toLowerCase())
  );

  const handleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleEmailSupport = () => setShowEmailForm(true);

  const handleCloseEmailForm = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowEmailForm(false);
      setEmailName("");
      setEmailAddress("");
      setEmailSubject("");
      setEmailMessage("");
    });
  };

  const handleSendEmail = () => {
    if (
      !emailName.trim() ||
      !emailAddress.trim() ||
      !emailSubject.trim() ||
      !emailMessage.trim()
    ) {
      Alert.alert(
        "Missing Information",
        "Please fill in all fields before sending."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(
      `Name: ${emailName}\nEmail: ${emailAddress}\n\nMessage:\n${emailMessage}`
    );

    Linking.openURL(
      `mailto:support@example.com?subject=${subject}&body=${body}`
    );

    Alert.alert(
      "Success",
      "Your email client will open. Please send the email to complete your request."
    );
    handleCloseEmailForm();
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+123456789");
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Header
          title="Help & Support"
          showBackButton={true}
          showMenu={false}
          onBackPress={() => router.back()}
        />

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-12`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* Search Bar */}
              <View style={tw`px-6 mt-2 mb-4`}>
                <View
                  style={tw`flex-row items-center bg-gray-100 rounded-xl px-4 py-3`}
                >
                  <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    placeholder="Search FAQs..."
                    placeholderTextColor="#9CA3AF"
                    style={tw`ml-2 flex-1 text-base text-gray-700`}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* FAQ Section */}
              <View style={tw`px-6`}>
                <Text
                  style={[
                    tw`text-base font-semibold mb-3`,
                    { color: Colors.text.head },
                  ]}
                >
                  Frequently Asked Questions
                </Text>

                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        tw`mb-3 border rounded-xl p-4`,
                        {
                          borderColor:
                            expandedIndex === index
                              ? Colors.primary.blue
                              : "#E5E7EB",
                          backgroundColor: "#F9FAFB",
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleExpand(index)}
                        style={tw`flex-row justify-between items-center`}
                      >
                        <Text
                          style={[
                            tw`text-base font-semibold flex-1 pr-4`,
                            { color: Colors.text.head },
                          ]}
                        >
                          {item.question}
                        </Text>
                        <Ionicons
                          name={
                            expandedIndex === index
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color={Colors.primary.blue}
                        />
                      </TouchableOpacity>
                      {expandedIndex === index && (
                        <Text
                          style={[
                            tw`mt-3 text-sm leading-5`,
                            { color: Colors.text.sub },
                          ]}
                        >
                          {item.answer}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={tw`items-center py-8`}>
                    <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                    <Text style={[tw`text-sm text-gray-500 mt-3`]}>
                      No results found for &quot;{search}&quot;
                    </Text>
                  </View>
                )}
              </View>

              {/* Contact Support */}
              <View style={tw`px-6 mt-8`}>
                <Text
                  style={[
                    tw`text-base font-semibold mb-3`,
                    { color: Colors.text.head },
                  ]}
                >
                  Contact Us
                </Text>

                <View style={tw`flex-row justify-between`}>
                  <TouchableOpacity
                    style={[
                      tw`flex-1 items-center p-4 mr-2 rounded-xl border`,
                      {
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F9FAFB",
                      },
                    ]}
                    onPress={handleEmailSupport}
                  >
                    <View
                      style={[
                        tw`w-12 h-12 rounded-full items-center justify-center`,
                        { backgroundColor: Colors.primary.blue + "15" },
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={24}
                        color={Colors.primary.blue}
                      />
                    </View>
                    <Text
                      style={[
                        tw`text-sm mt-2 font-semibold`,
                        { color: Colors.text.head },
                      ]}
                    >
                      Email Support
                    </Text>
                    <Text
                      style={[tw`text-xs mt-1`, { color: Colors.text.sub }]}
                    >
                      support@example.com
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      tw`flex-1 items-center p-4 ml-2 rounded-xl border`,
                      {
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F9FAFB",
                      },
                    ]}
                    onPress={handleCallSupport}
                  >
                    <View
                      style={[
                        tw`w-12 h-12 rounded-full items-center justify-center`,
                        { backgroundColor: Colors.primary.blue + "15" },
                      ]}
                    >
                      <Ionicons
                        name="call-outline"
                        size={24}
                        color={Colors.primary.blue}
                      />
                    </View>
                    <Text
                      style={[
                        tw`text-sm mt-2 font-semibold`,
                        { color: Colors.text.head },
                      ]}
                    >
                      Call Us
                    </Text>
                    <Text
                      style={[tw`text-xs mt-1`, { color: Colors.text.sub }]}
                    >
                      +1 234 567 89
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Responsive Email Form Modal */}
      {showEmailForm && (
        <Modal
          visible={showEmailForm}
          transparent={true}
          animationType="none"
          onRequestClose={handleCloseEmailForm}
        >
          <Animated.View
            style={[
              tw`flex-1 bg-black bg-opacity-50 justify-center items-center`,
              { opacity: fadeAnim },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={[
                tw`bg-white rounded-2xl p-6`,
                {
                  width: Math.min(width * 0.9, 600),
                  maxHeight: height * 0.85,
                },
              ]}
            >
              {/* Header */}
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <Text
                  style={[tw`text-xl font-bold`, { color: Colors.text.head }]}
                >
                  Contact Support
                </Text>
                <TouchableOpacity onPress={handleCloseEmailForm}>
                  <Ionicons name="close" size={28} color={Colors.text.head} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-4`}
              >
                {/* Name Input */}
                <View style={tw`mb-4`}>
                  <Text
                    style={[
                      tw`text-sm font-semibold mb-2`,
                      { color: Colors.text.head },
                    ]}
                  >
                    Your Name
                  </Text>
                  <TextInput
                    style={[
                      tw`border rounded-xl px-4 py-3 text-base`,
                      { borderColor: "#E5E7EB", color: Colors.text.head },
                    ]}
                    placeholder="Enter your name"
                    placeholderTextColor="#9CA3AF"
                    value={emailName}
                    onChangeText={setEmailName}
                  />
                </View>

                {/* Email Input */}
                <View style={tw`mb-4`}>
                  <Text
                    style={[
                      tw`text-sm font-semibold mb-2`,
                      { color: Colors.text.head },
                    ]}
                  >
                    Your Email
                  </Text>
                  <TextInput
                    style={[
                      tw`border rounded-xl px-4 py-3 text-base`,
                      { borderColor: "#E5E7EB", color: Colors.text.head },
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Subject Input */}
                <View style={tw`mb-4`}>
                  <Text
                    style={[
                      tw`text-sm font-semibold mb-2`,
                      { color: Colors.text.head },
                    ]}
                  >
                    Subject
                  </Text>
                  <TextInput
                    style={[
                      tw`border rounded-xl px-4 py-3 text-base`,
                      { borderColor: "#E5E7EB", color: Colors.text.head },
                    ]}
                    placeholder="Brief description of your issue"
                    placeholderTextColor="#9CA3AF"
                    value={emailSubject}
                    onChangeText={setEmailSubject}
                  />
                </View>

                {/* Message Input */}
                <View style={tw`mb-4`}>
                  <Text
                    style={[
                      tw`text-sm font-semibold mb-2`,
                      { color: Colors.text.head },
                    ]}
                  >
                    Message
                  </Text>
                  <TextInput
                    style={[
                      tw`border rounded-xl px-4 py-3 text-base`,
                      {
                        borderColor: "#E5E7EB",
                        color: Colors.text.head,
                        minHeight: 120,
                        textAlignVertical: "top",
                      },
                    ]}
                    placeholder="Describe your issue or question in detail"
                    placeholderTextColor="#9CA3AF"
                    value={emailMessage}
                    onChangeText={setEmailMessage}
                    multiline
                    numberOfLines={5}
                  />
                </View>

                {/* Buttons */}
                <View style={tw`flex-row justify-between mt-4 mb-2`}>
                  <TouchableOpacity
                    style={[
                      tw`flex-1 py-3 rounded-xl mr-2 border`,
                      { borderColor: Colors.primary.blue },
                    ]}
                    onPress={handleCloseEmailForm}
                  >
                    <Text
                      style={[
                        tw`text-center font-semibold`,
                        { color: Colors.primary.blue },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      tw`flex-1 py-3 rounded-xl ml-2`,
                      { backgroundColor: Colors.primary.blue },
                    ]}
                    onPress={handleSendEmail}
                  >
                    <Text style={tw`text-center text-white font-semibold`}>
                      Send Email
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}
