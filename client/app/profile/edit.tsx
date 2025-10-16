import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Save,
  X,
  User,
} from "lucide-react-native";
import Navbar from "../../components/Navbar";
import Colors from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthContext";
import tw from "tailwind-react-native-classnames";
import { supabase } from "../../config/supabase";
import { useRouter } from "expo-router";
import { useToast, Toast, ToastTitle, ToastDescription } from "../../components/ui/toast";
import { Avatar, AvatarImage, AvatarFallbackText } from "../../components/ui/avatar";
import { VStack } from "../../components/ui/vstack";

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

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: any;
  timeout?: number;
}

// Constants
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_PROFILE_PHOTO = "";
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds default
const EMAIL_TIMEOUT_MS = 20000; // 20 seconds for email operations

// Common styling utilities
const cardStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2
};

const sectionHeaderStyle = {
  backgroundColor: Colors.background.tertiary
};

// Helper function to make API requests with timeout
const makeApiRequest = async ({ method, endpoint, body, timeout = DEFAULT_TIMEOUT_MS }: ApiRequestOptions): Promise<Response> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Authentication required");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
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

export default function EditProfilePage() {
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    full_name: "",
    email: "",
    username: "",
    birthdate: "",
    profile_photo: DEFAULT_PROFILE_PHOTO,
  });

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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string>("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string>("");

  // Helper function to check if there are any changes
  const hasChanges = () => {
    return (
      editFormData.full_name !== profileData.full_name ||
      editFormData.email !== profileData.email ||
      editFormData.username !== profileData.username ||
      editFormData.birthdate !== profileData.birthdate
    );
  };

  // Check if save button should be enabled
  const canSave = () => {
    if (!hasChanges()) return false;
    
    // If email changed, must be verified
    if (editFormData.email !== profileData.email && !emailVerified) {
      return false;
    }
    
    return true;
  };

  // Load profile data on mount
  useEffect(() => {
    if (user) {
      const fallbackProfile = {
        full_name: user.full_name || "",
        email: user.email || "",
        username: (user as any).username || "",
        birthdate: (user as any).birthdate || "",
        profile_photo: DEFAULT_PROFILE_PHOTO,
      };
      setProfileData(fallbackProfile);
      setEditFormData({
        ...fallbackProfile,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsLoading(false);
    }
  }, [user]);

  const handleCancel = () => {
    // Check if there are unsaved changes
    if (hasChanges() || emailVerified) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          {
            text: "Keep Editing",
            style: "cancel"
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              // Reset verification state
              setEmailVerified(false);
              setNewEmail("");
              
              // Navigate back
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/profile');
              }
            }
          }
        ]
      );
    } else {
      // No changes, just go back
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/profile');
      }
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === profileData.username) {
      setUsernameAvailable(null);
      setUsernameError("");
      return;
    }

    if (username.length < 3) {
      setUsernameAvailable(false);
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false);
      setUsernameError("Only letters, numbers, and underscores allowed");
      return;
    }

    try {
      setUsernameChecking(true);
      setUsernameError("");

      const response = await makeApiRequest({
        method: 'GET',
        endpoint: `/api/user/check-username?username=${encodeURIComponent(username)}`,
        body: undefined
      });

      if (!response.ok) {
        throw new Error('Failed to check username');
      }

      const data = await response.json();
      
      if (data.exists) {
        setUsernameAvailable(false);
        setUsernameError("Username is already taken");
      } else {
        setUsernameAvailable(true);
        setUsernameError("");
      }
    } catch (error) {
      console.error("Username check error:", error);
      setUsernameAvailable(null);
      setUsernameError("Unable to verify username");
    } finally {
      setUsernameChecking(false);
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || email === profileData.email) {
      setEmailAvailable(null);
      setEmailError("");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailAvailable(false);
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setEmailChecking(true);
      setEmailError("");

      const response = await makeApiRequest({
        method: 'GET',
        endpoint: `/api/user/check-email?email=${encodeURIComponent(email)}`,
        body: undefined
      });

      if (!response.ok) {
        throw new Error('Failed to check email');
      }

      const data = await response.json();
      
      if (data.exists) {
        setEmailAvailable(false);
        setEmailError("Email is already in use");
      } else {
        setEmailAvailable(true);
        setEmailError("Email available - click Send OTP to verify");
      }
    } catch (error) {
      console.error("Email check error:", error);
      setEmailAvailable(null);
      setEmailError("Unable to verify email");
    } finally {
      setEmailChecking(false);
    }
  };

  const handleSendOTP = async () => {
    if (!editFormData.email || editFormData.email === profileData.email) {
      Alert.alert("Error", "Please enter a new email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);

      const response = await makeApiRequest({
        method: 'POST',
        endpoint: '/api/user/send-email-change-otp',
        body: { new_email: editFormData.email },
        timeout: EMAIL_TIMEOUT_MS
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(errorData.detail || 'Failed to send OTP');
      }

      setNewEmail(editFormData.email);
      setShowOTPModal(true);
      
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>OTP Sent!</ToastTitle>
              <ToastDescription>Check your email for the verification code.</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      const errorMessage = error.message || "Failed to send OTP. Please check your connection and try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);

      const response = await makeApiRequest({
        method: 'POST',
        endpoint: '/api/user/verify-email-change',
        body: { 
          new_email: newEmail,
          otp_code: otpCode 
        },
        timeout: EMAIL_TIMEOUT_MS
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid OTP code');
      }

      // Mark email as verified
      setEmailVerified(true);
      setShowOTPModal(false);
      setOtpCode("");
      
      toast.show({
        placement: "top",
        duration: 2000,
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>Email Verified!</ToastTitle>
              <ToastDescription>You can now save your changes.</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      setOtpError(error.message || "Invalid OTP code");
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = () => {
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

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Check if email changed but not verified
    if (editFormData.email !== profileData.email && !emailVerified) {
      Alert.alert(
        "Email Verification Required", 
        "Please verify your new email address by clicking 'Send OTP' and entering the verification code."
      );
      return;
    }
    
    // Check username validation if changed
    if (editFormData.username !== profileData.username) {
      if (usernameChecking) {
        Alert.alert("Error", "Please wait while we check username availability");
        return;
      }
      if (!usernameAvailable) {
        Alert.alert("Error", usernameError || "Please choose a different username");
        return;
      }
    }
    
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);

    try {
      const response = await makeApiRequest({
        method: 'PUT',
        endpoint: '/api/user/profile',
        body: {
          full_name: editFormData.full_name,
          username: editFormData.username,
          email: emailVerified ? newEmail : profileData.email, // Only update if verified
          birthdate: editFormData.birthdate,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      // Show success toast
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>Profile Updated!</ToastTitle>
              <ToastDescription>Your changes have been saved successfully.</ToastDescription>
            </VStack>
          </Toast>
        ),
      });

      // Update local state
      setProfileData({
        ...editFormData,
        email: emailVerified ? newEmail : profileData.email,
        profile_photo: editFormData.profile_photo || DEFAULT_PROFILE_PHOTO,
      });

      // Reset email verification state
      setEmailVerified(false);
      setNewEmail("");

      // Refresh user data in context
      await refreshUserData();

      // Navigate back
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/profile');
        }
      }, 1500);

    } catch (error: any) {
      console.error("Profile update error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[tw`flex-1 justify-center items-center`, { backgroundColor: Colors.background.secondary }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={[tw`mt-4 text-base`, { color: Colors.text.secondary }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: Colors.background.secondary }]}>
      {/* Back Button Header */}
      <View style={[tw`bg-white p-4 flex-row items-center justify-between`, { borderBottomColor: Colors.border.light, borderBottomWidth: 1 }]}>
        <TouchableOpacity
          style={[tw`p-2 rounded-lg`, { backgroundColor: Colors.background.tertiary }]}
          onPress={handleCancel}
        >
          <X size={24} color={Colors.text.secondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            tw`px-6 py-3 rounded-lg flex-row items-center`,
            { 
              backgroundColor: canSave() && !isSaving ? Colors.primary.blue : '#D1D5DB',
              opacity: canSave() && !isSaving ? 1 : 0.6
            },
          ]}
          onPress={handleSave}
          disabled={isSaving || !canSave()}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save size={16} color={canSave() ? "white" : "#6B7280"} />
              <Text style={[tw`font-semibold text-sm ml-2`, { color: canSave() ? Colors.text.white : '#6B7280' }]}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-28`}
      >
        {/* Profile Photo Section */}
        <View style={[tw`bg-white mx-4 mt-4 p-6 rounded-lg`, cardStyle]}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={[tw`w-8 h-8 rounded-lg flex items-center justify-center mr-3`, sectionHeaderStyle]}>
              <User size={18} color={Colors.text.secondary} />
            </View>
            <Text style={[tw`text-lg font-bold`, { color: Colors.text.primary }]}>Profile Photo</Text>
          </View>

          <View style={tw`items-center`}>
            <Avatar 
              size="xl" 
              style={[
                tw`mb-3`,
                { backgroundColor: Colors.background.tertiary }
              ]}
            >
              <AvatarFallbackText style={{ color: Colors.text.primary }}>
                {editFormData.full_name || profileData.full_name || "User"}
              </AvatarFallbackText>
              <AvatarImage 
                source={{ uri: editFormData.profile_photo || profileData.profile_photo || undefined }} 
                alt="Profile"
              />
            </Avatar>
            <TouchableOpacity>
              <Text style={[tw`text-sm font-medium`, { color: Colors.primary.blue }]}>
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={[tw`bg-white mx-4 mt-4 p-6 rounded-lg`, cardStyle]}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={[tw`w-8 h-8 rounded-lg flex items-center justify-center mr-3`, sectionHeaderStyle]}>
              <User size={18} color={Colors.text.secondary} />
            </View>
            <Text style={[tw`text-lg font-bold`, { color: Colors.text.primary }]}>Personal Information</Text>
          </View>

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
            <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Username *</Text>
            <TextInput
              style={[
                tw`border rounded-xl px-4 py-4 text-base bg-gray-50 h-14`,
                {
                  borderColor: usernameAvailable === true ? '#10B981' : 
                              usernameAvailable === false ? '#EF4444' : '#D1D5DB'
                }
              ]}
              value={editFormData.username}
              onChangeText={(text: string) => {
                setEditFormData(prev => ({ ...prev, username: text }));
                // Debounce username check
                if (text && text !== profileData.username) {
                  setTimeout(() => checkUsernameAvailability(text), 500);
                } else {
                  setUsernameAvailable(null);
                  setUsernameError("");
                }
              }}
              placeholder="Enter your username"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
            {usernameChecking && (
              <View style={tw`flex-row items-center mt-2`}>
                <ActivityIndicator size="small" color="#3B82F6" style={tw`mr-2`} />
                <Text style={tw`text-blue-600 text-sm`}>Checking availability...</Text>
              </View>
            )}
            {!usernameChecking && usernameAvailable === true && (
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`w-2 h-2 rounded-full bg-green-500 mr-2`} />
                <Text style={tw`text-green-600 text-sm font-medium`}>Username is available</Text>
              </View>
            )}
            {!usernameChecking && usernameAvailable === false && usernameError && (
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`w-2 h-2 rounded-full bg-red-500 mr-2`} />
                <Text style={tw`text-red-600 text-sm`}>{usernameError}</Text>
              </View>
            )}
          </View>

          <View style={tw`mb-5`}>
            <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Email Address *</Text>
            <View style={tw`flex-row items-center`}>
              <TextInput
                style={[
                  tw`flex-1 border rounded-xl px-4 py-4 text-base bg-gray-50 h-14`,
                  {
                    borderColor: emailAvailable === true ? '#10B981' : 
                                emailAvailable === false ? '#EF4444' : '#D1D5DB'
                  }
                ]}
                value={editFormData.email}
                onChangeText={(text: string) => {
                  setEditFormData(prev => ({ ...prev, email: text }));
                  // Reset verification when email changes
                  setEmailVerified(false);
                  setNewEmail("");
                  // Debounce email check
                  if (text && text !== profileData.email) {
                    setTimeout(() => checkEmailAvailability(text), 500);
                  } else {
                    setEmailAvailable(null);
                    setEmailError("");
                  }
                }}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={[
                  tw`ml-2 px-4 rounded-lg flex items-center justify-center`,
                  { 
                    backgroundColor: editFormData.email !== profileData.email && emailAvailable === true
                      ? Colors.primary.blue 
                      : '#D1D5DB',
                    height: 56,
                    minWidth: 100
                  }
                ]}
                onPress={handleSendOTP}
                disabled={otpLoading || editFormData.email === profileData.email || emailAvailable !== true}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={[
                    tw`font-semibold text-sm text-center`,
                    { 
                      color: editFormData.email !== profileData.email && emailAvailable === true ? 'white' : '#6B7280',
                      textAlign: 'center',
                      lineHeight: 20
                    }
                  ]}>
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {emailChecking && (
              <View style={tw`flex-row items-center mt-2`}>
                <ActivityIndicator size="small" color="#3B82F6" style={tw`mr-2`} />
                <Text style={tw`text-blue-600 text-sm`}>Checking availability...</Text>
              </View>
            )}
            {emailVerified && (
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`w-2 h-2 rounded-full bg-green-500 mr-2`} />
                <Text style={tw`text-green-600 text-sm font-medium`}>✓ Email verified - ready to save</Text>
              </View>
            )}
            {!emailVerified && !emailChecking && emailAvailable === true && (
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`w-2 h-2 rounded-full bg-green-500 mr-2`} />
                <Text style={tw`text-green-600 text-sm font-medium`}>{emailError || "Email is available"}</Text>
              </View>
            )}
            {!emailChecking && emailAvailable === false && emailError && (
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`w-2 h-2 rounded-full bg-red-500 mr-2`} />
                <Text style={tw`text-red-600 text-sm`}>{emailError}</Text>
              </View>
            )}
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
      </ScrollView>

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
                disabled={isSaving}
              >
                <Text style={tw`text-gray-700 font-medium text-center`}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  tw`flex-1 ml-2 px-4 py-3 rounded-lg flex-row items-center justify-center`,
                  { backgroundColor: Colors.primary.blue }
                ]}
                onPress={confirmSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={tw`text-white font-medium`}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <View style={[
          tw`absolute inset-0 flex items-center justify-center`,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }
        ]}>
          <View style={[tw`bg-white rounded-xl p-6 mx-4`, { width: '90%', maxWidth: 400 }]}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-3 text-center`}>
              Verify Email Change
            </Text>
            <Text style={tw`text-sm text-gray-600 mb-4 text-center`}>
              We sent a verification code to {newEmail}
            </Text>
            
            <TextInput
              style={tw`border border-gray-300 rounded-lg px-4 py-3 text-base text-center mb-2`}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor="#9CA3AF"
            />
            
            {otpError && (
              <Text style={tw`text-red-600 text-sm text-center mb-4`}>
                {otpError}
              </Text>
            )}
            
            <View style={tw`flex-row justify-between mt-4`}>
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
                disabled={otpLoading || otpCode.length !== 6}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={tw`text-white font-medium`}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Navbar activeTab="profile" />
    </SafeAreaView>
  );
}
