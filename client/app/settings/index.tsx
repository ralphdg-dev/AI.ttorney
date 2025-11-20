import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as GSText } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallbackText } from "@/components/ui/avatar";
import CustomToggle from "@/components/common/CustomToggle";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { LawyerNavbar } from "@/components/lawyer/shared";
import { SidebarWrapper } from "@/components/AppSidebar";
import Colors from "@/constants/Colors";
import { createShadowStyle } from '@/utils/shadowUtils';
import { AuthGuard } from "../../components/AuthGuard";
import { 
  Lock, 
  Bell, 
  Shield, 
  ChevronRight,
  Plus,
  FileText,
  UserX
} from "lucide-react-native";

type SettingItem = {
  id: string;
  title: string;
  icon: React.ReactNode;
  type: "navigation" | "toggle" | "add";
  onPress?: () => void;
  value?: boolean;
  onToggle?: (value: boolean) => void;
};

// Common styling utilities
const cardShadowStyle = createShadowStyle({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3
});

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  
  // Check if user is a lawyer
  const isLawyer = user?.role === 'verified_lawyer';

  const accountSettings: SettingItem[] = [
    {
      id: "change-password",
      title: "Change password",
      icon: <Lock size={20} color={Colors.text.body} />,
      type: "navigation",
      onPress: () => {
        router.push("/settings/change-password");
      },
    },
    {
      id: "push-notifications",
      title: "Push notifications",
      icon: <Bell size={20} color={Colors.text.body} />,
      type: "toggle",
      value: pushNotifications,
      onToggle: setPushNotifications,
    },
    {
      id: "deactivate-account",
      title: "Deactivate account",
      icon: <UserX size={20} color={Colors.text.body} />,
      type: "navigation",
      onPress: () => {
        router.push("/settings/deactivate-account");
      },
    },
  ];

  const moreSettings: SettingItem[] = [
    {
      id: "privacy-policy",
      title: "Privacy policy",
      icon: <Shield size={20} color={Colors.text.body} />,
      type: "navigation",
      onPress: () => {
        router.push("/settings/privacy-policy");
      },
    },
    {
      id: "terms-of-use",
      title: "Terms of use",
      icon: <FileText size={20} color={Colors.text.body} />,
      type: "navigation",
      onPress: () => {
        router.push("/settings/terms");
      },
    },
  ];

  const renderSettingItemInGroup = (item: SettingItem) => {
    if (item.type === "toggle") {
      return (
        <HStack className="items-center justify-between px-5 py-4" space="md">
          <HStack className="items-center flex-1" space="md">
            <Box 
              className="p-2 rounded-lg" 
              style={{ backgroundColor: Colors.background.tertiary }}
            >
              {item.icon}
            </Box>
            <GSText size="md" style={{ color: Colors.text.primary, flex: 1 }}>
              {item.title}
            </GSText>
          </HStack>
          <CustomToggle
            value={item.value || false}
            onValueChange={item.onToggle || (() => {})}
            size="md"
          />
        </HStack>
      );
    }

    return (
      <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
        <HStack className="items-center justify-between px-5 py-4" space="md">
          <HStack className="items-center flex-1" space="md">
            <Box 
              className="p-2 rounded-lg" 
              style={{ backgroundColor: Colors.background.tertiary }}
            >
              {item.icon}
            </Box>
            <GSText size="md" style={{ color: Colors.text.primary, flex: 1 }}>
              {item.title}
            </GSText>
          </HStack>

          {item.type === "navigation" && (
            <ChevronRight size={18} color={Colors.text.secondary} />
          )}

          {item.type === "add" && (
            <Plus size={18} color={Colors.primary.blue} strokeWidth={2} />
          )}
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <AuthGuard>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      {/* Header with menu button */}
      <Header 
        title="Settings" 
        showBackButton={false}
        showMenu={true}
      />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <TouchableOpacity onPress={() => router.push(isLawyer ? '/lawyer/profile' : '/profile')} activeOpacity={0.7}>
          <Box 
            className="bg-white rounded-2xl mb-6 p-6" 
            style={cardShadowStyle}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Avatar 
                size="lg"
                style={{ backgroundColor: '#023D7B' }}
              >
                <AvatarFallbackText style={{ color: '#FFFFFF' }}>
                  {user?.full_name || "User"}
                </AvatarFallbackText>
                <AvatarImage 
                  source={{ uri: (user as any)?.profile_photo || undefined }} 
                  alt="Profile"
                />
              </Avatar>
              <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                <GSText size="lg" bold style={{ color: Colors.text.primary }}>
                  {user?.full_name || "User"}
                </GSText>
                <GSText 
                  size="sm" 
                  style={{ 
                    color: Colors.text.secondary
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  @{user?.username || "username"}
                </GSText>
              </View>
              <View style={{ padding: 8 }}>
                <ChevronRight size={20} color={Colors.text.secondary} />
              </View>
            </View>
          </Box>
        </TouchableOpacity>

        {/* Account Settings Section */}
        <VStack className="mb-8" space="md">
          <GSText size="lg" bold className="px-1" style={{ color: Colors.text.primary }}>
            Account Settings
          </GSText>
          <VStack 
            className="bg-white rounded-2xl" 
            style={createShadowStyle({
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            })}
          >
            {accountSettings.map((item, index) => (
              <View key={item.id}>
                {renderSettingItemInGroup(item)}
                {index < accountSettings.length - 1 && (
                  <Box style={{ height: 1, backgroundColor: Colors.border.light }} />
                )}
              </View>
            ))}
          </VStack>
        </VStack>

        {/* More Section */}
        <VStack className="mb-8" space="md">
          <GSText size="lg" bold className="px-1" style={{ color: Colors.text.primary }}>
            More
          </GSText>
          <VStack 
            className="bg-white rounded-2xl" 
            style={createShadowStyle({
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            })}
          >
            {moreSettings.map((item, index) => (
              <View key={item.id}>
                {renderSettingItemInGroup(item)}
                {index < moreSettings.length - 1 && (
                  <Box style={{ height: 1, backgroundColor: Colors.border.light }} />
                )}
              </View>
            ))}
          </VStack>
        </VStack>

      </ScrollView>

        {isLawyer ? <LawyerNavbar /> : <Navbar />}
        <SidebarWrapper />
      </SafeAreaView>
    </AuthGuard>
  );
}