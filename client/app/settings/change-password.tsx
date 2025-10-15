import React, { useState } from "react";
import { View, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, ChevronRight } from "lucide-react-native";
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { supabase } from "@/config/supabase";

// API Base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Validation function
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!oldPassword) {
      newErrors.oldPassword = "Current password is required";
    }

    if (!password) {
      newErrors.password = "New password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setLoading(true);
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      // Call backend API to change password
      const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: oldPassword,
          new_password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      // Show success toast
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <HStack space="md" className="items-center">
              <CheckCircle size={20} color={Colors.status.success} />
              <VStack space="xs">
                <ToastTitle>Password Changed!</ToastTitle>
                <ToastDescription>Your password has been updated successfully.</ToastDescription>
              </VStack>
            </HStack>
          </Toast>
        ),
      });
      
      // Clear form
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (error: any) {
      console.error("Password change error:", error);
      
      // Show error toast
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <HStack space="md" className="items-center">
              <AlertCircle size={20} color={Colors.status.error} />
              <VStack space="xs">
                <ToastTitle>Password Change Failed</ToastTitle>
                <ToastDescription>{error.message || "Please try again."}</ToastDescription>
              </VStack>
            </HStack>
          </Toast>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Box className="flex-1" style={{ backgroundColor: Colors.background.secondary }}>
      {/* Back Button Header */}
      <Box style={[tw`bg-white p-4 flex-row items-center`, { borderBottomColor: Colors.border.light, borderBottomWidth: 1 }]}>
        <Pressable 
          onPress={() => router.back()}
          style={[tw`p-2 rounded-lg`, { backgroundColor: Colors.background.tertiary }]}
        >
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <ChevronRight size={24} color={Colors.text.secondary} />
          </View>
        </Pressable>
      </Box>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Box 
          className="bg-white rounded-2xl p-6 mb-6" 
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}
        >
          <HStack className="items-center mb-4">
            <Box 
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: Colors.primary.blue + '20' }}
            >
              <Lock size={24} color={Colors.primary.blue} />
            </Box>
            <VStack className="flex-1">
              <GSText size="lg" bold style={{ color: Colors.text.primary }}>
                Change Password
              </GSText>
              <GSText size="xs" style={{ color: Colors.text.secondary, marginTop: 2 }}>
                Update your account password for better security
              </GSText>
            </VStack>
          </HStack>
        </Box>
        
        {/* Form Card */}
        <Box 
          className="bg-white rounded-2xl p-6 mb-6" 
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}
        >
          {/* Old Password Field */}
          <VStack style={{ marginBottom: 24 }}>
            <GSText size="sm" bold style={{ color: Colors.text.primary, marginBottom: 8 }}>
              Current Password *
            </GSText>
            <View style={{ position: 'relative' }}>
              <Input 
                variant="outline" 
                size="lg" 
                style={{ 
                  borderColor: errors.oldPassword ? Colors.status.error : Colors.border.light,
                  borderRadius: 12,
                  backgroundColor: Colors.background.primary
                }}
              >
                <InputField
                  value={oldPassword}
                  onChangeText={(text) => {
                    setOldPassword(text);
                    if (errors.oldPassword) {
                      setErrors(prev => ({ ...prev, oldPassword: "" }));
                    }
                  }}
                  placeholder="Enter your current password"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={!showOldPassword}
                  style={{ 
                    fontSize: 14, 
                    paddingVertical: 12, 
                    paddingRight: 48,
                    color: Colors.text.primary
                  }}
                />
              </Input>
              <TouchableOpacity
                onPress={() => setShowOldPassword(!showOldPassword)}
                style={{ position: 'absolute', right: 16, top: 14 }}
              >
                {showOldPassword ? (
                  <EyeOff size={20} color={Colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={Colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {errors.oldPassword ? (
              <HStack className="items-center mt-2">
                <AlertCircle size={16} color={Colors.status.error} />
                <GSText size="xs" style={{ color: Colors.status.error, marginLeft: 6 }}>
                  {errors.oldPassword}
                </GSText>
              </HStack>
            ) : (
              <GSText size="xs" style={{ color: Colors.text.secondary, marginTop: 8 }}>
                Enter your current password to verify your identity
              </GSText>
            )}
          </VStack>

          {/* New Password Field */}
          <VStack style={{ marginBottom: 24 }}>
            <GSText size="sm" bold style={{ color: Colors.text.primary, marginBottom: 8 }}>
              New Password *
            </GSText>
            <View style={{ position: 'relative' }}>
              <Input 
                variant="outline" 
                size="lg" 
                style={{ 
                  borderColor: errors.password ? Colors.status.error : Colors.border.light,
                  borderRadius: 12,
                  backgroundColor: Colors.background.primary
                }}
              >
                <InputField
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: "" }));
                    }
                  }}
                  placeholder="Enter your new password"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={!showPassword}
                  style={{ 
                    fontSize: 14, 
                    paddingVertical: 12, 
                    paddingRight: 48,
                    color: Colors.text.primary
                  }}
                />
              </Input>
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 16, top: 14 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={Colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <HStack className="items-center mt-2">
                <AlertCircle size={16} color={Colors.status.error} />
                <GSText size="xs" style={{ color: Colors.status.error, marginLeft: 6 }}>
                  {errors.password}
                </GSText>
              </HStack>
            ) : (
              <GSText size="xs" style={{ color: Colors.text.secondary, marginTop: 8 }}>
                Must be at least 6 characters long
              </GSText>
            )}
          </VStack>

          {/* Confirm Password Field */}
          <VStack style={{ marginBottom: 0 }}>
            <GSText size="sm" bold style={{ color: Colors.text.primary, marginBottom: 8 }}>
              Confirm New Password *
            </GSText>
            <View style={{ position: 'relative' }}>
              <Input 
                variant="outline" 
                size="lg" 
                style={{ 
                  borderColor: errors.confirmPassword ? Colors.status.error : Colors.border.light,
                  borderRadius: 12,
                  backgroundColor: Colors.background.primary
                }}
              >
                <InputField
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  placeholder="Confirm your new password"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={!showConfirmPassword}
                  style={{ 
                    fontSize: 14, 
                    paddingVertical: 12, 
                    paddingRight: 48,
                    color: Colors.text.primary
                  }}
                />
              </Input>
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: 16, top: 14 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={Colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={Colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <HStack className="items-center mt-2">
                <AlertCircle size={16} color={Colors.status.error} />
                <GSText size="xs" style={{ color: Colors.status.error, marginLeft: 6 }}>
                  {errors.confirmPassword}
                </GSText>
              </HStack>
            ) : (
              <GSText size="xs" style={{ color: Colors.text.secondary, marginTop: 8 }}>
                Re-enter your new password to confirm
              </GSText>
            )}
          </VStack>
        </Box>

        {/* Action Buttons */}
        <HStack space="sm" className="mt-6">
          <TouchableOpacity
            onPress={handleCancel}
            disabled={loading}
            style={[
              tw`flex-1 py-3 px-4 rounded-lg border flex-row items-center justify-center`,
              {
                borderColor: Colors.border.light,
                backgroundColor: Colors.background.primary,
                opacity: loading ? 0.5 : 1,
                minHeight: 48
              }
            ]}
            activeOpacity={0.7}
          >
            <GSText size="sm" style={{ color: Colors.text.secondary, fontWeight: '600' }}>
              Cancel
            </GSText>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading}
            style={[
              tw`flex-1 py-3 px-4 rounded-lg flex-row items-center justify-center`,
              {
                backgroundColor: loading ? Colors.secondary.lightGray : Colors.primary.blue,
                opacity: loading ? 0.8 : 1,
                minHeight: 48,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }
            ]}
            activeOpacity={0.7}
          >
            {loading && (
              <ActivityIndicator size="small" color={Colors.text.white} style={tw`mr-2`} />
            )}
            <GSText size="sm" style={{ color: Colors.text.white, fontWeight: '600' }}>
              {loading ? "Changing..." : "Change Password"}
            </GSText>
          </TouchableOpacity>
        </HStack>
      </ScrollView>
      
      <Navbar />
    </Box>
  );
}
