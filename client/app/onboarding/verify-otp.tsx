import React, { useState, useEffect, useRef } from "react";
import { Alert, Platform, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");

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
      const result = await apiClient.verifyOTP({
        email,
        otp_code: otpString,
        otp_type: 'email_verification'
      });

      if (result.error) {
        setError(result.error);
      } else {
        Alert.alert("Success", "Email verified successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Navigate to role selection page
              router.replace('/role-selection');
            },
          },
        ]);
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
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
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      setError("");

      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      inputRefs.current[0]?.focus();
    } catch {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    const masked = localPart[0] + "*".repeat(localPart.length - 2) + localPart.slice(-1);
    return `${masked}@${domain}`;
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
        <Box className="flex-row items-center justify-between px-6 pt-12 pb-4 md:pt-16">
          <BackButton onPress={() => router.push("/onboarding/registration")} />
        </Box>

        {/* Main Content */}
        <VStack className="flex-1 justify-center px-6 max-w-md mx-auto w-full">
          {/* Image and Title */}
          <VStack className="items-center mb-8">
            <Image
              source={otpsent}
              className="w-36 h-36 mb-4"
              resizeMode="contain"
              alt="OTP Sent"
            />
            <Text className="text-2xl font-bold text-center mb-4 text-gray-900">
              Verify Your Email
            </Text>
            <Text className="text-base text-center text-gray-600 leading-6">
              We&apos;ve sent a code to{" "}
              <Text className="font-semibold text-gray-900">
                {maskEmail(email)}
              </Text>
              . Enter it below to continue.
            </Text>
          </VStack>

          {/* OTP Input */}
          <VStack className="items-center mb-8">
            <HStack className="justify-center items-center space-x-2 mb-4">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  className={`w-12 h-14 border-2 rounded-xl text-center font-bold text-xl ${
                    error
                      ? "border-red-500"
                      : digit
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white"
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
              <Text className="text-red-500 text-center text-sm px-4">
                {error}
              </Text>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Bottom Section - Match onboarding pattern */}
      <Box className="px-6 pb-12 mt-8 relative">
        <PrimaryButton
          title={isLoading ? "Verifying..." : "Verify"}
          onPress={handleVerifyOTP}
          disabled={isLoading || !isOtpComplete}
          loading={isLoading}
        />

        {/* Resend Code - Below button like ActionLink */}
        <Box className="absolute bottom-8 left-0 right-0 items-center px-4 sm:px-6 md:px-8">
          <Text className="text-center text-sm sm:text-base" style={{ color: Colors.text.sub }}>
            Didn&apos;t receive code?{" "}
            <Text
              className="font-bold text-sm sm:text-base"
              style={{
                color: canResend ? Colors.primary.blue : '#9ca3af'
              }}
              onPress={handleResendOTP}
            >
              {canResend ? "Resend OTP" : `Resend OTP (${resendTimer}s)`}
            </Text>
          </Text>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
}
