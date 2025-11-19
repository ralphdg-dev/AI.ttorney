import React, { useState } from "react";
import { router } from "expo-router";
import { Box } from "../../components/ui/box";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { KeyboardAvoidingView } from "../../components/ui/keyboard-avoiding-view";
import { ScrollView } from "../../components/ui/scroll-view";
import { StatusBar } from "../../components/ui/status-bar";
import { Image } from "../../components/ui/image";
import { Input, InputField } from "../../components/ui/input";
import PrimaryButton from "../../components/ui/PrimaryButton";
import Header from "../../components/Header";
import Colors from "../../constants/Colors";
import { supabase } from "../../config/supabase";
import otpsent from "../../assets/images/otpsent.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // For mobile, Supabase will handle deep linking automatically
        // The redirect URL will be configured in Supabase dashboard
      });

      if (error) {
        // Always show generic error for security
        console.error('Password reset error:', error);
        setError('Unable to send reset email. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Unable to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          Enter your email address and we&apos;ll send you a link to reset your password.
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

  const renderSuccessStep = () => (
    <VStack className="flex-1 justify-center px-6 mx-auto w-full max-w-md">
      <VStack className="items-center mb-8">
        <Image
          source={otpsent}
          className="mb-4 w-36 h-36"
          resizeMode="contain"
          alt="Email Sent"
        />
        <Text className="mb-4 text-2xl font-bold text-center text-gray-900">
          Check Your Email
        </Text>
        <Text className="text-base text-center text-gray-600">
          We&apos;ve sent a password reset link to
        </Text>
        <Text className="text-base font-semibold text-gray-900">
          {email}
        </Text>
        <Text className="text-base text-center text-gray-600 mt-2">
          Click the link to reset your password.
        </Text>
      </VStack>
    </VStack>
  );

  const renderBottomSection = () => {
    if (success) {
      return (
        <Box className="relative px-6 pb-12 mt-8">
          <PrimaryButton
            title="Back to Login"
            onPress={() => router.replace('/login')}
          />
          <Box className="items-center px-4 mt-4">
            <Text className="text-sm text-center" style={{ color: Colors.text.sub }}>
              Didn&apos;t receive the email? Check your spam folder.
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box className="relative px-6 pb-12 mt-8">
        <PrimaryButton
          title={isLoading ? "Sending..." : "Send Reset Link"}
          onPress={handleSendResetEmail}
          disabled={isLoading || !email}
          loading={isLoading}
        />
        <Box className="items-center px-4 mt-4">
          <Text className="text-sm text-center" style={{ color: Colors.text.sub }}>
            Remember your password?{' '}
            <Text 
              className="font-bold" 
              style={{ color: Colors.primary.blue }}
              onPress={() => router.back()}
            >
              Sign In
            </Text>
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-white"
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <Header 
        title="Forgot Password"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {success ? renderSuccessStep() : renderEmailStep()}
      </ScrollView>

      {renderBottomSection()}
    </KeyboardAvoidingView>
  );
}
