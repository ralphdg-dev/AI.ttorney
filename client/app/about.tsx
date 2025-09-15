import React from "react";
import { View, ScrollView } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={tw`flex-1 bg-white`}>
      <Header showBackButton={true} showMenu={false} onBackPress={() => router.back()} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 24 }}>
          About AI.ttorney
        </GSText>

        {/* Content */}
        <VStack style={{ gap: 20 }}>
          {/* Our Mission */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              1. Our Mission
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </GSText>
          </VStack>

          {/* Our Story */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              2. Our Story
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </GSText>
          </VStack>

          {/* Our Team */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              3. Our Team
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
            </GSText>
          </VStack>

          {/* Contact */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              4. Contact
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              Email: hello@example.com
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
    </View>
  );
}
