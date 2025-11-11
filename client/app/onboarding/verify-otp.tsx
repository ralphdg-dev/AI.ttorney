import React, { useState, useEffect, useRef } from "react";
import { Alert, Platform, TextInput, TouchableOpacity } from "react-native";
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
import BackButton from "../../components/ui/BackButton";
import Colors from "../../constants/Colors";
import { apiClient } from "../../lib/api-client";
import otpsent from "../../assets/images/otpsent.png";

export default function VerifyOTP() {
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : "user@example.com";

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);
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
        
        // Handle OTP expiration - enable resend immediately
        if (result.error.includes("expired") || result.error.includes("not found")) {
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
        
        // Show success modal as intended
        console.log('🎉 About to show success modal...');
        
        // Use original Alert approach
        setTimeout(() => {
          console.log('📢 Showing Alert modal now...');
          Alert.alert(
            "Email Verified!",
            "Your email has been verified. Please sign in with your credentials.",
            [
              {
                text: "Go to Login",
                onPress: () => {
                  console.log('🚀 Navigating to login...');
                  router.replace('/login');
                }
              }
            ]
          );
        }, 100);
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
    if (!canResend) return;

    try {
      const result = await apiClient.sendOTP({
        email,
        otp_type: 'email_verification'
      });

      if (result.error) {
        Alert.alert("Error", result.error);
        return;
      }

      setCanResend(false);
      setResendTimer(120); // 2 minutes
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setAttemptsRemaining(null);
      setIsLockedOut(false);
      setLockoutTimer(0);

      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      inputRefs.current[0]?.focus();
    } catch {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };


  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Box className="flex-row justify-between items-center px-6 pt-12 pb-4 md:pt-16">
          <BackButton onPress={() => router.push("/onboarding/registration")} />
        </Box>

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
            onPress={!isLockedOut && canResend ? handleResendOTP : undefined}
            disabled={isLockedOut || !canResend}
            className="mt-2"
          >
            <Text
              className="text-sm font-bold sm:text-base text-center"
              style={{
                color: (canResend && !isLockedOut) ? Colors.primary.blue : '#9ca3af'
              }}
            >
              {isLockedOut 
                ? "Resend unavailable (locked out)" 
                : canResend 
                  ? "Resend OTP" 
                  : `Resend OTP (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})`
              }
            </Text>
          </TouchableOpacity>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
}
