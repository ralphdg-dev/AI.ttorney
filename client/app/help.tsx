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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Colors from "../constants/Colors";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { SidebarWrapper } from "@/components/AppSidebar";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";

const { width, height } = Dimensions.get("window");

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
    </View>
  );
};

export default function HelpAndSupport() {
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showEmailSentModal, setShowEmailSentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [visibleFaqCount, setVisibleFaqCount] = useState(5);

  const [emailName, setEmailName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

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
      question: "What is Ai.ttorney?",
      answer:
        "Ai.ttorney is a legal help app for the Philippines. It offers an AI legal assistant, curated guides and glossary, a community forum, verified-lawyer directory, consultations, and notifications for important updates.",
    },
    {
      question: "What can I do without an account (Guest Mode)?",
      answer:
        "You can chat with the legal assistant (limited questions), browse legal guides and the glossary. To post in the forum, bookmark items, or book consultations, create a free account.",
    },
    {
      question: "How do I search guides and posts effectively?",
      answer:
        "Use quotes for exact phrases (e.g., \"child custody\") or prefix with '=' for whole-word matches (e.g., =appeal). You can also toggle category chips like Family, Work, Civil, Criminal, Consumer to narrow results.",
    },
    {
      question: "How do category chips work in search?",
      answer:
        "When a category chip is active, results must match BOTH your text and the selected category. You can also search like: Test #consumer.",
    },
    {
      question: "How do I view newly published articles from notifications?",
      answer:
        "Tap the article notification to open the article directly. These appear under Notifications with a bell icon.",
    },
    {
      question: "How do I report inappropriate forum content?",
      answer:
        "Open the post or reply, tap the three-dots (⋯), and choose Report. Our moderators review reports and may issue warnings, suspensions, or bans as needed.",
    },
    {
      question: "What happens if my account is suspended or banned?",
      answer:
        "Repeated violations can lead to temporary suspension or a permanent ban. You'll receive a notification. If eligible, you can submit an appeal from the app.",
    },
    {
      question: "How do I find and book a verified lawyer?",
      answer:
        "Go to the Legal Aid Directory, filter by specialization and location, then select a verified lawyer to view consultation options and availability.",
    },
    {
      question: "How do I switch language for an article?",
      answer:
        "On an article page, use the FIL/EN toggle at the top to switch between Filipino and English (when both versions are available).",
    },
    {
      question: "Can I bookmark guides or posts?",
      answer:
        "Yes. Tap the bookmark icon on guides and view them later in Bookmarked Guides. Forum posts support bookmarking if enabled in the post view."
    },
    {
      question: "How do notifications work?",
      answer:
        "You'll receive updates for replies, consultations, moderation actions, and new content. Tap a notification to open the related item. Manage OS-level notification settings from your device.",
    },
    {
      question: "How do I reset my password?",
      answer:
        "On the login screen, tap Forgot Password to receive a reset link via email. Follow the instructions to set a new password.",
    },
    {
      question: "Are the chatbot answers legal advice?",
      answer:
        "No. Responses are for educational purposes based on Philippine law and do not create a lawyer–client relationship.",
    },
    {
      question: "Which legal topics are covered?",
      answer:
        "Family, Civil, Criminal, Labor (Work), and Consumer law. Guides and glossary terms are organized under these categories.",
    },
    {
      question: "How is my data used?",
      answer:
        "We use your data to provide core features like saved items, consultations, and moderation. See our Privacy Policy for details and how to request deletion.",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const filteredFaqs = faqs.filter((item) =>
    item.question.toLowerCase().includes(search.toLowerCase())
  );
  const displayedFaqs = filteredFaqs.slice(0, visibleFaqCount);

  useEffect(() => {
    setVisibleFaqCount(5);
    setExpandedIndex(null);
  }, [search]);

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

  const validateEmailFields = () => {
    let valid = true;
    const newErrors = { name: "", email: "", subject: "", message: "" };

    if (!emailName.trim()) {
      newErrors.name = "Name is required";
      valid = false;
    }

    if (!emailAddress.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        newErrors.email = "Please enter a valid email address";
        valid = false;
      }
    }

    if (!emailSubject.trim()) {
      newErrors.subject = "Subject is required";
      valid = false;
    }

    if (!emailMessage.trim()) {
      newErrors.message = "Message is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleConfirmSend = () => {
    if (!validateEmailFields()) return;
    setShowConfirmModal(true);
  };

  const handleSendEmail = async () => {
    // Close confirmation modal and email form immediately
    setShowConfirmModal(false);
    setShowEmailForm(false);

    // Show "Email Sent" modal immediately
    setShowEmailSentModal(true);

    try {
      // Send email in the background
      const response = await axios.post(
        "http://localhost:8000/api/support/email",
        {
          name: emailName,
          email: emailAddress,
          subject: emailSubject,
          message: emailMessage,
        }
      );

      // Clear input fields
      setEmailName("");
      setEmailAddress("");
      setEmailSubject("");
      setEmailMessage("");

      if (!response.data.success) {
        console.error("Failed to send email:", response.data.error);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  const handleCallSupport = () => Linking.openURL("tel:+123456789");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header
        title="Help & Support"
        showMenu={true}
      />

      <View style={{ paddingHorizontal: 20 }}>
        <UnifiedSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search FAQs..."
          loading={isLoading}
          showFilterIcon={false}
          containerClassName="pt-6 pb-6"
        />
      </View>

      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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

              {/* FAQ List */}
              <View style={tw`px-6`}>
                <Text
                  style={[
                    tw`text-base font-semibold mb-3`,
                    { color: Colors.text.head },
                  ]}
                >
                  Frequently Asked Questions
                </Text>
                {displayedFaqs.length > 0 ? (
                  displayedFaqs.map((item, index) => (
                    <View
                      key={`${item.question}-${index}`}
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
                      No results found for “{search}”
                    </Text>
                  </View>
                )}

                {filteredFaqs.length > visibleFaqCount && (
                  <View style={tw`items-center mt-1`}>
                    <TouchableOpacity
                      onPress={() => setVisibleFaqCount((c) => Math.min(c + 5, filteredFaqs.length))}
                      style={[tw`px-4 py-2 rounded-lg`, { backgroundColor: Colors.primary.blue }]}
                    >
                      <Text style={tw`text-white font-semibold`}>See more</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Contact Section */}
              <View style={tw`px-6 mt-8 mb-8`}>
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
                      { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
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
                      aittorney.otp@gmail.com
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      tw`flex-1 items-center p-4 ml-2 rounded-xl border`,
                      { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
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

      {/* Bottom Navigation */}
      <Navbar />
      <SidebarWrapper />

      {/* EMAIL FORM MODAL */}
      <Modal
        visible={showEmailForm}
        transparent
        animationType="none"
        onRequestClose={handleCloseEmailForm}
      >
        <Animated.View
          style={[
            tw`flex-1 bg-black bg-opacity-50 justify-center items-center`,
            { opacity: fadeAnim, zIndex: 10, elevation: 10 },
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

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Your Name"
                value={emailName}
                setValue={setEmailName}
                error={errors.name}
              />
              <Input
                label="Your Email"
                value={emailAddress}
                setValue={setEmailAddress}
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Subject"
                value={emailSubject}
                setValue={setEmailSubject}
                error={errors.subject}
              />
              <Input
                label="Message"
                value={emailMessage}
                setValue={setEmailMessage}
                multiline
                numberOfLines={5}
                error={errors.message}
              />

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
                  onPress={handleConfirmSend}
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

      <Modal
        visible={showEmailSentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailSentModal(false)}
      >
        <View
          style={[
            tw`flex-1 bg-black bg-opacity-50 justify-center items-center`,
            { zIndex: 999, elevation: 999 },
          ]}
        >
          <View
            style={[
              tw`bg-white rounded-2xl p-6`,
              { width: Math.min(width * 0.85, 400) },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-4 text-center`,
                { color: Colors.text.head },
              ]}
            >
              Email Sent!
            </Text>
            <Text
              style={[tw`text-sm text-center mb-4`, { color: Colors.text.sub }]}
            >
              Thank you for reaching out. Our support team will get back to you
              soon.
            </Text>
            <TouchableOpacity
              style={[
                tw`py-3 rounded-xl`,
                { backgroundColor: Colors.primary.blue },
              ]}
              onPress={() => setShowEmailSentModal(false)}
            >
              <Text style={tw`text-center text-white font-semibold`}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONFIRMATION MODAL */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View
          style={[
            tw`flex-1 bg-black bg-opacity-50 justify-center items-center`,
            { zIndex: 999, elevation: 999 },
          ]}
        >
          <View
            style={[
              tw`bg-white rounded-2xl p-6`,
              { width: Math.min(width * 0.85, 400) },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-4 text-center`,
                { color: Colors.text.head },
              ]}
            >
              Are you sure you want to send this email?
            </Text>
            <View style={tw`flex-row justify-between mt-2`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 py-3 rounded-xl mr-2 border`,
                  { borderColor: Colors.primary.blue },
                ]}
                onPress={() => setShowConfirmModal(false)}
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
                  Yes, Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Reusable Input with validation **/
const Input = ({
  label,
  value,
  setValue,
  keyboardType = "default",
  multiline = false,
  numberOfLines = 1,
  error = "",
}: any) => (
  <View style={tw`mb-4`}>
    <Text style={[tw`text-sm font-semibold mb-2`, { color: Colors.text.head }]}>
      {label}
    </Text>
    <TextInput
      style={[
        tw`border rounded-xl px-4 py-3 text-base`,
        {
          borderColor: error ? "red" : "#E5E7EB",
          color: Colors.text.head,
          minHeight: multiline ? 120 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        },
      ]}
      placeholder={`Enter ${label.toLowerCase()}`}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={setValue}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
    />
    {error ? <Text style={tw`text-red-500 text-xs mt-1`}>{error}</Text> : null}
  </View>
);
