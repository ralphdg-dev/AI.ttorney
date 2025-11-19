import React, { useState, useEffect, useRef } from "react";
import { Alert, Platform, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast, Toast, ToastTitle, ToastDescription } from "../../components/ui/toast";
import { router } from "expo-router";
import { Box } from "../../components/ui/box";
import { VStack } from "../../components/ui/vstack";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { KeyboardAvoidingView } from "../../components/ui/keyboard-avoiding-view";
import { ScrollView } from "../../components/ui/scroll-view";
import { StatusBar } from "../../components/ui/status-bar";
import { Image } from "../../components/ui/image";
import { Input, InputField } from "../../components/ui/input";
import PrimaryButton from "../../components/ui/PrimaryButton";
import Header from "../../components/Header";
import Colors from "../../constants/Colors";
import { apiClient } from "../../lib/api-client";
import otpsent from "../../assets/images/otpsent.png";

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPassword() {
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  // Timer states
  const [resendTimer, setResendTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);
  
  // Error states
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const resendRequestRef = useRef<Promise<any> | null>(null);

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
    if (currentStep === 'otp' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [currentStep]);

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await apiClient.sendPasswordResetOTP(email);
      
      if (result.error) {
        setError(result.error);
      } else {
        setCurrentStep('otp');
        setResendTimer(120);
        setCanResend(false);
      }
    } catch {
      setError('Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
    if (canResend) {
      setError("This code has expired. Please request a new reset code.");
      return;
    }

    const otpString = otp.join("");

    console.log("🔍 DEBUG: Frontend OTP verification");
    console.log("🔍 DEBUG: Email:", email);
    console.log("🔍 DEBUG: OTP Array:", otp);
    console.log("🔍 DEBUG: OTP String:", otpString);
    console.log("🔍 DEBUG: OTP Length:", otpString.length);

    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("🔍 DEBUG: Calling verifyResetOTP API");
      const result = await apiClient.verifyResetOTP(email, otpString);
      console.log("🔍 DEBUG: API Response:", result);

      if (result.error) {
        setError(result.error);
        
        if (result.locked_out || result.lockedOut) {
          setIsLockedOut(true);
          setLockoutTimer(result.retry_after || result.retryAfter || 900);
          setOtp(["", "", "", "", "", ""]);
        }
        
        const isExpiredOrNotFound = result.error.includes("expired") || 
                                   result.error.includes("OTP not found") ||
                                   result.error.includes("OTP has expired");
        
        if (isExpiredOrNotFound) {
          setCanResend(true);
          setResendTimer(0);
          setOtp(["", "", "", "", "", ""]);
        }
        
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        } else if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
        }
      } else {
        console.log("🔍 DEBUG: Checking for passwordResetToken in result.data");
        console.log("🔍 DEBUG: result.data:", result.data);
        if (result.data && result.data.passwordResetToken) {
          console.log("🔍 DEBUG: Found passwordResetToken, proceeding to reset step");
          setResetToken(result.data.passwordResetToken);
          setCurrentStep('reset');
          setOtp(["", "", "", "", "", ""]);
          setError("");
          setAttemptsRemaining(null);
          setIsLockedOut(false);
        } else {
          console.log("🔍 DEBUG: No passwordResetToken found in response");
          setError('Invalid response from server. Please try again.');
        }
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isResending || resendRequestRef.current) return;

    setIsResending(true);
    setCanResend(false);
    
    try {
      const requestPromise = apiClient.sendPasswordResetOTP(email);
      resendRequestRef.current = requestPromise;
      const result = await requestPromise;

      if (result.error) {
        Alert.alert("Error", result.error);
        setCanResend(true);
        return;
      }

      setResendTimer(120);
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setAttemptsRemaining(null);
      setIsLockedOut(false);
      setLockoutTimer(0);

      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      
    } catch {
      Alert.alert("Error", "Failed to resend code. Please try again.");
      setCanResend(true);
    } finally {
      setIsResending(false);
      resendRequestRef.current = null;
    }
  };

  const validatePassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password);
  };

  const toast = useToast();

  const handleResetPassword = async () => {
    console.log("🔍 DEBUG: Password reset attempt");
    console.log("🔍 DEBUG: Reset token:", resetToken);
    console.log("🔍 DEBUG: Reset token length:", resetToken?.length || 0);
    console.log("🔍 DEBUG: New password provided:", !!newPassword);
    
    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log("🔍 DEBUG: Calling resetPasswordWithToken API");
      const result = await apiClient.resetPasswordWithToken(resetToken, newPassword);
      console.log("🔍 DEBUG: Reset password API response:", result);
      
      if (result.error) {
        const errStr = typeof result.error === 'string' ? result.error.toLowerCase() : '';
        const isSamePasswordError = errStr.includes('different from your current password');
        const isGenericUpdateFail = errStr.includes('failed to update password');
        if (isSamePasswordError || isGenericUpdateFail) {
          toast.show({
            placement: 'top',
            duration: 3000,
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="solid">
                <ToastTitle>Password not changed</ToastTitle>
                <ToastDescription>New password can't be the same as your current one.</ToastDescription>
              </Toast>
            ),
          });
        } else {
          setError(result.error);
        }
      } else {
        // Show success toast and redirect to login
        toast.show({
          placement: 'top',
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="success" variant="solid">
              <ToastTitle>Password Reset Successful</ToastTitle>
              <ToastDescription>Your password has been updated. Please login with your new password.</ToastDescription>
            </Toast>
          ),
        });
        
        // Redirect to login after showing toast
        setTimeout(() => {
          router.replace('/login');
        }, 1000);
      }
    } catch {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  const renderEmailStep = () => (
    <VStack className="flex-1 justify-center px-6 mx-auto w-full max-w-md">
      <VStack className="items-center mb-8">
        <Image
          source={otpsent}
          className="mb-4 w-36 h-36"
          resizeMode="contain"
          alt="Forgot Password"
        />
        <Text className="mb-4 text-2xl font-bold text-center text-gray-900">
          Forgot Password?
        </Text>
        <Text className="text-base text-center text-gray-600">
          Enter your email address and we&apos;ll send you a code to reset your password.
        </Text>
      </VStack>

      <VStack className="space-y-4 mb-6">
        <Input className="border-gray-300">
          <InputField
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </Input>

        {error && (
          <Text className="text-sm text-red-500">
            {error}
          </Text>
        )}
      </VStack>
    </VStack>
  );

  const renderOtpStep = () => (
    <VStack className="flex-1 justify-center px-6 mx-auto w-full max-w-md">
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

        {attemptsRemaining !== null && attemptsRemaining > 0 && !isLockedOut && (
          <Text className="px-4 mt-2 text-sm text-center text-orange-500">
            {attemptsRemaining} attempt(s) remaining
          </Text>
        )}

        {isLockedOut && lockoutTimer > 0 && (
          <Text className="px-4 mt-2 text-sm font-semibold text-center text-red-600">
            Account temporarily locked. Try again in {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </VStack>
    </VStack>
  );

  const renderResetStep = () => (
    <VStack className="flex-1 justify-center px-6 mx-auto w-full max-w-md">
      <VStack className="items-center mb-8">
        <Box className="mb-4 w-24 h-24 bg-blue-100 rounded-full items-center justify-center">
          <Text className="text-4xl">🔐</Text>
        </Box>
        <Text className="mb-2 text-2xl font-bold text-center text-gray-900">
          Reset Password
        </Text>
        <Text className="text-base text-center text-gray-600">
          Enter your new password below.
        </Text>
        <Text className="text-sm text-center text-gray-500 mt-1">
          Password must be at least 8 characters with uppercase, lowercase, and a number.
        </Text>
        <Text className="text-sm text-center text-gray-500 mt-1">
          New password must be different from your current password.
        </Text>
      </VStack>

      <VStack className="space-y-4 mb-6">
        <VStack className="space-y-2">
          <Text className="text-sm font-medium text-gray-700">New Password</Text>
          <Input className="border-gray-300">
            <InputField
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
          </Input>
        </VStack>

        <VStack className="space-y-2">
          <Text className="text-sm font-medium text-gray-700">Confirm New Password</Text>
          <Input className="border-gray-300">
            <InputField
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </Input>
        </VStack>

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          className="self-start mt-2"
        >
          <Text className="text-sm text-blue-500 font-medium">
            {showPassword ? 'Hide' : 'Show'} password
          </Text>
        </TouchableOpacity>

        {error && (
          <Box className="bg-red-50 border border-red-200 rounded-lg p-3">
            <Text className="text-sm text-red-600">
              {error}
            </Text>
          </Box>
        )}
      </VStack>
    </VStack>
  );

  const renderBottomSection = () => {
    const getButtonProps = () => {
      switch (currentStep) {
        case 'email':
          return {
            title: isLoading ? "Sending..." : "Send Reset Code",
            onPress: handleSendOTP,
            disabled: isLoading || !email
          };
        case 'otp':
          return {
            title: isLoading ? "Verifying..." : "Verify",
            onPress: handleVerifyOTP,
            disabled: isLoading || !isOtpComplete || isLockedOut || canResend
          };
        case 'reset':
          return {
            title: isLoading ? "Resetting..." : "Reset Password",
            onPress: handleResetPassword,
            disabled: isLoading || !newPassword || !confirmPassword
          };
      }
    };

    const buttonProps = getButtonProps();

    return (
      <Box className="relative px-6 pb-12 mt-8">
        <PrimaryButton
          title={buttonProps.title}
          onPress={buttonProps.onPress}
          disabled={buttonProps.disabled}
          loading={isLoading}
        />

        {currentStep === 'otp' && (
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
        )}
      </Box>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        
        <Header 
        title="Forgot Password"
        showBackButton={true}
        onBackPress={() => {
          // Try to go back, but if no history exists, navigate to login
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/login');
          }
        }}
      />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 'email' && renderEmailStep()}
        {currentStep === 'otp' && renderOtpStep()}
        {currentStep === 'reset' && renderResetStep()}
      </ScrollView>

      {renderBottomSection()}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
