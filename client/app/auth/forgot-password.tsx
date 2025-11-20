import React, { useState, useEffect, useRef } from "react";
import { Alert, Platform, TextInput, TouchableOpacity, View, Text, ScrollView, KeyboardAvoidingView, StatusBar, Image } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast, Toast, ToastTitle, ToastDescription } from "../../components/ui/toast";
import { useRouter, usePathname } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "../../components/ui/PrimaryButton";
import Header from "../../components/Header";
import Colors from "../../constants/Colors";
import { apiClient } from "../../lib/api-client";
import otpsent from "../../assets/images/otpsent.png";
import { safeGoBack } from "../../utils/navigationHelper";

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPassword() {
  const router = useRouter();
  const pathname = usePathname();
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
      // First, check if the email exists in the database
      const emailCheckResult = await apiClient.checkEmailExistsForPasswordReset(email);
      
      if (emailCheckResult.error) {
        // Email doesn't exist - show error toast
        toast.show({
          placement: 'top',
          duration: 4000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Email Not Found</ToastTitle>
              <ToastDescription>No account found with this email address. Please check your email or sign up for a new account.</ToastDescription>
            </Toast>
          ),
        });
        setError('No account found with this email address. Please check your email or sign up for a new account.');
        return;
      }

      // Email exists, proceed to send OTP
      const result = await apiClient.sendPasswordResetOTP(email);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Show success toast
        toast.show({
          placement: 'top',
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="success" variant="solid">
              <ToastTitle>Reset Code Sent</ToastTitle>
              <ToastDescription>A password reset code has been sent to your email address.</ToastDescription>
            </Toast>
          ),
        });
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
        
        if (result.locked_out) {
          setIsLockedOut(true);
          setLockoutTimer(result.retry_after || 900);
          setOtp(["", "", "", "", "", ""]);
        }
        
        const isExpiredOrNotFound = result.error.includes("expired") || 
                                   result.error.includes("OTP not found") ||
                                   result.error.includes("OTP has expired");
        
        if (isExpiredOrNotFound) {
          setCanResend(true);
        }
        
        if (result.attempts_remaining) {
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
      // Check if email still exists before resending
      const emailCheckResult = await apiClient.checkEmailExistsForPasswordReset(email);
      
      if (emailCheckResult.error) {
        toast.show({
          placement: 'top',
          duration: 4000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Email Not Found</ToastTitle>
              <ToastDescription>No account found with this email address. Please check your email or sign up for a new account.</ToastDescription>
            </Toast>
          ),
        });
        setCanResend(true);
        return;
      }

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

      toast.show({
        placement: 'top',
        duration: 3000,
        render: ({ id }) => (
          <Toast nativeID={id} action="success" variant="solid">
            <ToastTitle>Code Resent</ToastTitle>
            <ToastDescription>A new verification code has been sent to your email.</ToastDescription>
          </Toast>
        ),
      });
      
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
    <View style={tw`flex-1 justify-center px-6 mx-auto w-full max-w-sm`}>
      <View style={tw`items-center mb-8`}>
        <Image
          source={otpsent}
          style={tw`mb-4 w-36 h-36`}
          resizeMode="contain"
        />
        <Text style={[tw`mb-4 text-2xl font-bold text-center`, { color: Colors.text.head }]}>
          Forgot Password?
        </Text>
        <Text style={[tw`text-base text-center`, { color: Colors.text.sub }]}>
          Enter your email address and we&apos;ll send you a code to reset your password.
        </Text>
      </View>

      <View style={tw`mb-6`}>
        <Text style={[tw`mb-2 font-bold`, { color: Colors.text.head }]}>
          Email
        </Text>
        <TextInput
          style={[
            tw`px-4 py-3 bg-white border rounded-lg`,
            {
              color: Colors.text.head,
              borderColor: error ? '#ef4444' : '#d1d5db',
              borderWidth: error ? 2 : 1,
            },
          ]}
          placeholder="your.email@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error && (
          <Text style={[tw`mt-1 text-sm`, { color: '#ef4444' }]}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );

  const renderOtpStep = () => (
    <View style={tw`flex-1 justify-center px-6 mx-auto w-full max-w-sm`}>
      <View style={tw`items-center mb-8`}>
        <Image
          source={otpsent}
          style={tw`mb-4 w-36 h-36`}
          resizeMode="contain"
        />
        <Text style={[tw`mb-4 text-2xl font-bold text-center`, { color: Colors.text.head }]}>
          Verify Your Email
        </Text>
        <View style={tw`items-center`}>
          <Text style={[tw`text-base text-center`, { color: Colors.text.sub }]}>
            We&apos;ve sent a code to
          </Text>
          <Text style={[tw`text-base font-semibold`, { color: Colors.text.head }]}>
            {email}
          </Text>
          <Text style={[tw`text-base text-center`, { color: Colors.text.sub }]}>
            Enter it below to continue.
          </Text>
        </View>
      </View>

      <View style={tw`items-center mb-8`}>
        <View style={tw`flex-row justify-center items-center mb-4`}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                tw`w-12 h-14 border-2 rounded-xl text-center font-bold text-xl mx-1`,
                {
                  color: Colors.text.head,
                  backgroundColor: error ? '#fff' : digit ? '#eff6ff' : '#fff',
                  borderColor: error ? '#ef4444' : digit ? '#3b82f6' : '#d1d5db',
                }
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              accessibilityLabel={`Digit ${index + 1}`}
            />
          ))}
        </View>

        {error && (
          <Text style={[tw`px-4 text-sm text-center`, { color: '#ef4444' }]}>
            {error}
          </Text>
        )}

        {attemptsRemaining !== null && attemptsRemaining > 0 && !isLockedOut && (
          <Text style={[tw`px-4 mt-2 text-sm text-center`, { color: '#f59e0b' }]}>
            {attemptsRemaining} attempt(s) remaining
          </Text>
        )}

        {isLockedOut && lockoutTimer > 0 && (
          <Text style={[tw`px-4 mt-2 text-sm font-semibold text-center`, { color: '#dc2626' }]}>
            Account temporarily locked. Try again in {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>
    </View>
  );

  const renderResetStep = () => (
    <View style={tw`flex-1 justify-center px-6 mx-auto w-full max-w-sm`}>
      <View style={tw`items-center mb-8`}>
        <View style={[tw`mb-4 w-24 h-24 rounded-full items-center justify-center`, { backgroundColor: '#dbeafe' }]}>
          <Text style={tw`text-4xl`}>🔐</Text>
        </View>
        <Text style={[tw`mb-2 text-2xl font-bold text-center`, { color: Colors.text.head }]}>
          Reset Password
        </Text>
        <Text style={[tw`text-base text-center`, { color: Colors.text.sub }]}>
          Enter your new password below.
        </Text>
        <Text style={[tw`text-sm text-center mt-1`, { color: Colors.text.sub }]}>
          Password must be at least 8 characters with uppercase, lowercase, and a number.
        </Text>
        <Text style={[tw`text-sm text-center mt-1`, { color: Colors.text.sub }]}>
          New password must be different from your current password.
        </Text>
      </View>

      <View style={tw`mb-6`}>
        <View style={tw`mb-4`}>
          <Text style={[tw`mb-2 font-bold`, { color: Colors.text.head }]}>
            New Password
          </Text>
          <View style={tw`relative`}>
            <TextInput
              style={[
                tw`px-4 py-3 pr-12 bg-white border rounded-lg`,
                {
                  color: Colors.text.head,
                  borderColor: error ? '#ef4444' : '#d1d5db',
                  borderWidth: error ? 2 : 1,
                },
              ]}
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={tw`absolute right-3 top-3`}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={tw`mb-4`}>
          <Text style={[tw`mb-2 font-bold`, { color: Colors.text.head }]}>
            Confirm New Password
          </Text>
          <View style={tw`relative`}>
            <TextInput
              style={[
                tw`px-4 py-3 pr-12 bg-white border rounded-lg`,
                {
                  color: Colors.text.head,
                  borderColor: (confirmPassword && newPassword !== confirmPassword) ? '#ef4444' : '#d1d5db',
                  borderWidth: (confirmPassword && newPassword !== confirmPassword) ? 2 : 1,
                },
              ]}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={tw`absolute right-3 top-3`}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={[tw`border rounded-lg p-3`, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={[tw`text-sm`, { color: '#dc2626' }]}>
              {error}
            </Text>
          </View>
        )}
      </View>
    </View>
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
      <View style={tw`relative px-6 pb-12 mt-8`}>
        <PrimaryButton
          title={buttonProps.title}
          onPress={buttonProps.onPress}
          disabled={buttonProps.disabled}
          loading={isLoading}
        />

        {currentStep === 'otp' && (
          <View style={tw`items-center px-4 mt-4`}>
            <Text style={[tw`text-sm text-center`, { color: Colors.text.sub }]}>
              Didn&apos;t receive code?
            </Text>
            <TouchableOpacity
              onPress={!isLockedOut && canResend && !isResending ? handleResendOTP : undefined}
              disabled={isLockedOut || !canResend || isResending}
              style={tw`mt-2`}
            >
              <Text
                style={[
                  tw`text-sm font-bold text-center`,
                  {
                    color: (canResend && !isLockedOut && !isResending) ? Colors.primary.blue : '#9ca3af'
                  }
                ]}
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
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      <View style={tw`flex-1 bg-white`}>
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <Header 
            title="Forgot Password"
            showBackButton={true}
            onBackPress={() => safeGoBack(router, {
              isGuestMode: true, // Forgot password is accessible to guests
              isAuthenticated: false,
              userRole: undefined,
              currentPath: pathname,
            })}
          />
          
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`flex-grow`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 'email' && renderEmailStep()}
            {currentStep === 'otp' && renderOtpStep()}
            {currentStep === 'reset' && renderResetStep()}
          </ScrollView>

          {renderBottomSection()}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
