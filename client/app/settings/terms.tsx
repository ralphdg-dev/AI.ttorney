import React, { useCallback } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text as GSText } from '@/components/ui/text';
import Navbar from "@/components/Navbar";
import { GuestNavbar } from "@/components/guest";
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/utils/navigationHelper';

export default function TermsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { isGuestMode, isAuthenticated, user } = useAuth();

  // Intelligent back navigation handler (FAANG best practice)
  const handleBackPress = useCallback(() => {
    safeGoBack(router, {
      isGuestMode,
      isAuthenticated,
      userRole: user?.role,
      currentPath: pathname,
    });
  }, [router, isGuestMode, isAuthenticated, user?.role, pathname]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Box className="flex-1 bg-white">
      <Header showBackButton={true} showMenu={false} onBackPress={handleBackPress} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 24 }}>
          Terms of Use
        </GSText>

        {/* Content */}
        <VStack style={{ gap: 20 }}>
          {/* Acceptance of Terms */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              1. Acceptance of Terms
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </GSText>
          </VStack>

          {/* Description of Service */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              2. Description of Service
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
            </GSText>
          </VStack>

          {/* User Responsibilities */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              3. User Responsibilities
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.
            </GSText>
          </VStack>

          {/* Prohibited Uses */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              4. Prohibited Uses
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
            </GSText>
          </VStack>

          {/* Intellectual Property */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              5. Intellectual Property
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
            </GSText>
          </VStack>

          {/* Limitation of Liability */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              6. Limitation of Liability
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
            </GSText>
          </VStack>

          {/* Termination */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              7. Termination
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </GSText>
          </VStack>

          {/* Changes to Terms */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              8. Changes to Terms
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </GSText>
          </VStack>

          {/* Contact Information */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              9. Contact Information
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              Email: legal@example.com
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
      
      {isGuestMode ? (
        <GuestNavbar activeTab="learn" />
      ) : (
        <Navbar activeTab="profile" />
      )}
    </Box>
    </SafeAreaView>
  );
}