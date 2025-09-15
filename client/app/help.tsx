import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import Colors from "@/constants/Colors";
import Navbar from "@/components/Navbar";
import { Search, Bell, HelpCircle, BookOpen, CreditCard, Plus, Minus } from "lucide-react-native";
import { Input, InputField } from "@/components/ui/input";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const faqs = [
  {
    q: "What is AI.ttorney?",
    a: "AI.ttorney is your legal learning companion. It helps you explore legal topics, understand definitions, and bookmark helpful guides.",
  },
  {
    q: "Is AI.ttorney a law firm or does it provide legal advice?",
    a: "No. AI.ttorney is not a law firm and does not provide legal advice. It is an educational aide meant to provide helpful information, not legal counsel.",
  },
  {
    q: "How do I save my favorite terms and guides?",
    a: "Open any term or guide and tap the bookmark icon. Your favorites appear in the sidebar under Favorite Terms and Bookmarked Guides.",
  },
  {
    q: "How do I update my account details?",
    a: "Go to Settings from the sidebar, then choose Edit profile or Change password.",
  },
  {
    q: "Who can I contact for support?",
    a: "You can send feedback via the sidebar option ‘Send Feedback’ or email us at support@example.com.",
  },
];

type Category = {
  id: string;
  label: string;
  highlight: string;
  icon: React.ComponentType<any>;
  bg: string;
  border: string;
};

const categories: Category[] = [
  { id: 'getting-started', label: 'Questions about', highlight: 'Getting Started', icon: HelpCircle, bg: '#ECFEFF', border: '#BAE6FD' },
  { id: 'how-to', label: 'Questions about', highlight: 'How to Use', icon: BookOpen, bg: '#ECFDF5', border: '#BBF7D0' },
  { id: 'billing', label: 'Questions about', highlight: 'Billing & Payment', icon: CreditCard, bg: '#FEF2F2', border: '#FECACA' },
];

function CategoryCard({ item }: { item: Category }) {
  const IconComp = item.icon;
  return (
    <Box
      className="rounded-2xl px-4 py-3 mr-3"
      style={{ backgroundColor: item.bg, borderColor: item.border, borderWidth: 1, width: 220 }}
    >
      <IconComp size={22} color={Colors.text.head} strokeWidth={1.5} />
      <GSText size="sm" style={{ color: Colors.text.sub, marginTop: 10 }}>
        {item.label}
      </GSText>
      <GSText size="md" bold style={{ color: Colors.text.head, marginTop: 2 }}>
        {item.highlight}
      </GSText>
    </Box>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <Box
      className="rounded-2xl px-4 py-3"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1 }}
    >
      <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
        <HStack className="items-center justify-between">
          <GSText size="md" bold style={{ color: Colors.text.head }}>
            {q}
          </GSText>
          {open ? (
            <Minus size={18} color={Colors.text.sub} />
          ) : (
            <Plus size={18} color={Colors.text.sub} />
          )}
        </HStack>
      </TouchableOpacity>
      {open && (
        <VStack className="mt-2">
          <GSText size="md" style={{ color: Colors.text.body }}>
            {a}
          </GSText>
        </VStack>
      )}
    </Box>
  );
}

export default function HelpSupportScreen() {
  const router = useRouter();

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Header title="" showBackButton={true} showMenu={false} onBackPress={() => router.back()} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <GSText size="xl" bold style={{ color: Colors.text.head }}>
            How can we help you?
          </GSText>
        </View>

        {/* Search Bar */}
        <HStack className="items-center mb-4">
          <Box
            className="flex-1 rounded-xl border bg-white"
            style={{ borderColor: '#E5E7EB' }}
          >
            <HStack className="items-center px-3 py-2">
              <Search size={18} color={Colors.text.sub} />
              <Input
                variant="outline"
                size="lg"
                className="flex-1 ml-2"
                style={{ borderWidth: 0, backgroundColor: 'transparent' }}
              >
                <InputField
                  placeholder="Enter your keyword"
                  placeholderTextColor={Colors.text.sub}
                  style={{ color: Colors.text.head }}
                />
              </Input>
            </HStack>
          </Box>
        </HStack>

        {/* Category Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            {categories.map((item) => (
              <CategoryCard key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>

        {/* Top Questions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 }}>
          <GSText size="lg" bold style={{ color: Colors.text.head }}>Top Questions</GSText>
          <TouchableOpacity activeOpacity={0.7}>
            <GSText size="sm" bold style={{ color: Colors.primary.blue }}>View all</GSText>
          </TouchableOpacity>
        </View>

        {/* FAQ List */}
        <VStack style={{ gap: 12 }}>
          {faqs.map((item, idx) => (
            <FAQItem key={`${idx}-${item.q}`} q={item.q} a={item.a} />
          ))}
        </VStack>

        {/* Contact card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginTop: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <GSText size="lg" bold style={{ color: Colors.text.head }}>
            Still need help?
          </GSText>
          <GSText size="md" style={{ color: Colors.text.body, marginTop: 6 }}>
            Send us feedback from the sidebar or email us at support@example.com.
          </GSText>
        </View>
      </ScrollView>

      <Navbar />
    </View>
  );
}
