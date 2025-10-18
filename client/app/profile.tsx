import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import { supabase } from "../config/supabase";
import { SidebarWrapper } from "../components/AppSidebar";
import { createShadowStyle } from "../utils/shadowUtils";

interface UserProfileData {
  full_name: string;
  email: string;
  username: string;
  birthdate: string;
  profile_photo: string;
}

// Constants
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_PROFILE_PHOTO = "";
const REQUEST_TIMEOUT_MS = 5000;

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

// Helper function to make API requests with timeout
const makeApiRequest = async (endpoint: string): Promise<Response> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Authentication required");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
};

const createFallbackProfile = (user: any): UserProfileData => ({
  full_name: user.full_name || "",
  email: user.email || "",
  username: (user as any).username || "",
  birthdate: (user as any).birthdate || "",
  profile_photo: DEFAULT_PROFILE_PHOTO,
});

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
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    full_name: "",
    email: "",
    username: "",
    birthdate: "",
    profile_photo: DEFAULT_PROFILE_PHOTO,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Create fallback profile immediately for faster UI
      const fallbackProfile = createFallbackProfile(user);
      setProfileData(fallbackProfile);
      
      // Try to make API request for updated data
      let response: Response;
      try {
        response = await makeApiRequest('/api/user/profile');
      } catch (error: any) {
        if (error.message === "Authentication required") {
          // Already set fallback data above
          return;
        }
        throw error;
      }

      if (!response.ok) {
        if (response.status === 404) {
          // Already set fallback data above
          return;
        }
        throw new Error(`Failed to load profile: ${response.status}`);
      }

      const data = await response.json();
      
      const userProfile: UserProfileData = {
        full_name: data.full_name || user.full_name || "",
        email: data.email || user.email || "",
        username: data.username || (user as any).username || "",
        birthdate: data.birthdate || (user as any).birthdate || "",
        profile_photo: data.profile_photo || DEFAULT_PROFILE_PHOTO,
      };
      
      // Only update if data is different to prevent unnecessary re-renders
      setProfileData(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(userProfile)) {
          return userProfile;
        }
        return prev;
      });
      
    } catch (error: any) {
      console.error("Error in fetchUserProfile:", error);
      
      // Only show error for non-timeout errors
      if (!error.message?.includes('timeout') && !error.message?.includes('Authentication required')) {
        setError("Failed to load profile data. Using cached information.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchUserProfile]);

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  if (isLoading) {
    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: Colors.background.secondary }]}>
          <View style={tw`flex-1 justify-center items-center px-4`}>
            <View style={tw`items-center`}>
              <ActivityIndicator size="large" color={Colors.primary.blue} />
              <Text style={[tw`mt-4 text-base`, { color: Colors.text.secondary }]}>Loading profile...</Text>
            </View>
          </View>
          <Navbar activeTab="profile" />
          <SidebarWrapper />
        </SafeAreaView>
    );
  }

  if (error) {
    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: Colors.background.secondary }]}>
          <View style={tw`flex-1 justify-center items-center px-4`}>
            <View style={tw`items-center`}>
              <Text style={tw`text-red-600 text-center text-lg font-bold mb-2`}>Error Loading Profile</Text>
              <Text style={tw`text-red-600 text-center text-sm`}>{error}</Text>
              <TouchableOpacity 
                style={tw`mt-4 px-6 py-3 bg-red-600 rounded-lg`}
                onPress={() => {
                  setError(null);
                  fetchUserProfile();
                }}
              >
                <Text style={tw`text-white text-center font-medium`}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Navbar activeTab="profile" />
          <SidebarWrapper />
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: Colors.background.secondary }]}>
        <Header title="Profile" showSettings={false} showMenu={true} />
      
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
                {profileData.full_name || "User"}
              </AvatarFallbackText>
              <AvatarImage 
                source={{ uri: profileData.profile_photo || undefined }} 
                alt="Profile"
              />
            </Avatar>
          </View>
          
          {/* User Info */}
          <Text style={[tw`text-2xl font-bold text-center`, { color: Colors.text.primary }]}>
            {profileData.full_name || "User"}
          </Text>
          <Text style={[tw`text-base mt-2 text-center`, { color: Colors.text.secondary }]}>
            @{profileData.username || "username"}
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
                  {profileData.full_name || "Not provided"}
                </Text>
              </View>

              <View style={[tw`py-3 border-b`, { borderColor: Colors.border.light }]}>
                <Text style={[tw`text-sm font-medium mb-1`, { color: Colors.text.secondary }]}>Email Address</Text>
                <Text style={[tw`text-base`, { color: Colors.text.primary }]}>
                  {profileData.email || "Not provided"}
                </Text>
              </View>

              <View style={tw`py-3`}>
                <Text style={[tw`text-sm font-medium mb-1`, { color: Colors.text.secondary }]}>Birth Date</Text>
                <Text style={[tw`text-base`, { color: Colors.text.primary }]}>
                  {formatDate(profileData.birthdate)}
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
