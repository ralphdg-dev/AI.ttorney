import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Settings,
  Edit,
  LogOut,
  User,
  Mail,
  Calendar,
  AtSign,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react-native";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import tw from "tailwind-react-native-classnames";
import { supabase } from "../config/supabase";

interface UserProfileData {
  full_name: string;
  email: string;
  username: string;
  birthdate: string;
  profile_photo: string;
}

interface EditFormData extends UserProfileData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfilePage: React.FC = () => {
  const { user, signOut, refreshUserData } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData>({
    full_name: "",
    email: "",
    username: "",
    birthdate: "",
    profile_photo: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    full_name: "",
    email: "",
    username: "",
    birthdate: "",
    profile_photo: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    message: string;
  }>({ isValid: true, isChecking: false, message: "" });
  const [canSendOTP, setCanSendOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailValidationTimeout, setEmailValidationTimeout] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get the session token with timeout
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Fallback to user data from context
        const fallbackProfile: UserProfileData = {
          full_name: user.full_name || "",
          email: user.email || "",
          username: (user as any).username || "",
          birthdate: (user as any).birthdate || "",
          profile_photo: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        };
        setProfileData(fallbackProfile);
        setIsLoading(false);
        return;
      }

      // Call backend API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // User not found in backend, use auth data
          const fallbackProfile: UserProfileData = {
            full_name: user.full_name || "",
            email: user.email || "",
            username: (user as any).username || "",
            birthdate: (user as any).birthdate || "",
            profile_photo: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
          };
          setProfileData(fallbackProfile);
          return;
        }
        throw new Error(`Failed to load profile: ${response.status}`);
      }

      const data = await response.json();
      
      const userProfile: UserProfileData = {
        full_name: data.full_name || user.full_name || "",
        email: data.email || user.email || "",
        username: data.username || (user as any).username || "",
        birthdate: data.birthdate || "",
        profile_photo: data.profile_photo || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      };
      setProfileData(userProfile);
      
    } catch (error: any) {
      console.error("Error in fetchUserProfile:", error);
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to load profile. Please try again.');
      }
      
      // Fallback to user data from context
      if (user) {
        const fallbackProfile: UserProfileData = {
          full_name: user.full_name || "",
          email: user.email || "",
          username: (user as any).username || "",
          birthdate: (user as any).birthdate || "",
          profile_photo: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        };
        setProfileData(fallbackProfile);
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
    setEditFormData({
      ...profileData,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setShowConfirmModal(false);
    setEditFormData({
      full_name: "",
      email: "",
      username: "",
      birthdate: "",
      profile_photo: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowOTPModal(false);
    setOtpCode("");
    setNewEmail("");
    setOtpError(null);
    setEmailValidation({ isValid: true, isChecking: false, message: "" });
    setCanSendOTP(false);
    setOtpSent(false);
  };

  const validateEmail = async (email: string) => {
    if (!email || email === profileData.email) {
      setEmailValidation({ isValid: true, isChecking: false, message: "" });
      setCanSendOTP(false);
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({ 
        isValid: false, 
        isChecking: false, 
        message: "Please enter a valid email address" 
      });
      setCanSendOTP(false);
      return;
    }

    try {
      setEmailValidation({ isValid: true, isChecking: true, message: "Checking email availability..." });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setEmailValidation({ 
          isValid: false, 
          isChecking: false, 
          message: "Authentication required" 
        });
        setCanSendOTP(false);
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/check-email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check email availability');
      }

      const data = await response.json();
      
      if (data.exists) {
        setEmailValidation({ 
          isValid: false, 
          isChecking: false, 
          message: "This email address is already in use" 
        });
        setCanSendOTP(false);
      } else {
        setEmailValidation({ 
          isValid: true, 
          isChecking: false, 
          message: "Email is available" 
        });
        setCanSendOTP(true);
      }
    } catch (error) {
      console.error('Email validation error:', error);
      setEmailValidation({ 
        isValid: false, 
        isChecking: false, 
        message: "Unable to verify email. Please try again." 
      });
      setCanSendOTP(false);
    }
  };

  const handleSendOTP = async () => {
    if (!canSendOTP || !editFormData.email) return;

    try {
      setOtpLoading(true);
      setOtpError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setOtpError("Authentication required");
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/send-email-change-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_email: editFormData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send OTP');
      }

      setNewEmail(editFormData.email);
      setOtpSent(true);
      setShowOTPModal(true);
      Alert.alert("OTP Sent", "Please check your email for the verification code.");
    } catch (error: any) {
      console.error('Send OTP error:', error);
      setOtpError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setOtpError("Please enter the OTP code");
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setOtpError("No access token available");
        return;
      }

      // Verify OTP and update email
      const verifyResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/verify-email-change`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_email: newEmail,
          otp_code: otpCode,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.detail || 'Failed to verify OTP');
      }

      // Now update the rest of the profile
      const profileUpdateData = {
        full_name: editFormData.full_name,
        username: editFormData.username,
        birthdate: editFormData.birthdate || null,
        profile_photo: editFormData.profile_photo || null,
      };

      const profileResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileUpdateData),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      // Update password if provided
      if (editFormData.newPassword) {
        const passwordResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/change-password`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: editFormData.currentPassword,
            new_password: editFormData.newPassword,
          }),
        });

        if (!passwordResponse.ok) {
          const errorData = await passwordResponse.json();
          throw new Error(errorData.detail || 'Failed to update password');
        }
      }

      // Update local state immediately
      setProfileData({
        full_name: editFormData.full_name,
        email: newEmail, // Use the new verified email
        username: editFormData.username,
        birthdate: editFormData.birthdate || "",
        profile_photo: editFormData.profile_photo || profileData.profile_photo,
      });

      Alert.alert("Success", "Profile and email updated successfully!");
      setIsEditingProfile(false);
      setShowOTPModal(false);
      
      // Refresh user data in background
      await refreshUserData();
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      setOtpError(error.message || "Failed to verify OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!editFormData.full_name.trim()) {
      Alert.alert("Error", "Full name is required");
      return false;
    }

    if (!editFormData.email.trim()) {
      Alert.alert("Error", "Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    if (!editFormData.username.trim()) {
      Alert.alert("Error", "Username is required");
      return false;
    }

    // If user wants to change password, validate password fields
    if (editFormData.newPassword || editFormData.confirmPassword) {
      if (!editFormData.currentPassword) {
        Alert.alert("Error", "Current password is required to change password");
        return false;
      }

      if (editFormData.newPassword.length < 6) {
        Alert.alert("Error", "New password must be at least 6 characters long");
        return false;
      }

      if (editFormData.newPassword !== editFormData.confirmPassword) {
        Alert.alert("Error", "New passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const confirmSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      setIsSaving(true);
      setShowConfirmModal(false);

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert("Error", "No access token available");
        return;
      }

      // Check if email is being changed
      const emailChanged = editFormData.email !== profileData.email;
      
      if (emailChanged) {
        // Check if OTP was already sent and verified
        if (!otpSent) {
          Alert.alert("Email Verification Required", "Please verify your new email address by clicking 'Send OTP' first.");
          setIsSaving(false);
          return;
        }
        
        // If OTP was sent but not verified yet, show the modal
        if (!showOTPModal) {
          setNewEmail(editFormData.email);
          setShowOTPModal(true);
          setIsSaving(false);
          return;
        }
      }

      // Update profile information (without email change)
      const profileUpdateData = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        username: editFormData.username,
        birthdate: editFormData.birthdate || null,
        profile_photo: editFormData.profile_photo || null,
      };

      const profileResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileUpdateData),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      // Update password if provided
      if (editFormData.newPassword) {
        const passwordResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/change-password`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: editFormData.currentPassword,
            new_password: editFormData.newPassword,
          }),
        });

        if (!passwordResponse.ok) {
          const errorData = await passwordResponse.json();
          throw new Error(errorData.detail || 'Failed to update password');
        }
      }

      // Update local state immediately for better UX
      setProfileData({
        full_name: editFormData.full_name,
        email: editFormData.email,
        username: editFormData.username,
        birthdate: editFormData.birthdate || "",
        profile_photo: editFormData.profile_photo || profileData.profile_photo,
      });

      Alert.alert("Success", "Profile updated successfully!");
      setIsEditingProfile(false);
      
      // Refresh user data in background
      await refreshUserData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettings = () => {
    console.log("Settings");
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <Header variant="default" title="Profile" showSettings={false} />
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <Text style={tw`text-gray-600 mt-4 text-center`}>Loading your profile...</Text>
          {error && (
            <View style={tw`mt-4 p-4 bg-red-50 rounded-lg`}>
              <Text style={tw`text-red-600 text-center text-sm`}>{error}</Text>
              <TouchableOpacity 
                style={tw`mt-2 px-4 py-2 bg-red-600 rounded-lg`}
                onPress={() => {
                  setError(null);
                  fetchUserProfile();
                }}
              >
                <Text style={tw`text-white text-center font-medium`}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Navbar activeTab="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Header variant="default" title="Profile" showSettings={false} />
      
      {!isEditingProfile ? (
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
                  source={{ uri: profileData.profile_photo }}
                  style={tw`w-20 h-20 rounded-full`}
                />
              </View>

              <View style={tw`flex-1`}>
                <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
                  {profileData.full_name || "User"}
                </Text>
                <Text style={tw`text-sm text-gray-600 mb-2`}>
                  @{profileData.username || "username"}
                </Text>
                <View
                  style={[
                    tw`px-2 py-1 rounded-md self-start`,
                    { backgroundColor: "#ECFDF5" },
                  ]}
                >
                  <Text style={tw`text-xs font-semibold text-green-700`}>
                    Registered User
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
          </View>

          {/* Personal Information */}
          <View style={tw`bg-white mt-3 p-4`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
              Personal Information
            </Text>
            
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <User size={18} color="#6B7280" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs text-gray-500 mb-1`}>Full Name</Text>
                <Text style={tw`text-sm text-gray-700`}>
                  {profileData.full_name || "Not provided"}
                </Text>
              </View>
            </View>

            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Mail size={18} color="#6B7280" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs text-gray-500 mb-1`}>Email</Text>
                <Text style={tw`text-sm text-gray-700`}>
                  {profileData.email || "Not provided"}
                </Text>
              </View>
            </View>

            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <AtSign size={18} color="#6B7280" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs text-gray-500 mb-1`}>Username</Text>
                <Text style={tw`text-sm text-gray-700`}>
                  @{profileData.username || "Not provided"}
                </Text>
              </View>
            </View>

            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Calendar size={18} color="#6B7280" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs text-gray-500 mb-1`}>Birth Date</Text>
                <Text style={tw`text-sm text-gray-700`}>
                  {formatDate(profileData.birthdate)}
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
      ) : (
        /* Edit Profile Modal */
        <ScrollView
          style={tw`flex-1 bg-gray-50`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-24`}
        >
          {/* Header */}
          <View style={tw`bg-white p-4 border-b border-gray-200`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center`}>
                <TouchableOpacity
                  style={tw`mr-3 p-2 rounded-full bg-gray-100`}
                  onPress={handleCancelEdit}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-gray-900`}>Edit Profile</Text>
              </View>
              <TouchableOpacity
                style={[
                  tw`px-6 py-3 rounded-lg flex-row items-center`,
                  { backgroundColor: Colors.primary.blue },
                ]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Save size={16} color="white" />
                    <Text style={tw`text-white font-semibold text-sm ml-2`}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Photo Section */}
          <View style={tw`bg-white mt-3 p-6`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Profile Photo</Text>

            {/* Profile Photo */}
            <View style={tw`items-center mb-6`}>
              <Image
                source={{ uri: editFormData.profile_photo || profileData.profile_photo }}
                style={tw`w-24 h-24 rounded-full mb-3`}
              />
              <TouchableOpacity>
                <Text style={[tw`text-sm font-medium`, { color: Colors.primary.blue }]}>
                  Change Photo
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Personal Information Section */}
          <View style={tw`bg-white mt-3 p-6`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-6`}>Personal Information</Text>
            
            <View style={tw`mb-5`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Full Name *</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-xl px-4 py-4 text-base bg-gray-50 h-14`}
                value={editFormData.full_name}
                onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, full_name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Email Address *</Text>
              <View style={tw`flex-row items-stretch gap-3`}>
                <View style={tw`flex-1`}>
                  <TextInput
                    style={tw`border border-gray-300 rounded-xl px-4 py-4 text-base bg-gray-50 h-14`}
                    value={editFormData.email}
                    onChangeText={(text: string) => {
                      setEditFormData(prev => ({ ...prev, email: text }));
                      
                      // Clear previous timeout
                      if (emailValidationTimeout) {
                        clearTimeout(emailValidationTimeout);
                      }
                      
                      // Set new timeout for debounced validation
                      const newTimeout = setTimeout(() => validateEmail(text), 500);
                      setEmailValidationTimeout(newTimeout);
                    }}
                    placeholder="Enter your email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    tw`px-6 rounded-xl flex items-center justify-center h-14 min-w-28`,
                    canSendOTP 
                      ? { backgroundColor: Colors.primary.blue }
                      : tw`bg-gray-300`
                  ]}
                  onPress={handleSendOTP}
                  disabled={!canSendOTP || otpLoading || emailValidation.isChecking}
                  activeOpacity={0.8}
                >
                  {otpLoading || emailValidation.isChecking ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={[
                      tw`font-semibold text-sm text-center`,
                      canSendOTP ? tw`text-white` : tw`text-gray-500`
                    ]}>
                      {otpSent ? "Resend" : "Send OTP"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Email validation feedback */}
              {emailValidation.message ? (
                <View style={tw`mt-2 flex-row items-center`}>
                  <View style={[
                    tw`w-2 h-2 rounded-full mr-2 flex-shrink-0`,
                    emailValidation.isValid ? tw`bg-green-500` : tw`bg-red-500`
                  ]} />
                  <Text style={[
                    tw`text-sm flex-1`,
                    emailValidation.isValid ? tw`text-green-600` : tw`text-red-600`
                  ]}>
                    {emailValidation.message}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Username *</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-xl px-4 py-4 text-base bg-gray-50 h-14`}
                value={editFormData.username}
                onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, username: text }))}
                placeholder="Enter your username"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={tw`mb-2`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Birth Date</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-xl px-4 py-4 text-base bg-gray-50 h-14`}
                value={editFormData.birthdate}
                onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, birthdate: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

          </View>

          {/* Password Change Section */}
          <View style={tw`bg-white mt-3 p-6`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Security</Text>
            <Text style={tw`text-sm text-gray-600 mb-6`}>
              Leave password fields blank if you don&apos;t want to change your password
            </Text>

            <View style={tw`mb-5`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Current Password</Text>
              <View style={tw`relative`}>
                <TextInput
                  style={tw`border border-gray-300 rounded-xl px-4 py-4 pr-12 text-base bg-gray-50 h-14`}
                  value={editFormData.currentPassword}
                  onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, currentPassword: text }))}
                  placeholder="Enter current password"
                  secureTextEntry={!showCurrentPassword}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={tw`absolute right-4 top-0 bottom-0 flex items-center justify-center`}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>New Password</Text>
              <View style={tw`relative`}>
                <TextInput
                  style={tw`border border-gray-300 rounded-xl px-4 py-4 pr-12 text-base bg-gray-50 h-14`}
                  value={editFormData.newPassword}
                  onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, newPassword: text }))}
                  placeholder="Enter new password (min. 6 characters)"
                  secureTextEntry={!showNewPassword}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={tw`absolute right-4 top-0 bottom-0 flex items-center justify-center`}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={tw`mb-2`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Confirm New Password</Text>
              <View style={tw`relative`}>
                <TextInput
                  style={tw`border border-gray-300 rounded-xl px-4 py-4 pr-12 text-base bg-gray-50 h-14`}
                  value={editFormData.confirmPassword}
                  onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, confirmPassword: text }))}
                  placeholder="Confirm your new password"
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={tw`absolute right-4 top-0 bottom-0 flex items-center justify-center`}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
          <View style={tw`bg-white rounded-xl p-6 mx-4 w-full max-w-sm`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-3 text-center`}>
              Confirm Changes
            </Text>
            <Text style={tw`text-sm text-gray-600 mb-6 text-center`}>
              Are you sure you want to save these changes to your profile?
            </Text>
            
            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                style={tw`flex-1 mr-2 px-4 py-3 bg-gray-200 rounded-lg`}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={tw`text-gray-700 font-medium text-center`}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  tw`flex-1 ml-2 px-4 py-3 rounded-lg flex-row items-center justify-center`,
                  { backgroundColor: Colors.primary.blue }
                ]}
                onPress={confirmSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={tw`text-white font-medium`}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
          <View style={tw`bg-white rounded-xl p-6 mx-4 w-full max-w-sm`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-3 text-center`}>
              Verify New Email
            </Text>
            <Text style={tw`text-sm text-gray-600 mb-4 text-center`}>
              {`We've sent a 6-digit verification code to ${newEmail}. Please check your email and enter the code below to verify your new email address.`}
            </Text>
            
            <View style={tw`mb-4`}>
              <TextInput
                style={tw`border border-gray-300 rounded-lg px-4 py-3 text-center text-lg font-mono tracking-widest h-14`}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {otpError && (
              <View style={tw`mb-4 p-3 bg-red-50 rounded-lg`}>
                <Text style={tw`text-red-600 text-sm text-center`}>{otpError}</Text>
              </View>
            )}
            
            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                style={tw`flex-1 mr-2 px-4 py-3 bg-gray-200 rounded-lg`}
                onPress={() => {
                  setShowOTPModal(false);
                  setOtpCode("");
                  setOtpError(null);
                }}
                disabled={otpLoading}
              >
                <Text style={tw`text-gray-700 font-medium text-center`}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  tw`flex-1 ml-2 px-4 py-3 rounded-lg flex-row items-center justify-center`,
                  { backgroundColor: Colors.primary.blue }
                ]}
                onPress={handleVerifyOTP}
                disabled={otpLoading || !otpCode.trim()}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={tw`text-white font-medium`}>Verify & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Navbar activeTab="profile" />
    </SafeAreaView>
  );
};

export default UserProfilePage;
