import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Settings,
  Edit,
  LogOut,
  Shield,
  Mail,
  Phone,
  MapPin,
} from "lucide-react-native";
import LawyerNavbar from "../../components/lawyer/LawyerNavbar";
import Header from "../../components/Header";
import EditProfileModal from "./ProfileComponents/EditProfileModal";
import Colors from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthContext";
import tw from "tailwind-react-native-classnames";
import { useLawyerProfile } from "../.././services/lawyerProfileServices";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ProfileData {
  name: string;
  email: string;
  phone_number: string;
  location: string;
  avatar: string;
  specialization: string;
  experience: string;
  verificationStatus: string;
  rollNumber: string;
  rollSigningDate: string;
  bio: string;
}

const LawyerProfilePage: React.FC = () => {
  const { user, signOut, refreshUserData } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone_number: "",
    location: "",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    specialization: "",
    experience: "8 years",
    verificationStatus: "Verified Lawyer",
    rollNumber: "SC-2016-001234",
    rollSigningDate: "2016-03-15",
    bio: "",
  });

  const { saveProfile } = useLawyerProfile();

  const [availabilitySlots, setAvailabilitySlots] = useState<TimeSlot[]>([
    {
      id: "1",
      day: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "2",
      day: "Tuesday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "3",
      day: "Wednesday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "4",
      day: "Thursday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "5",
      day: "Friday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "6",
      day: "Saturday",
      startTime: "10:00",
      endTime: "14:00",
      isActive: false,
    },
    {
      id: "7",
      day: "Sunday",
      startTime: "10:00",
      endTime: "14:00",
      isActive: false,
    },
  ]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Initialize profile data from user context
  useEffect(() => {
    if (user) {
      const userProfileData: ProfileData = {
        name: user.full_name || "Attorney",
        email: user.email || "",
        phone_number: profileData.phone_number,
        location: profileData.location,
        avatar: profileData.avatar,
        specialization: profileData.specialization,
        experience: profileData.experience,
        verificationStatus:
          user.role === "verified_lawyer"
            ? "Verified Lawyer"
            : "Pending Verification",
        rollNumber: profileData.rollNumber,
        rollSigningDate: profileData.rollSigningDate,
        bio: profileData.bio,
      };

      setProfileData(userProfileData);
    }
  }, [user]);

  const saveLawyerProfileToBackend = async (
    profileData: any,
    availabilitySlots: any
  ) => {
    try {
      const result = await saveProfile(profileData, availabilitySlots);
      return result;
    } catch (error) {
      console.error("Error saving lawyer profile:", error);
      throw error;
    }
  };

  const handleSaveProfile = async (
    editFormData: Omit<
      ProfileData,
      "experience" | "verificationStatus" | "rollNumber" | "rollSigningDate"
    >
  ) => {
    try {
      // Call your backend API
      const result = await saveLawyerProfileToBackend(
        editFormData,
        availabilitySlots
      );

      if (result.success) {
        // Update local profile data
        setProfileData((prev) => ({
          ...prev,
          ...editFormData,
        }));

        // Refresh user data from context to ensure consistency
        await refreshUserData();

        Alert.alert("Success", "Profile updated successfully!");
        setIsEditingProfile(false);
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
      throw error;
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleSettings = () => {
    console.log("Settings");
    // TODO: Navigate to settings screen
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");

    if (confirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center`}>
        <Text style={tw`text-lg text-gray-600`}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Header variant="lawyer-profile" title="Profile" showSettings={false} />

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-24`}
      >
        {/* Profile Header */}
        <View style={tw`bg-white p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`relative mr-4`}>
              <Image
                source={{ uri: profileData.avatar }}
                style={tw`w-20 h-20 rounded-full`}
              />
              <View
                style={[
                  tw`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center`,
                  { backgroundColor: "#ECFDF5" },
                ]}
              >
                <Shield size={14} color="#059669" fill="#059669" />
              </View>
            </View>

            <View style={tw`flex-1`}>
              <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
                {profileData.name}
              </Text>
              <Text style={tw`text-sm text-gray-600 mb-2`}>
                {profileData.specialization}
              </Text>
              <View
                style={[
                  tw`px-2 py-1 rounded-md self-start`,
                  { backgroundColor: "#ECFDF5" },
                ]}
              >
                <Text style={tw`text-xs font-semibold text-green-700`}>
                  {profileData.verificationStatus}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                tw`px-4 py-2 rounded-lg flex-row items-center`,
                { backgroundColor: Colors.primary.blue },
              ]}
              onPress={handleEditProfile}
            >
              <Edit size={16} color="white" />
              <Text style={tw`text-white font-medium text-sm ml-2`}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Bio Section */}
          <View style={tw`mt-4 pt-4 border-t border-gray-100`}>
            <Text style={tw`text-sm text-gray-700 leading-5`}>
              {profileData.bio}
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={tw`bg-white mt-3 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
            Contact Information
          </Text>
          <View style={tw`flex flex-col`}>
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Mail size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>
                {profileData.email}
              </Text>
            </View>
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Phone size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>
                {profileData.phone_number}
              </Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <MapPin size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>
                {profileData.location}
              </Text>
            </View>
          </View>
        </View>

        {/* Professional Information */}
        <View style={tw`bg-white mt-3 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
            Professional Information
          </Text>
          <View style={tw`flex-row flex-wrap -mx-2`}>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Experience</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>
                {profileData.experience}
              </Text>
            </View>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>
                Roll Signing Date
              </Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>
                {new Date(profileData.rollSigningDate).toLocaleDateString(
                  "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </Text>
            </View>
            <View style={tw`w-full px-2`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>
                Supreme Court Roll Number
              </Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>
                {profileData.rollNumber}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={tw`bg-white mt-3 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Account</Text>

          <TouchableOpacity
            style={tw`flex-row items-center py-4 border-b border-gray-100`}
            onPress={handleSettings}
          >
            <View
              style={[
                tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                { backgroundColor: "#F3F4F6" },
              ]}
            >
              <Settings size={18} color="#374151" />
            </View>
            <Text style={tw`text-base text-gray-900 flex-1`}>
              Settings & Preferences
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-row items-center py-4`}
            onPress={handleLogout}
          >
            <View
              style={[
                tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                { backgroundColor: "#FEE2E2" },
              ]}
            >
              <LogOut size={18} color="#DC2626" />
            </View>
            <Text style={tw`text-base text-red-600 flex-1`}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isVisible={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        onSave={handleSaveProfile}
        profileData={{
          name: profileData.name,
          email: profileData.email,
          phone_number: profileData.phone_number,
          location: profileData.location,
          avatar: profileData.avatar,
          specialization: profileData.specialization,
          bio: profileData.bio,
        }}
        availabilitySlots={availabilitySlots}
        onAvailabilityChange={setAvailabilitySlots}
      />

      <LawyerNavbar activeTab="profile" />
    </SafeAreaView>
  );
};

export default LawyerProfilePage;
