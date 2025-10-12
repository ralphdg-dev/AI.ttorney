import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { createShadowStyle } from "../../utils/shadowUtils";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as GSText } from "@/components/ui/text";
import Button from "@/components/ui/Button";
import CustomToggle from "@/components/common/CustomToggle";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { 
  User, 
  Lock, 
  Bell, 
 
  Shield, 
  ChevronRight,
  Plus,
  FileText
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

export default function SettingsScreen() {
  const router = useRouter();
  const [pushNotifications, setPushNotifications] = useState(true);

  const accountSettings: SettingItem[] = [
    {
      id: "edit-profile",
      title: "Edit profile",
      icon: <User size={20} color={Colors.text.body} />,
      type: "navigation",
      onPress: () => {
        // Navigate to edit profile
        console.log("Navigate to edit profile");
      },
    },
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
        <HStack className="items-center justify-between px-5 py-4">
          <HStack className="items-center flex-1">
            <View style={[tw`mr-4 p-2 rounded-lg`, { backgroundColor: '#F8FAFC' }]}>
              {item.icon}
            </View>
            <GSText size="md" style={{ color: Colors.text.head, flex: 1 }}>
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
      <TouchableOpacity onPress={item.onPress} activeOpacity={0.6}>
        <HStack className="items-center justify-between px-5 py-4">
          <HStack className="items-center flex-1">
            <View style={[tw`mr-4 p-2 rounded-lg`, { backgroundColor: '#F8FAFC' }]}>
              {item.icon}
            </View>
            <GSText size="md" style={{ color: Colors.text.head, flex: 1 }}>
              {item.title}
            </GSText>
          </HStack>

          {item.type === "navigation" && (
            <ChevronRight size={18} color={Colors.text.sub} />
          )}

          {item.type === "add" && (
            <Plus size={18} color={Colors.primary.blue} strokeWidth={2} />
          )}
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Header title="Settings" showMenu={true} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Box className="bg-white rounded-2xl mb-6 p-6" style={createShadowStyle({
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        })}>
          <HStack className="items-center">
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#F0F9FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}>
              <User size={28} color={Colors.primary.blue} strokeWidth={1.5} />
            </View>
            <VStack className="flex-1">
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                John Doe
              </GSText>
              <GSText size="sm" style={{ color: Colors.text.sub, marginTop: 2 }}>
                john.doe@example.com
              </GSText>
            </VStack>
            <TouchableOpacity onPress={() => console.log("Edit profile")} style={{ padding: 8 }}>
              <ChevronRight size={20} color={Colors.text.sub} />
            </TouchableOpacity>
          </HStack>
        </Box>

        {/* Account Settings Section */}
        <VStack className="mb-8">
          <GSText size="lg" bold className="mb-5 px-1" style={{ color: Colors.text.head }}>
            Account Settings
          </GSText>
          <VStack className="bg-white rounded-2xl" style={createShadowStyle({
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          })}>
            {accountSettings.map((item, index) => (
              <View key={item.id}>
                {renderSettingItemInGroup(item)}
                {index < accountSettings.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
                )}
              </View>
            ))}
          </VStack>
        </VStack>

        {/* More Section */}
        <VStack className="mb-8">
          <GSText size="lg" bold className="mb-5 px-1" style={{ color: Colors.text.head }}>
            More
          </GSText>
          <VStack className="bg-white rounded-2xl" style={createShadowStyle({
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          })}>
            {moreSettings.map((item, index) => (
              <View key={item.id}>
                {renderSettingItemInGroup(item)}
                {index < moreSettings.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
                )}
              </View>
            ))}
          </VStack>
        </VStack>

        {/* Sign Out Button */}
        <View style={{ marginTop: -8 }}>
          <Button
            title="Sign Out"
            onPress={() => {
              // Handle sign out
              console.log("Sign out");
            }}
            variant="danger"
            size="large"
          />
        </View>
      </ScrollView>

      <Navbar activeTab="learn" />
    </View>
  );
}