import React, { useState, useEffect, useRef } from "react";
import { Alert, Platform, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box } from "../../components/ui/box";
import { VStack } from "../../components/ui/vstack";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { KeyboardAvoidingView } from "../../components/ui/keyboard-avoiding-view";
import { ScrollView } from "../../components/ui/scroll-view";
import { StatusBar } from "../../components/ui/status-bar";
import { Image } from "../../components/ui/image";
import PrimaryButton from "../../components/ui/PrimaryButton";
import Header from "../../components/Header";
import Colors from "../../constants/Colors";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../contexts/AuthContext";
import otpsent from "../../assets/images/otpsent.png";

export default function VerifyOTP() {
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : "user@example.com";
  const { signIn } = useAuth();

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);
  const resendRequestRef = useRef<Promise<any> | null>(null);
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Timer for resend OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, canResend]);

  // Timer for lockout countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Debug logging
      console.log('🔍 Debug - Verifying OTP:', {
        email: email,
        otp_code: otpString,
        otp_type: 'email_verification',
        timestamp: new Date().toISOString()
      });

      const result = await apiClient.verifyOTP({
        email,
        otp_code: otpString,
        otp_type: 'email_verification'
      });

      console.log('🔍 Debug - API Result:', result);

      if (result.error) {
        console.log('❌ Verification failed:', result.error);
        setError(result.error);
        
        // Handle lockout scenario
        if (result.locked_out) {
          setIsLockedOut(true);
          setLockoutTimer(result.retry_after || 900); // 15 minutes default
          setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
        }
        
        // Handle OTP expiration - enable resend immediately (only for actual expiration, not incorrect codes)
        const isExpiredOrNotFound = result.error.includes("expired") || 
                                   result.error.includes("OTP not found") ||
                                   result.error.includes("OTP has expired");
        const isIncorrectCode = result.error.includes("incorrect") || 
                               result.error.includes("invalid") || 
                               result.error.includes("wrong");
        
        // Only enable immediate resend for expired/not found OTPs, not for incorrect codes
        if (isExpiredOrNotFound && !isIncorrectCode) {
          setCanResend(true);
          setResendTimer(0);
          setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
        }
        
        // Handle attempts remaining
        if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
        }
      } else {
        // Success case - OTP verified successfully
        console.log('✅ Email verified successfully!');
        console.log('🔍 Debug - Success result:', result);
        
        // Store verified email
        await AsyncStorage.setItem('user_email', email);
        console.log('📱 Stored email in AsyncStorage');
        
        // Clear form states
        setOtp(["", "", "", "", "", ""]);
        setError("");
        setAttemptsRemaining(null);
        setIsLockedOut(false);
        console.log('🧹 Cleared form states');
        
        // Get password from AsyncStorage (stored during registration)
        const storedPassword = await AsyncStorage.getItem('temp_registration_password');
        
        if (storedPassword) {
          console.log('🔐 Found stored password, signing in user...');
          
          // Sign in the user automatically after verification
          const signInResult = await signIn(email, storedPassword);
          
          if (signInResult.success) {
            console.log('✅ User signed in successfully after verification');
            
            // Clean up temporary password
            await AsyncStorage.removeItem('temp_registration_password');
            
            // Navigate to role selection
            setTimeout(() => {
              console.log('🚀 Navigating to role selection...');
              router.replace('/role-selection');
            }, 500);
          } else {
            console.error('❌ Auto sign-in failed:', signInResult.error);
            // Fallback: navigate to login
            router.replace('/login');
          }
        } else {
          console.log('⚠️ No stored password found, redirecting to login');
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('❌ Verification exception:', error);
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
      console.log('🏁 Verification process completed');
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isResending || resendRequestRef.current) return;

    // Prevent multiple simultaneous requests
    setIsResending(true);
    setCanResend(false); // Immediately disable to prevent rapid clicks
    
    try {
      console.log('🔄 Resending OTP for email:', email);
      
      // Create and store the request promise to prevent duplicates
      const requestPromise = apiClient.sendOTP({
        email,
        otp_type: 'email_verification',
        user_name: 'User'
      });
      
      resendRequestRef.current = requestPromise;
      const result = await requestPromise;

      console.log('📤 Resend OTP result:', result);

      if (result.error) {
        console.error('❌ Resend OTP failed:', result.error);
        Alert.alert("Error", result.error);
        // Re-enable resend on error
        setCanResend(true);
        return;
      }

      // Success - update UI state
      setResendTimer(120); // 2 minutes - this will trigger the timer to start
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setAttemptsRemaining(null);
      setIsLockedOut(false);
      setLockoutTimer(0);

      console.log('✅ OTP resent successfully');
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      
      // Focus first input after a short delay to ensure state is updated
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      
    } catch (error) {
      console.error('❌ Resend OTP exception:', error);
      Alert.alert("Error", "Failed to resend code. Please try again.");
      // Re-enable resend on error
      setCanResend(true);
    } finally {
      setIsResending(false);
      resendRequestRef.current = null; // Clear the request reference
    }
  };


  const handleBack = () => {
    router.back();
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        
        {/* Header - Use same Header component as login/sign-in */}
        <Header 
          showBackButton={true}
          onBackPress={handleBack}
          backgroundColor="white"
        />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Main Content */}
        <VStack className="flex-1 justify-center px-6 mx-auto w-full max-w-md">
          {/* Image and Title */}
          <VStack className="items-center mb-8">
            <Image
              source={otpsent}
              className="mb-4 w-36 h-36"
              resizeMode="contain"
              alt="OTP Sent"
            />
            <Text className="mb-4 text-2xl font-bold text-center text-gray-900">
              Verify Your Email
            </Text>
            <VStack className="items-center space-y-1">
              <Text className="text-base text-center text-gray-600">
                We&apos;ve sent a code to
              </Text>
              <Text className="text-base font-semibold text-gray-900">
                {email}
              </Text>
              <Text className="text-base text-center text-gray-600">
                Enter it below to continue.
              </Text>
            </VStack>
          </VStack>

          {/* OTP Input */}
          <VStack className="items-center mb-8">
            <HStack className="justify-center items-center mb-4 space-x-2">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  className={`w-12 h-14 border-2 rounded-xl text-center font-bold text-xl ${
                    error
                      ? "border-red-500"
                      : digit
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-300"
                  }`}
                  style={{ color: Colors.text.head }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  accessibilityLabel={`Digit ${index + 1}`}
                />
              ))}
            </HStack>

            {error && (
              <Text className="px-4 text-sm text-center text-red-500">
                {error}
              </Text>
            )}

            {/* Show attempts remaining */}
            {attemptsRemaining !== null && attemptsRemaining > 0 && !isLockedOut && (
              <Text className="px-4 mt-2 text-sm text-center text-orange-500">
                {attemptsRemaining} attempt(s) remaining
              </Text>
            )}

            {/* Show lockout timer */}
            {isLockedOut && lockoutTimer > 0 && (
              <Text className="px-4 mt-2 text-sm font-semibold text-center text-red-600">
                Account temporarily locked. Try again in {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
              </Text>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Bottom Section - Match onboarding pattern */}
      <Box className="relative px-6 pb-12 mt-8">
        <PrimaryButton
          title={isLoading ? "Verifying..." : "Verify"}
          onPress={handleVerifyOTP}
          disabled={isLoading || !isOtpComplete || isLockedOut}
          loading={isLoading}
        />

        {/* Resend Code - Below button */}
        <Box className="items-center px-4 sm:px-6 md:px-8 mt-4">
          <Text className="text-sm text-center sm:text-base" style={{ color: Colors.text.sub }}>
            Didn&apos;t receive code?
          </Text>
          <TouchableOpacity
            onPress={!isLockedOut && canResend && !isResending ? handleResendOTP : undefined}
            disabled={isLockedOut || !canResend || isResending}
            className="mt-2"
          >
            <Text
              className="text-sm font-bold sm:text-base text-center"
              style={{
                color: (canResend && !isLockedOut && !isResending) ? Colors.primary.blue : '#9ca3af'
              }}
            >
              {isLockedOut 
                ? "Resend unavailable (locked out)" 
                : isResending
                  ? "Sending..."
                  : canResend 
                    ? "Resend OTP" 
                    : `Resend OTP (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})`
              }
            </Text>
          </TouchableOpacity>
        </Box>
      </Box>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
