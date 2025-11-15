import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Colors from "../constants/Colors";
import Header from "../components/Header";
import { Ionicons } from "@expo/vector-icons";
import logo from "../assets/images/logo.png";
import { useToast, Toast, ToastTitle, ToastDescription } from "../components/ui/toast";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const toast = useToast();
  const { signIn, continueAsGuest, isLoading: authLoading, isAuthenticated } = useAuth();
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
  
  // Clear form on mount and when auth state changes; let AuthGuard handle redirects
  useEffect(() => {
    setEmail("");
    setPassword("");
    setEmailError("");
    setPasswordError("");
    setShowPassword(false);
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
      const result = await signIn(email.toLowerCase().trim(), password);

      if (result.suppressToast) {
        return;
      }

      if (result.success) {
        toast.show({
          placement: "top",
          render: ({ id }) => (
            <Toast nativeID={id} action="success" variant="solid" className="mt-12">
              <ToastTitle size="md">Welcome back!</ToastTitle>
              <ToastDescription size="sm">Redirecting...</ToastDescription>
            </Toast>
          ),
        });
      } else {
        // Show error toast (debounced for Access denied)
        const now = Date.now();
        const isAccessDenied = (result.error || "").toLowerCase().includes("access denied");
        const recentlyShown = now - lastDeniedAtRef.current < 2000;
        if (isAccessDenied) {
          if (deniedToastInProgressRef.current) return;
          if (recentlyShown) return;
          deniedToastInProgressRef.current = true;
          lastDeniedAtRef.current = now;
          toast.show({
            placement: "top",
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                <ToastTitle size="md">Access denied</ToastTitle>
              </Toast>
            ),
          });
          setTimeout(() => { deniedToastInProgressRef.current = false; }, 2000);
        } else {
          toast.show({
            placement: "top",
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                <ToastTitle size="md">Login Failed</ToastTitle>
                <ToastDescription size="sm">{result.error || "Invalid email or password"}</ToastDescription>
              </Toast>
            ),
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid" className="mt-12">
            <ToastTitle size="md">Connection Error</ToastTitle>
            <ToastDescription size="sm">Please check your internet connection</ToastDescription>
          </Toast>
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google login
    console.log("Google login pressed");
  };

  const handleBack = () => {
    // @ts-ignore: canGoBack may not exist on some expo-router versions
    if (typeof (router as any).canGoBack === 'function' && (router as any).canGoBack()) {
      router.back();
    } else {
      router.push('/role-selection');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      <Header 
        showBackButton={true}
        onBackPress={handleBack}
        backgroundColor={Colors.background.primary}
      />
      
      <View style={tw`flex-1 bg-white`}>
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`flex-grow`}
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
            <TouchableOpacity>
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

          {/* OR Separator */}
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`flex-1 h-px bg-gray-300`} />
            <Text style={[tw`mx-4 text-sm`, { color: Colors.text.sub }]}>
              OR
            </Text>
            <View style={tw`flex-1 h-px bg-gray-300`} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={tw`flex-row items-center justify-center py-3 bg-white border border-gray-300 rounded-lg`}
            onPress={handleGoogleLogin}
          >
            <Image
              source={require("../assets/images/registration/google.png")}
              style={[tw`mr-2`, { width: 22, height: 22 }]}
              resizeMode="contain"
            />
            <Text
              style={[tw`text-lg font-semibold`]}
            >
              Login with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={continueAsGuest}
            style={tw`mt-3`}
            activeOpacity={0.7}
          >
            <Text style={[tw`text-center`, { color: Colors.text.head }]}>
              Continue as <Text style={{ color: Colors.primary.blue, fontWeight: '700' }}>Guest</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={tw`items-center px-6 pb-8`}>
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
