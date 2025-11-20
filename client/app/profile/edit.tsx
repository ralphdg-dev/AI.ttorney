import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Save,
  X,
  User,
  Camera,
  Image as ImageIcon,
} from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import Navbar from "../../components/Navbar";
import Colors from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/AuthGuard";
import tw from "tailwind-react-native-classnames";
import { supabase } from "../../config/supabase";
import { useRouter } from "expo-router";
import { useToast, Toast, ToastTitle, ToastDescription } from "../../components/ui/toast";
import { Avatar, AvatarImage, AvatarFallbackText } from "../../components/ui/avatar";
import { VStack } from "../../components/ui/vstack";
import { createShadowStyle } from "../../utils/shadowUtils";
import { NetworkConfig } from "../../utils/networkConfig";

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
  body?: any | FormData;
  timeout?: number;
}

// Constants
const DEFAULT_PROFILE_PHOTO = "";
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds default
const EMAIL_TIMEOUT_MS = 20000; // 20 seconds for email operations

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
const makeApiRequest = async ({ method, endpoint, body, timeout = DEFAULT_TIMEOUT_MS }: ApiRequestOptions): Promise<Response> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Authentication required");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    
    // Determine if body is FormData
    const isFormData = body instanceof FormData;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${session.access_token}`,
    };
    
    // Only add Content-Type for JSON, let browser set it for FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
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
  const { user, isAuthenticated, refreshUserData } = useAuth();
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  
  // Debounce timers to prevent infinite loops
  const usernameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track last checked values to prevent duplicate checks
  const lastCheckedUsernameRef = useRef<string>("");
  const lastCheckedEmailRef = useRef<string>("");
  
  // Track checking state with refs to avoid circular dependencies
  const usernameCheckingRef = useRef<boolean>(false);
  const emailCheckingRef = useRef<boolean>(false);

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
    if (!hasChanges() && !selectedImageUri) return false;
    
    // If email changed, must be verified
    if (editFormData.email !== profileData.email && !emailVerified) {
      return false;
    }
    
    return true;
  };

  // Image picker functions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to change your profile photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: pickImageFromCamera },
        { text: 'Photo Library', onPress: pickImageFromLibrary },
        { text: 'Remove Photo', onPress: removeProfilePhoto, style: 'destructive' },
      ]
    );
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setEditFormData(prev => ({ ...prev, profile_photo: result.assets[0].uri }));
    }
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setEditFormData(prev => ({ ...prev, profile_photo: result.assets[0].uri }));
    }
  };

  const removeProfilePhoto = () => {
    setSelectedImageUri(null);
    setEditFormData(prev => ({ ...prev, profile_photo: '' }));
  };

  const uploadProfilePhoto = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Delete old profile photo if it exists
      const currentPhotoUrl = (user as any).photo_url || profileData.profile_photo;
      if (currentPhotoUrl && currentPhotoUrl.includes('user-profile-pics')) {
        try {
          // Extract the full path including photo_url folder
          const urlParts = currentPhotoUrl.split('/user-profile-pics/');
          if (urlParts.length > 1) {
            const fullPath = urlParts[1].split('?')[0]; // Remove query parameters
            if (fullPath.includes('photo_url/')) {
              await supabase.storage
                .from('user-profile-pics')
                .remove([fullPath]);
            }
          }
        } catch (error) {
          console.log('Could not delete old photo:', error);
          // Continue with upload even if deletion fails
        }
      }

      // Create filename with photo_url folder structure
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fileName = `photo_url/profile_${user.id}_${Date.now()}.${fileExtension}`;
      
      // Read the file as ArrayBuffer for React Native
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Upload to Supabase storage using ArrayBuffer
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-profile-pics')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExtension}`,
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('user-profile-pics')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Load profile data on mount - only run once when user is first loaded
  useEffect(() => {
    if (user && isLoading) {
      const fallbackProfile = {
        full_name: user.full_name || "",
        email: user.email || "",
        username: (user as any).username || "",
        birthdate: (user as any).birthdate || "",
        profile_photo: (user as any).photo_url || (user as any).profile_photo || DEFAULT_PROFILE_PHOTO,
      };
      setProfileData(fallbackProfile);
      setEditFormData({
        ...fallbackProfile,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      // Reset all checking states
      setUsernameAvailable(null);
      setUsernameError("");
      setUsernameChecking(false);
      setEmailAvailable(null);
      setEmailError("");
      setEmailChecking(false);
      setEmailVerified(false);
      usernameCheckingRef.current = false;
      emailCheckingRef.current = false;
      lastCheckedUsernameRef.current = "";
      lastCheckedEmailRef.current = "";
      
      setIsLoading(false);
    }
  }, [user, isLoading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, []);

  const handleCancel = () => {
    if (hasChanges() || emailVerified) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setEmailVerified(false);
              setNewEmail("");
              router.push('/profile');
            }
          }
        ]
      );
    } else {
      router.push('/profile');
    }
  };

  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username === profileData.username) {
      setUsernameAvailable(null);
      setUsernameError("");
      setUsernameChecking(false);
      lastCheckedUsernameRef.current = "";
      return;
    }

    if (username === lastCheckedUsernameRef.current && usernameCheckingRef.current) return;

    if (username.length < 3) {
      setUsernameAvailable(false);
      setUsernameError("Username must be at least 3 characters");
      setUsernameChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(false);
      setUsernameError("Only letters, numbers, and underscores allowed");
      setUsernameChecking(false);
      return;
    }

    if (usernameCheckingRef.current) return;

    try {
      usernameCheckingRef.current = true;
      setUsernameChecking(true);
      setUsernameError("");
      lastCheckedUsernameRef.current = username;

      const response = await makeApiRequest({
        method: 'GET',
        endpoint: `/api/user/check-username?username=${encodeURIComponent(username)}`,
        body: undefined
      });

      if (!response.ok) throw new Error('Failed to check username');

      const data = await response.json();
      
      if (data.exists) {
        setUsernameAvailable(false);
        setUsernameError("Username is already taken");
      } else {
        setUsernameAvailable(true);
        setUsernameError("");
      }
    } catch {
      setUsernameAvailable(null);
      setUsernameError("Unable to verify username");
    } finally {
      usernameCheckingRef.current = false;
      setUsernameChecking(false);
    }
  }, [profileData.username]);

  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || email === profileData.email) {
      setEmailAvailable(null);
      setEmailError("");
      setEmailChecking(false);
      lastCheckedEmailRef.current = "";
      return;
    }

    if (email === lastCheckedEmailRef.current && emailCheckingRef.current) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(false);
      setEmailError("Please enter a valid email address");
      setEmailChecking(false);
      return;
    }

    if (emailCheckingRef.current) return;

    try {
      emailCheckingRef.current = true;
      setEmailChecking(true);
      setEmailError("");
      lastCheckedEmailRef.current = email;

      const response = await makeApiRequest({
        method: 'GET',
        endpoint: `/api/user/check-email?email=${encodeURIComponent(email)}`,
        body: undefined
      });

      if (!response.ok) throw new Error('Failed to check email');

      const data = await response.json();
      
      if (data.exists) {
        setEmailAvailable(false);
        setEmailError("Email is already in use");
      } else {
        setEmailAvailable(true);
        setEmailError("Email available - click Send OTP to verify");
      }
    } catch {
      setEmailAvailable(null);
      setEmailError("Unable to verify email");
    } finally {
      emailCheckingRef.current = false;
      setEmailChecking(false);
    }
  }, [profileData.email]);

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

    let profilePhotoUrl = profileData.profile_photo;

    // Upload photo if a new one was selected
    if (selectedImageUri) {
      try {
        const uploadedUrl = await uploadProfilePhoto(selectedImageUri);
        if (uploadedUrl) {
          profilePhotoUrl = uploadedUrl;
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    const updatedData = {
      full_name: editFormData.full_name,
      username: editFormData.username,
      email: emailVerified ? newEmail : profileData.email,
      birthdate: editFormData.birthdate,
      profile_photo: profilePhotoUrl, // Use existing profile_photo field that server recognizes
    };


    // Optimistic update - update local state immediately
    const previousData = profileData;
    setProfileData({
      ...editFormData,
      email: emailVerified ? newEmail : profileData.email,
      profile_photo: profilePhotoUrl || editFormData.profile_photo || DEFAULT_PROFILE_PHOTO,
    });

    // Also update the user context if available
    if (user && profilePhotoUrl) {
      (user as any).profile_photo = profilePhotoUrl;
      (user as any).photo_url = profilePhotoUrl; // Update both fields for compatibility
    }

    try {
      const response = await makeApiRequest({
        method: 'PUT',
        endpoint: '/api/user/profile',
        body: updatedData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const responseData = await response.json();

      // Refresh the user profile to get updated data
      if (refreshUserData) {
        await refreshUserData();
      }

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

      setEmailVerified(false);
      setNewEmail("");

      // Refresh context in background
      await refreshUserData();

      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/profile');
        }
      }, 1500);

    } catch (error: any) {
      // Rollback on failure
      setProfileData(previousData);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[tw`flex-1 justify-center items-center`, { backgroundColor: Colors.background.primary }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={[tw`mt-4 text-base`, { color: Colors.text.secondary }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
  <AuthGuard>
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
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
            <View style={tw`relative`}>
              {(selectedImageUri || editFormData.profile_photo || profileData.profile_photo) ? (
                <View style={[
                  tw`w-24 h-24 rounded-full mb-3 overflow-hidden`,
                  { backgroundColor: Colors.background.tertiary }
                ]}>
                  <Image
                    source={{ 
                      uri: selectedImageUri || 
                           editFormData.profile_photo || 
                           profileData.profile_photo
                    }}
                    style={tw`w-full h-full`}
                  />
                </View>
              ) : (
                <Avatar 
                  size="xl" 
                  style={[
                    tw`mb-3`,
                    { backgroundColor: '#023D7B' }
                  ]}
                >
                  <AvatarFallbackText style={{ color: '#FFFFFF' }}>
                    {editFormData.full_name || profileData.full_name || "User"}
                  </AvatarFallbackText>
                </Avatar>
              )}
              {isUploadingPhoto && (
                <View style={[
                  tw`absolute inset-0 rounded-full flex items-center justify-center`,
                  { backgroundColor: 'rgba(0,0,0,0.5)' }
                ]}>
                  <ActivityIndicator size="large" color="white" />
                </View>
              )}
            </View>
            
            <View style={tw`flex-row items-center justify-center mt-4 px-4`}>
              <TouchableOpacity
                style={[
                  tw`flex-row items-center justify-center px-4 py-3 rounded-lg mr-2`,
                  { 
                    backgroundColor: Colors.primary.blue,
                    flex: 1,
                    maxWidth: 140
                  }
                ]}
                onPress={showImagePickerOptions}
                disabled={isUploadingPhoto}
              >
                <Camera size={16} color="white" />
                <Text style={[tw`text-sm font-medium ml-2`, { color: Colors.text.white }]}>
                  Change
                </Text>
              </TouchableOpacity>
              
              {(selectedImageUri || editFormData.profile_photo) && (
                <TouchableOpacity
                  style={[
                    tw`flex-row items-center justify-center px-4 py-3 rounded-lg ml-2`,
                    { 
                      backgroundColor: Colors.status.error,
                      flex: 1,
                      maxWidth: 140
                    }
                  ]}
                  onPress={removeProfilePhoto}
                  disabled={isUploadingPhoto}
                >
                  <X size={16} color="white" />
                  <Text style={[tw`text-sm font-medium ml-2`, { color: Colors.text.white }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
                
                // Clear previous timeout
                if (usernameTimeoutRef.current) {
                  clearTimeout(usernameTimeoutRef.current);
                  usernameTimeoutRef.current = null;
                }
                
                // Reset states immediately
                setUsernameAvailable(null);
                setUsernameError("");
                setUsernameChecking(false);
                usernameCheckingRef.current = false;
                
                // Reset last checked to allow re-checking if user types same value again
                lastCheckedUsernameRef.current = "";
                
                // Debounce username check
                if (text && text !== profileData.username) {
                  usernameTimeoutRef.current = setTimeout(() => {
                    checkUsernameAvailability(text);
                    usernameTimeoutRef.current = null;
                  }, 500);
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
                  
                  // Clear previous timeout
                  if (emailTimeoutRef.current) {
                    clearTimeout(emailTimeoutRef.current);
                    emailTimeoutRef.current = null;
                  }
                  
                  // Reset verification when email changes
                  setEmailVerified(false);
                  setNewEmail("");
                  
                  // Reset states immediately
                  setEmailAvailable(null);
                  setEmailError("");
                  setEmailChecking(false);
                  emailCheckingRef.current = false;
                  
                  // Reset last checked to allow re-checking if user types same value again
                  lastCheckedEmailRef.current = "";
                  
                  // Debounce email check
                  if (text && text !== profileData.email) {
                    emailTimeoutRef.current = setTimeout(() => {
                      checkEmailAvailability(text);
                      emailTimeoutRef.current = null;
                    }, 500);
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
  </AuthGuard>
  );
}
