import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Settings,
  Edit,
  LogOut,
  User,
} from "lucide-react-native";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import { Avatar, AvatarImage, AvatarFallbackText } from "../components/ui/avatar";
import { SidebarWrapper } from "../components/AppSidebar";
import { createShadowStyle } from "../utils/shadowUtils";

// Common styling utilities
const cardStyle = createShadowStyle({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2
});

const sectionHeaderStyle = {
  backgroundColor: Colors.background.tertiary
};


// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return "Not provided";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

// Reusable ProfileCard component
const ProfileCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  style?: any;
}> = ({ title, icon, children, style }) => (
  <View style={[tw`bg-white rounded-lg p-6 mb-4`, cardStyle, style]}>
    <View style={tw`flex-row items-center mb-4`}>
      <View style={[tw`w-8 h-8 rounded-lg flex items-center justify-center mr-3`, sectionHeaderStyle]}>
        {icon}
      </View>
      <Text style={[tw`text-lg font-bold`, { color: Colors.text.primary }]}>{title}</Text>
    </View>
    {children}
  </View>
);

export default function UserProfilePage() {
  // ⚡ FAANG OPTIMIZATION: Use AuthContext data directly - ZERO loading time
  const { user, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  // Background refresh on mount (non-blocking)
  useEffect(() => {
    if (user) {
      // Refresh in background without blocking UI
      refreshProfile().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  // ⚡ FAANG OPTIMIZATION: No loading states - instant render with cached data
  // If user is null, redirect to login (handled by AuthGuard)
  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header title="Profile" showMenu={true} />
      
      <ScrollView 
        style={[tw`flex-1`, { backgroundColor: Colors.background.secondary }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-20`}
      >
        {/* Profile Header */}
        <View style={[tw`bg-white px-6 py-8`, cardStyle]}>
          {/* Profile Avatar */}
          <View style={tw`items-center mb-6`}>
            <Avatar 
              size="xl" 
              style={{ 
                backgroundColor: Colors.background.tertiary 
              }}
            >
              <AvatarFallbackText style={{ color: Colors.text.primary }}>
                {user.full_name || "User"}
              </AvatarFallbackText>
              <AvatarImage 
                source={{ uri: user.profile_photo || undefined }} 
                alt="Profile"
              />
            </Avatar>
          </View>
          
          {/* User Info */}
          <Text style={[tw`text-2xl font-bold text-center`, { color: Colors.text.primary }]}>
            {user.full_name || "User"}
          </Text>
          <Text style={[tw`text-base mt-2 text-center`, { color: Colors.text.secondary }]}>
            @{user.username || "username"}
          </Text>
          
          {/* Edit Profile Button */}
          <View style={tw`mt-6`}>
            <TouchableOpacity
              style={[
                tw`flex-row items-center justify-center py-3 px-6 rounded-lg`,
                { backgroundColor: Colors.primary.blue }
              ]}
              onPress={handleEditProfile}
            >
              <Edit size={18} color={Colors.text.white} />
              <Text style={[tw`font-semibold text-base ml-2`, { color: Colors.text.white }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Information Cards */}
        <View style={tw`px-4 mt-4`}>
          {/* Personal Information Card */}
          <ProfileCard 
            title="Personal Information" 
            icon={<User size={18} color={Colors.text.secondary} />}
          >
            <View>
              <View style={[tw`py-3 border-b`, { borderColor: Colors.border.light }]}>
                <Text style={[tw`text-sm font-medium mb-1`, { color: Colors.text.secondary }]}>Full Name</Text>
                <Text style={[tw`text-base`, { color: Colors.text.primary }]}>
                  {user.full_name || "Not provided"}
                </Text>
              </View>

              <View style={[tw`py-3 border-b`, { borderColor: Colors.border.light }]}>
                <Text style={[tw`text-sm font-medium mb-1`, { color: Colors.text.secondary }]}>Email Address</Text>
                <Text style={[tw`text-base`, { color: Colors.text.primary }]}>
                  {user.email || "Not provided"}
                </Text>
              </View>

              <View style={tw`py-3`}>
                <Text style={[tw`text-sm font-medium mb-1`, { color: Colors.text.secondary }]}>Birth Date</Text>
                <Text style={[tw`text-base`, { color: Colors.text.primary }]}>
                  {formatDate(user.birthdate || "")}
                </Text>
              </View>
            </View>
          </ProfileCard>

          {/* Account Actions Card */}
          <ProfileCard 
            title="Account Settings" 
            icon={<Settings size={18} color={Colors.text.secondary} />}
            style={tw`mb-6`}
          >
            <View>
              <TouchableOpacity 
                style={[
                  tw`flex-row items-center py-4 border-b`,
                  { borderColor: Colors.border.light }
                ]}
                onPress={() => router.push('/settings')}
              >
                <Settings size={20} color={Colors.text.secondary} />
                <View style={tw`flex-1 ml-3`}>
                  <Text style={[tw`text-base font-semibold`, { color: Colors.text.primary }]}>Settings</Text>
                  <Text style={[tw`text-sm mt-1`, { color: Colors.text.secondary }]}>Privacy, notifications, and preferences</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={tw`flex-row items-center py-4`}
                onPress={signOut}
              >
                <LogOut size={20} color={Colors.status.error} />
                <View style={tw`flex-1 ml-3`}>
                  <Text style={[tw`text-base font-semibold`, { color: Colors.status.error }]}>Sign Out</Text>
                  <Text style={[tw`text-sm mt-1`, { color: Colors.text.secondary }]}>Sign out of your account securely</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ProfileCard>
        </View>
      </ScrollView>

      <Navbar activeTab="profile" />
      <SidebarWrapper />
    </SafeAreaView>
  );
}
