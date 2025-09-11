import React from "react";
import { View, ScrollView } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <Box className="flex-1 bg-white">
      <Header showBackButton={true} showMenu={false} onBackPress={() => router.back()} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 24 }}>
          Privacy Policy
        </GSText>

        {/* Content */}
        <VStack style={{ gap: 20 }}>
          {/* Introduction */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              1. Introduction
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </GSText>
          </VStack>

          {/* Information We Collect */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              2. Information We Collect
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
            </GSText>
          </VStack>

          {/* How We Use Your Information */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              3. How We Use Your Information
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi.
            </GSText>
          </VStack>

          {/* Data Security */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              4. Data Security
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </GSText>
          </VStack>

          {/* Third-Party Services */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              5. Third-Party Services
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.
            </GSText>
          </VStack>

          {/* Your Rights */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              6. Your Rights
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </GSText>
          </VStack>

          {/* Contact Information */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              7. Contact Information
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              Email: privacy@example.com
            </GSText>
          </VStack>

          {/* Last Updated */}
          <VStack style={{ gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
            <GSText size="sm" style={{ color: Colors.text.sub }}>
              Last updated: December 2024
            </GSText>
          </VStack>
        </VStack>
      </ScrollView>
      
      <Navbar />
    </Box>
  );
}