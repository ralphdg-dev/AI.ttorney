import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Image,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Colors from "../constants/Colors";
import Header from "@/components/Header";

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
      {/* Search Bar Skeleton */}
      <Animated.View
        style={[tw`h-12 bg-gray-200 rounded-xl mb-6`, { opacity }]}
      />

      {/* FAQ Title Skeleton */}
      <Animated.View
        style={[tw`h-5 w-48 bg-gray-200 rounded mb-3`, { opacity }]}
      />

      {/* FAQ Items Skeleton */}
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

      {/* Contact Section Skeleton */}
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
        "The platform focuses on five key areas: Family Law (marriage, annulment, custody), Civil Law (contracts, property), Criminal Law (theft, estafa, self-defense), Labor Law (termination, benefits), and Consumer Law (consumer rights, warranties).",
    },
    {
      question: "Is the chatbot's advice legally binding?",
      answer:
        "No. The chatbot provides educational information based on Philippine law, but it does not constitute legal advice or create a lawyer-client relationship. For specific cases, consult a verified lawyer through our Legal Aid Directory.",
    },
    {
      question: "How do I find a lawyer near me?",
      answer:
        "Go to the Legal Aid Directory and use the filters to search by location, specialization, and consultation mode (online or onsite). You can also view law firms on the map based on your current location.",
    },
    {
      question: "How does lawyer verification work?",
      answer:
        "All lawyers are verified through the Supreme Court Roll of Attorneys or IBP QR code validation. Only verified lawyers can respond in the Community Forum and appear in the Legal Aid Directory.",
    },
    {
      question: "Can I request a consultation with a lawyer?",
      answer:
        "Yes. Browse verified lawyer profiles in the Legal Aid Directory and submit a consultation request. You can only have one active request at a time. If rejected, you may submit another.",
    },
    {
      question: "What languages does the app support?",
      answer:
        "Ai.ttorney is fully bilingual, offering content in both English and Filipino. The chatbot can understand Taglish queries and respond in your preferred language.",
    },
    {
      question: "How do I post a question in the Community Forum?",
      answer:
        "Navigate to the Community Forum, select a legal category (Family, Civil, Labor, Criminal, or Consumer), and post your question. Only verified lawyers can respond to maintain quality and accuracy.",
    },
    {
      question: "What happens if I post inappropriate content?",
      answer:
        "All posts are screened for inappropriate content. Users who violate community guidelines receive warning strikes. After three strikes, you will be banned from the forum.",
    },
    {
      question: "Can I save my favorite articles or terms?",
      answer:
        "Yes! Registered users can bookmark articles, favorite glossary terms, and save chatbot conversations to their personalized dashboard for easy reference.",
    },
    {
      question: "How can I contact support?",
      answer:
        "You can contact us directly by email or through our in-app chat support available from 9am to 6pm.",
    },
    {
      question: "Why can't I log in?",
      answer:
        "Ensure your credentials are correct and your internet connection is stable. If the issue persists, contact support.",
    },
    {
      question: "Can I use the app offline?",
      answer:
        "Some features like saved articles and glossary terms are available offline, but you'll need internet access for the chatbot, forum, and Legal Aid Directory.",
    },
    {
      question: "How do I update my profile information?",
      answer:
        "Navigate to Settings > Profile and tap on any field to edit. Don't forget to save your changes.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes, we use industry-standard encryption and security measures to protect your personal information. All data handling complies with the Data Privacy Act of 2012.",
    },
  ];

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const filteredFaqs = faqs.filter((item) =>
    item.question.toLowerCase().includes(search.toLowerCase())
  );

  const handleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@example.com?subject=App Support Request");
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
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 2,
                          elevation: 1,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleExpand(index)}
                        activeOpacity={0.7}
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
                      No results found for "{search}"
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
                  {/* Email */}
                  <TouchableOpacity
                    style={[
                      tw`flex-1 items-center p-4 mr-2 rounded-xl border`,
                      {
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F9FAFB",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 2,
                      },
                    ]}
                    onPress={handleEmailSupport}
                    activeOpacity={0.7}
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

                  {/* Call */}
                  <TouchableOpacity
                    style={[
                      tw`flex-1 items-center p-4 ml-2 rounded-xl border`,
                      {
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F9FAFB",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 2,
                      },
                    ]}
                    onPress={handleCallSupport}
                    activeOpacity={0.7}
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

              {/* Additional Help Section */}
              <View style={tw`px-6 mt-6`}>
                <View
                  style={[
                    tw`p-4 rounded-xl`,
                    { backgroundColor: Colors.primary.blue + "10" },
                  ]}
                >
                  <View style={tw`flex-row items-center mb-2`}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={Colors.primary.blue}
                    />
                    <Text
                      style={[
                        tw`text-sm font-semibold ml-2`,
                        { color: Colors.text.head },
                      ]}
                    >
                      Need More Help?
                    </Text>
                  </View>
                  <Text
                    style={[tw`text-xs leading-5`, { color: Colors.text.sub }]}
                  >
                    Our support team is available Monday to Friday, 9am to 6pm.
                    We typically respond within 24 hours.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
