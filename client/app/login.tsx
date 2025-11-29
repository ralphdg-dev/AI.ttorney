import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import logo from "../assets/images/logo.png";
import { useToast } from "../components/ui/toast";
import { createSafeAreaToastRenderer } from "../components/ui/SafeAreaToast";
import { useAuth } from "../contexts/AuthContext";
import { useGuest } from "../contexts/GuestContext";
import { NetworkConfig } from "../utils/networkConfig";

export default function Login() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { signIn, isAuthenticated, session } = useAuth();
  const { startGuestSession, isStartingSession } = useGuest();

  // Debug wrapper for guest session start
  const handleContinueAsGuest = async () => {
    try {
      await startGuestSession();
      // Don't set tutorial here - let chatbot page handle it after navigation
      router.push('/chatbot');
    } catch (error) {
      console.error('Failed to start guest session:', error);
    }
  };
  const lastDeniedAtRef = useRef<number>(0);
  const deniedToastInProgressRef = useRef<boolean>(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for input fields
  const passwordInputRef = useRef<TextInput>(null);
  
  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  useEffect(() => {
    if (isAuthenticated) {
      setEmail("");
      setPassword("");
      setEmailError("");
      setPasswordError("");
      setShowPassword(false);
    }
  }, [isAuthenticated]);


  // Validation functions
  const validateEmail = (emailValue: string, showError: boolean = true) => {
    if (!emailValue) {
      if (showError) setEmailError("Email is required");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      if (showError) setEmailError("Invalid email format");
      return false;
    }
    
    setEmailError("");
    return true;
  };
  
  const validatePassword = (passwordValue: string, showError: boolean = true) => {
    if (!passwordValue) {
      if (showError) setPasswordError("Password is required");
      return false;
    }
    
    if (passwordValue.length < 6) {
      if (showError) setPasswordError("Must be at least 6 characters");
      return false;
    }
    
    setPasswordError("");
    return true;
  };
  
  const handleLogin = async () => {
    // Validate inputs
    const isEmailValid = validateEmail(email, true);
    const isPasswordValid = validatePassword(password, true);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log('🔐 [LOGIN] Starting login attempt...');
      console.log('🔍 [LOGIN] Email:', email.toLowerCase().trim());
      console.log('🔍 [LOGIN] Password length:', password.length);
      
      const result = await signIn(email.toLowerCase().trim(), password);
      
      console.log('🔍 [LOGIN] SignIn result:', JSON.stringify(result, null, 2));
      console.log('🔍 [LOGIN] Result success:', result.success);
      console.log('🔍 [LOGIN] Result error:', result.error);
      console.log('🔍 [LOGIN] Result data:', result.data);

      if (result.success) {
        console.log('✅ [LOGIN] Login successful!');
        
        // Check if user needs email verification
        const requiresVerification = result.data?.requires_verification || false;
        const otpSent = result.data?.otp_sent || false;
        
        console.log('🔍 [LOGIN] Requires verification:', requiresVerification);
        console.log('🔍 [LOGIN] OTP sent:', otpSent);
        console.log('🔍 [LOGIN] Profile data:', result.data?.profile);
        console.log('🔍 [LOGIN] Redirect path:', result.data?.redirect_path);
        
        if (requiresVerification && otpSent) {
          console.log('📧 [LOGIN] User needs verification - showing info toast');
          // Show message for unverified users
          toast.show({
            placement: "top",
            render: createSafeAreaToastRenderer(
              'top',
              'info',
              'solid',
              'Verification Required',
              'We sent a verification code to your email. Redirecting to verification...'
            ),
          });
        } else {
          console.log('🎉 [LOGIN] Regular login success - showing success toast');
          // Regular login success
          toast.show({
            placement: "top",
            render: createSafeAreaToastRenderer(
              'top',
              'success',
              'solid',
              'Welcome back!',
              'Redirecting...'
            ),
          });
          
          // Handle navigation directly from login component
          const redirectPath = result.data?.redirect_path;
          if (redirectPath) {
            console.log('🔄 [LOGIN] Handling navigation directly to:', redirectPath);
            
            // Test API call to verify server token recognition
            const testServerToken = async (mockToken?: string) => {
              try {
                // Use token from result data if session not available yet
                const tokenToTest = mockToken || session?.access_token;
                
                console.log('🔍 [LOGIN] Current session state:', !!session);
                console.log('🔍 [LOGIN] Session access_token:', session?.access_token?.substring(0, 30) + '...');
                console.log('🔍 [LOGIN] Token to test:', tokenToTest?.substring(0, 30) + '...');
                
                if (tokenToTest) {
                  console.log('🔍 [LOGIN] Testing server token recognition...');
                  console.log('🔍 [LOGIN] Token being sent:', tokenToTest.substring(0, 30) + '...');
                  
                  const API_URL = await NetworkConfig.getBestApiUrl();
                  
                  // Test with the new bypassed token test endpoint
                  const response = await fetch(`${API_URL}/api/auth/test-bypassed-token`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${tokenToTest}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  console.log('🔍 [LOGIN] Server response status:', response.status);
                  if (response.ok) {
                    const responseData = await response.json();
                    console.log('✅ [LOGIN] Server recognizes bypassed token!');
                    console.log('✅ [LOGIN] Server response:', responseData);
                  } else {
                    const errorText = await response.text();
                    console.error('❌ [LOGIN] Server token test failed:', response.status, errorText);
                    console.error('❌ [LOGIN] This means the server needs to be restarted to pick up bypassed token changes');
                  }
                } else {
                  console.warn('⚠️ [LOGIN] No token available for test yet');
                  // Try again after a short delay
                  setTimeout(() => {
                    console.log('🔄 [LOGIN] Retrying token test...');
                    testServerToken();
                  }, 500);
                }
              } catch (error) {
                console.error('❌ [LOGIN] Token test error:', error);
              }
            };
            
            // Create mock token from profile data for immediate testing
            const profileData = result.data?.profile;
            const mockToken = profileData ? `bypassed_auth_${profileData.id}` : undefined;
            
            // Test token immediately with mock token
            console.log('🔍 [LOGIN] Testing with mock token:', mockToken?.substring(0, 30) + '...');
            testServerToken(mockToken);
            
            setTimeout(() => {
              try {
                console.log('🔄 [LOGIN] Attempting navigation to:', redirectPath);
                
                // Try multiple navigation approaches
                if (redirectPath === '/home') {
                  console.log('🔄 [LOGIN] Navigating to /home...');
                  router.replace('/home' as any);
                } else if (redirectPath === '/lawyer') {
                  console.log('🔄 [LOGIN] Navigating to /lawyer...');
                  router.replace('/lawyer' as any);
                } else {
                  console.log('🔄 [LOGIN] Using original path:', redirectPath);
                  router.replace(redirectPath as any);
                }
                
                console.log('✅ [LOGIN] Navigation completed to:', redirectPath);
              } catch (navError) {
                console.error('❌ [LOGIN] Navigation error:', navError);
                console.log('🔄 [LOGIN] Trying fallback navigation to /index...');
                try {
                  router.replace('/index' as any);
                  console.log('✅ [LOGIN] Fallback navigation to /index completed');
                } catch (fallbackError) {
                  console.error('❌ [LOGIN] Fallback navigation also failed:', fallbackError);
                  console.log('🔄 [LOGIN] Trying root navigation...');
                  router.replace('/' as any);
                }
              }
            }, 2000); // Longer delay to ensure auth state is fully updated
          }
        }
        
        console.log('🔄 [LOGIN] Login component handling complete');
        // AuthContext navigation is disabled, we handle it here
      } else {
        console.error('❌ [LOGIN] Login failed!');
        console.error('❌ [LOGIN] Error message:', result.error);
        console.error('❌ [LOGIN] Full result:', result);
        
        // Show error toast (debounced for Access denied)
        const now = Date.now();
        const isAccessDenied = (result.error || "").toLowerCase().includes("access denied");
        const recentlyShown = now - lastDeniedAtRef.current < 2000;
        
        console.log('🔍 [LOGIN] Error analysis:');
        console.log('  - Is access denied:', isAccessDenied);
        console.log('  - Recently shown:', recentlyShown);
        console.log('  - Toast in progress:', deniedToastInProgressRef.current);
        
        if (isAccessDenied) {
          if (deniedToastInProgressRef.current) return;
          if (recentlyShown) return;
          deniedToastInProgressRef.current = true;
          lastDeniedAtRef.current = now;
          toast.show({
            placement: "top",
            render: createSafeAreaToastRenderer(
              'top',
              'error',
              'solid',
              'Access denied'
            ),
          });
          setTimeout(() => { deniedToastInProgressRef.current = false; }, 2000);
        } else {
          toast.show({
            placement: "top",
            render: createSafeAreaToastRenderer(
              'top',
              'error',
              'solid',
              'Login Failed',
              result.error || "Invalid email or password"
            ),
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.show({
        placement: "top",
        render: createSafeAreaToastRenderer(
          'top',
          'error',
          'solid',
          'Connection Error',
          'Please check your internet connection'
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      <View style={tw`flex-1 bg-white`}>
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={[tw`flex-grow`]}
            keyboardShouldPersistTaps="handled"
          >

          {/* Main Content */}
          <View style={tw`items-center justify-center flex-1 px-6`}>
            {/* Logo Image */}
            <View style={tw`items-center mb-0 -mt-16`}>
              <Image
                source={logo}
                style={tw`w-32 h-32 mb-1`}
                resizeMode="contain"
              />
            </View>

            {/* Login Form */}
            <View style={tw`w-full max-w-sm`}>
          {/* Email Input */}
          <View style={tw`mb-4`}>
            <Text style={[tw`mb-2 font-bold`, { color: Colors.text.head }]}>
              Email
            </Text>
            <TextInput
              style={[
                tw`px-4 py-3 bg-white border rounded-lg`,
                {
                  color: Colors.text.head,
                  borderColor: emailError ? '#ef4444' : '#d1d5db',
                  borderWidth: emailError ? 2 : 1,
                },
              ]}
              placeholder="your.email@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
              onBlur={() => email && validateEmail(email, true)}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              returnKeyType="next"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? (
              <Text style={[tw`mt-1 text-sm`, { color: '#ef4444' }]}>
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={tw`mb-4`}>
            <Text style={[tw`mb-2 font-bold`, { color: Colors.text.head }]}>
              Password
            </Text>
            <View style={tw`relative`}>
              <TextInput
                ref={passwordInputRef}
                style={[
                  tw`px-4 py-3 pr-12 bg-white border rounded-lg`,
                  {
                    color: Colors.text.head,
                    borderColor: passwordError ? '#ef4444' : '#d1d5db',
                    borderWidth: passwordError ? 2 : 1,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
                onBlur={() => password && validatePassword(password, true)}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={tw`absolute right-3 top-3`}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={[tw`mt-1 text-sm`, { color: '#ef4444' }]}>
                {passwordError}
              </Text>
            ) : null}
          </View>

          {/* Forgot Password */}
          <View style={tw`flex-row items-center justify-end mb-6`}>
            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
              <Text style={[tw`text-sm`, { color: Colors.primary.blue }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              tw`items-center justify-center py-3 mb-3 rounded-lg`,
              { 
                backgroundColor: isSubmitting ? '#9CA3AF' : Colors.primary.blue,
                opacity: isSubmitting ? 0.7 : 1
              },
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            <Text style={tw`text-lg font-semibold text-white`}>
              {isSubmitting ? 'Signing In...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinueAsGuest}
            style={tw`mt-3`}
            activeOpacity={0.7}
            disabled={isStartingSession}
          >
            <Text style={[tw`text-center`, { color: Colors.text.head }]}>
              {isStartingSession ? 'Starting...' : 'Continue as'} <Text style={{ color: Colors.primary.blue, fontWeight: '700' }}>Guest</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Section - Fixed at bottom */}
      <View style={[tw`items-center px-6`, { paddingBottom: Math.max(insets.bottom + 24, 48) }]}>
        <Text style={[tw`text-center`, { color: Colors.text.sub }]}>
          Don&apos;t have an account?{" "}
          <Text
            style={[tw`font-bold`, { color: Colors.primary.blue }]}
            onPress={() => router.push('/onboarding/registration')}
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
