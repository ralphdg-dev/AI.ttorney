import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../../components/ui/BackButton';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api-client';
import { useToast, Toast, ToastTitle, ToastDescription } from '../../components/ui/toast';

export default function UserRegistration() {
  const toast = useToast();
  
  // Screen dimensions for responsive design
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isDesktop = screenWidth >= 1024;
  const isSmallScreen = screenWidth < 375;
  
  // Responsive values
  const getResponsiveValue = (small: number, medium: number, large: number) => {
    if (isDesktop) return large;
    if (isTablet) return medium;
    return small;
  };
  
  const horizontalPadding = getResponsiveValue(24, 40, 60);
  const logoSize = getResponsiveValue(110, 130, 150);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Validation states
  const [emailError, setEmailError] = useState('');
  const [emailStatus, setEmailStatus] = useState<'none' | 'checking' | 'available' | 'taken' | 'invalid'>('none');
  const [usernameError, setUsernameError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'checking' | 'available' | 'taken' | 'invalid'>('none');
  const [passwordError, setPasswordError] = useState('');
  const [birthdateError, setBirthdateError] = useState('');
  const [validationLoading, setValidationLoading] = useState({ email: false, username: false });
  
  // Debounce timers for validation
  const emailValidationTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameValidationTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Date picker modal state (pattern reused from lawyer-reg)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [calendarCursor, setCalendarCursor] = useState<Date>(new Date());
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  const today = new Date();

  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Validation functions
  const validateEmail = async (emailValue: string) => {
    // Clear any existing timeout
    if (emailValidationTimeout.current) {
      clearTimeout(emailValidationTimeout.current);
    }
    
    // Clear error state immediately when input changes
    setEmailError('');
    setEmailStatus('none');
    
    if (!emailValue) {
      return;
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email address');
      setEmailStatus('invalid');
      return;
    }
    
    // Show checking state
    setEmailStatus('checking');
    
    // Debounce the API call
    emailValidationTimeout.current = setTimeout(async () => {
      try {
        setValidationLoading(prev => ({ ...prev, email: true }));
        const result = await apiClient.checkEmailExists(emailValue);
        
        if (result.success) {
          if (result.data?.exists) {
            setEmailError('Email already exists');
            setEmailStatus('taken');
            toast.show({
              placement: "top",
              render: ({ id }) => (
                <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                  <ToastTitle size="md">Email Already Exists</ToastTitle>
                  <ToastDescription size="sm">This email is already registered. Please use a different email or sign in instead.</ToastDescription>
                </Toast>
              ),
            });
          } else {
            setEmailStatus('available');
          }
        } else {
          // Handle API error - reset to none state
          setEmailStatus('none');
        }
      } catch (error) {
        console.error('Email validation error:', error);
        setEmailStatus('none');
      } finally {
        setValidationLoading(prev => ({ ...prev, email: false }));
      }
    }, 500); // 500ms debounce
  };

  const validateUsername = async (usernameValue: string) => {
    // Clear any existing timeout
    if (usernameValidationTimeout.current) {
      clearTimeout(usernameValidationTimeout.current);
    }
    
    // Clear error state immediately when input changes
    setUsernameError('');
    setUsernameStatus('none');
    
    if (!usernameValue) {
      return;
    }
    
    // Username format validation
    if (usernameValue.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setUsernameStatus('invalid');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(usernameValue)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      setUsernameStatus('invalid');
      return;
    }
    
    // Show checking state
    setUsernameStatus('checking');
    
    // Debounce the API call
    usernameValidationTimeout.current = setTimeout(async () => {
      try {
        setValidationLoading(prev => ({ ...prev, username: true }));
        const result = await apiClient.checkUsernameExists(usernameValue);
        
        if (result.success) {
          if (result.data?.exists) {
            setUsernameError('This username is taken');
            setUsernameStatus('taken');
            toast.show({
              placement: "top",
              render: ({ id }) => (
                <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                  <ToastTitle size="md">Username Taken</ToastTitle>
                  <ToastDescription size="sm">This username is already taken. Please choose a different username.</ToastDescription>
                </Toast>
              ),
            });
          } else {
            setUsernameStatus('available');
          }
        } else {
          // Handle API error - reset to none state
          setUsernameStatus('none');
        }
      } catch (error) {
        console.error('Username validation error:', error);
        setUsernameStatus('none');
      } finally {
        setValidationLoading(prev => ({ ...prev, username: false }));
      }
    }, 500); // 500ms debounce
  };

  const validatePassword = (passwordValue: string) => {
    // Clear error state immediately when input changes
    setPasswordError('');
    
    if (!passwordValue) {
      return;
    }

    const errors = [];
    if (passwordValue.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(passwordValue)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(passwordValue)) errors.push('One lowercase letter');
    if (!/\d/.test(passwordValue)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordValue)) errors.push('One special character');

    if (errors.length > 0) {
      setPasswordError(`Password must contain: ${errors.join(', ')}`);
    }
  };

  const getPasswordStrength = (passwordValue: string) => {
    if (!passwordValue) return { strength: 0, label: '', color: '#e5e7eb' };
    
    let score = 0;
    if (passwordValue.length >= 8) score++;
    if (/[A-Z]/.test(passwordValue)) score++;
    if (/[a-z]/.test(passwordValue)) score++;
    if (/\d/.test(passwordValue)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(passwordValue)) score++;

    if (score <= 2) return { strength: score, label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { strength: score, label: 'Fair', color: '#f59e0b' };
    if (score <= 4) return { strength: score, label: 'Good', color: '#10b981' };
    return { strength: score, label: 'Strong', color: '#059669' };
  };

  // Age validation function
  const validateAge = (date: Date | null): boolean => {
    if (!date) {
      setBirthdateError('');
      return false;
    }
    
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      setBirthdateError('You must be at least 18 years old to create an account');
      return false;
    }
    
    setBirthdateError('');
    return true;
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const hasValidationErrors = !!emailError || !!usernameError || !!passwordError || !!birthdateError || (confirmPassword && !passwordsMatch);
  const isComplete = Boolean(
    firstName && 
    lastName && 
    username && 
    email && 
    birthdate && 
    password && 
    confirmPassword &&
    passwordsMatch && 
    agree && 
    !hasValidationErrors &&
    !validationLoading.email &&
    !validationLoading.username
  );

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Header with BackButton */}
        <View className={`flex-row items-center pt-12 pb-4 ${isDesktop ? 'px-15' : isTablet ? 'px-10' : 'px-6'}`}>
          <BackButton onPress={() => router.back()} />
        </View>

        {/* Main Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ 
            paddingHorizontal: horizontalPadding, 
            paddingBottom: 32, 
            flexGrow: 1, 
            alignItems: isDesktop || isTablet ? 'center' : 'stretch' 
          }}
          keyboardShouldPersistTaps="handled"
        >
        <View className={`w-full ${isDesktop ? 'max-w-lg' : isTablet ? 'max-w-md' : 'max-w-full'}`}>
        {/* Logo */}
        <View className="items-center mt-2 mb-3">
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text className={`font-bold text-gray-900 mb-4 ${isDesktop ? 'text-3xl' : isTablet ? 'text-2xl' : 'text-xl'}`}>
          Create an Account
        </Text>

        {/* First/Last Name */}
        <View className={`${isSmallScreen ? 'flex-col' : 'flex-row'} ${isSmallScreen ? 'gap-0' : 'gap-2'}`}>
          <View className="flex-1">
            <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
              First Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 mb-3 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}
              placeholder="First name"
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View className="flex-1">
            <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
              Last Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 mb-3 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}
              placeholder="Last name"
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        {/* Username */}
        <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
          Username <Text className="text-red-500">*</Text>
        </Text>
        <View className={`relative ${usernameError ? 'mb-1' : 'mb-3'}`}>
          <TextInput
            className={`w-full border rounded-lg p-3 pr-10 bg-white text-gray-900 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'} ${
              usernameError ? 'border-red-500' : 
              usernameStatus === 'available' ? 'border-green-500' : 
              usernameStatus === 'checking' ? 'border-yellow-500' : 
              'border-gray-300'
            }`}
            placeholder="Username"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              validateUsername(text);
            }}
            autoCapitalize="none"
          />
          {usernameStatus === 'checking' && (
            <View className="absolute top-3 right-3">
              <ActivityIndicator size="small" color="#f59e0b" />
            </View>
          )}
          {usernameStatus === 'available' && (
            <View className="absolute top-3 right-3">
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
          )}
          {usernameStatus === 'taken' && (
            <View className="absolute top-3 right-3">
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </View>
          )}
        </View>
        {usernameError ? (
          <Text className="mb-3 text-xs text-red-500">
            {usernameError}
          </Text>
        ) : null}

        {/* Email */}
        <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
          Email Address <Text className="text-red-500">*</Text>
        </Text>
        <View className={`relative ${emailError ? 'mb-1' : 'mb-3'}`}>
          <TextInput
            className={`w-full border rounded-lg p-3 pr-10 bg-white text-gray-900 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'} ${
              emailError ? 'border-red-500' : 
              emailStatus === 'available' ? 'border-green-500' : 
              emailStatus === 'checking' ? 'border-yellow-500' : 
              'border-gray-300'
            }`}
            placeholder="Email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              validateEmail(text);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailStatus === 'checking' && (
            <View className="absolute top-3 right-3">
              <ActivityIndicator size="small" color="#f59e0b" />
            </View>
          )}
          {emailStatus === 'available' && (
            <View className="absolute top-3 right-3">
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
          )}
          {emailStatus === 'taken' && (
            <View className="absolute top-3 right-3">
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </View>
          )}
        </View>
        {emailError ? (
          <Text className="mb-3 text-xs text-red-500">
            {emailError}
          </Text>
        ) : null}

        {/* Birthdate */}
        <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
          Birthdate <Text className="text-red-500">*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => {
            const now = new Date();
            now.setHours(0,0,0,0);
            const base0 = (birthdate ? new Date(birthdate) : new Date());
            base0.setHours(0,0,0,0);
            const base = base0.getTime() > now.getTime() ? now : base0;
            setTempDate(base);
            setCalendarCursor(new Date(base.getFullYear(), base.getMonth(), 1));
            setShowDatePicker(true);
          }}
          activeOpacity={0.8}
          className={`p-3 w-full bg-white rounded-lg border ${birthdateError ? 'border-red-500 mb-1' : 'border-gray-300 mb-3'}`}
        >
          <Text className={`${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'} ${birthdate ? 'text-gray-900' : 'text-gray-400'}`}>
            {birthdate ? formatDate(birthdate) : 'Select date'}
          </Text>
        </TouchableOpacity>
        {birthdateError ? (
          <Text className="mb-3 text-xs text-red-500">
            {birthdateError}
          </Text>
        ) : null}

        {/* Password */}
        <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
          Password <Text className="text-red-500">*</Text>
        </Text>
        <View className="relative mb-3">
          <TextInput
            className={`w-full border rounded-lg p-3 pr-11 bg-white text-gray-900 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'} ${
              passwordError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              validatePassword(text);
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5">
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Password Strength Indicator */}
        {password.length > 0 && (
          <View className="mb-3">
            <View className="flex-row items-center mb-1">
              <View className="flex-1 mr-2 h-1 bg-gray-300 rounded-sm">
                <View 
                  style={{ 
                    width: `${(passwordStrength.strength / 5) * 100}%`, 
                    height: '100%', 
                    backgroundColor: passwordStrength.color, 
                    borderRadius: 2 
                  }} 
                />
              </View>
              <Text className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </Text>
            </View>
          </View>
        )}
        
        {passwordError && (
          <Text className="mb-3 text-xs text-red-500">
            {passwordError}
          </Text>
        )}

        {/* Confirm Password */}
        <Text className={`font-semibold text-gray-900 mb-1.5 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'}`}>
          Confirm Password <Text className="text-red-500">*</Text>
        </Text>
        <View className="relative">
          <TextInput
            className={`w-full border rounded-lg p-3 pr-11 bg-white text-gray-900 mb-1 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-sm'} ${
              (confirmPassword && !passwordsMatch) ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm password"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              // Trigger password validation when confirm password changes
              if (password) {
                validatePassword(password);
              }
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5">
            <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Password Match Indicator */}
        <View className="mb-3">
          {confirmPassword && !passwordsMatch && (
            <Text className="text-xs text-red-500">
              Passwords do not match
            </Text>
          )}
          {confirmPassword && passwordsMatch && (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={14} color="#10b981" style={{ marginRight: 4 }} />
              <Text className="text-xs text-green-600">Passwords match</Text>
            </View>
          )}
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity onPress={() => setAgree(v => !v)} className="flex-row items-center mb-4">
          <View className={`w-5 h-5 border-2 rounded items-center justify-center mr-2 ${
            agree ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-gray-400'
          }`}>
            {agree && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text className="text-gray-700">
            By continuing, you agree to our{" "}
            <Text 
              className="font-semibold text-blue-600 underline"
              onPress={() => {
                // TODO: Navigate to Terms of Service page/modal
                console.log('Navigate to Terms of Service');
              }}
            >
              Terms of Service
            </Text>
            <Text>.</Text>
          </Text>
        </TouchableOpacity>

        {/* Primary Sign Up button */}
        <PrimaryButton
          title={loading ? "Creating Account..." : "Sign Up"}
          onPress={async () => {
            if (!isComplete) {
              toast.show({
                placement: "top",
                render: ({ id }) => (
                  <Toast nativeID={id} action="warning" variant="solid" className="mt-12">
                    <ToastTitle size="md">Form Incomplete</ToastTitle>
                    <ToastDescription size="sm">Please fill in all required fields and fix any validation errors.</ToastDescription>
                  </Toast>
                ),
              });
              return;
            }
            
            if (validationLoading.email || validationLoading.username) {
              toast.show({
                placement: "top",
                render: ({ id }) => (
                  <Toast nativeID={id} action="info" variant="solid" className="mt-12">
                    <ToastTitle size="md">Validating...</ToastTitle>
                    <ToastDescription size="sm">Please wait while we validate your information.</ToastDescription>
                  </Toast>
                ),
              });
              return;
            }
            
            setLoading(true);
            try {
              // Step 1: Create user account first
              const signUpResult = await apiClient.signUp({
                email,
                password,
                username,
                first_name: firstName,
                last_name: lastName,
                birthdate: birthdate?.toISOString().split('T')[0] || '',
                role: 'registered_user'
              });
              
              // Handle rate limiting or existing user
              if (signUpResult.error && 
                  !signUpResult.error.includes('rate_limit') && 
                  !signUpResult.error.includes('already registered') &&
                  !signUpResult.error.includes('security purposes') &&
                  !signUpResult.error.includes('after') &&
                  !signUpResult.error.includes('seconds')) {
                toast.show({
                  placement: "top",
                  render: ({ id }) => (
                    <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                      <ToastTitle size="md">Registration Failed</ToastTitle>
                      <ToastDescription size="sm">{signUpResult.error}</ToastDescription>
                    </Toast>
                  ),
                });
                return;
              }
              
              // Show rate limit message but continue to OTP
              if (signUpResult.error && (
                  signUpResult.error.includes('rate_limit') || 
                  signUpResult.error.includes('security purposes') ||
                  signUpResult.error.includes('seconds'))) {
                console.log('Rate limited, continuing to OTP step for existing user');
              }
              
              // Step 2: Send OTP for email verification (even if signup was rate limited)
              const otpResult = await apiClient.sendOTP({
                email,
                otp_type: 'email_verification'
              });
              
              if (otpResult.error) {
                toast.show({
                  placement: "top",
                  render: ({ id }) => (
                    <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                      <ToastTitle size="md">OTP Failed</ToastTitle>
                      <ToastDescription size="sm">{otpResult.error}</ToastDescription>
                    </Toast>
                  ),
                });
                return;
              }
              
              // Show success toast
              toast.show({
                placement: "top",
                render: ({ id }) => (
                  <Toast nativeID={id} action="success" variant="solid" className="mt-12">
                    <ToastTitle size="md">Registered Successfully!</ToastTitle>
                    <ToastDescription size="sm">Please check your email for the verification code.</ToastDescription>
                  </Toast>
                ),
              });
              
              // Step 3: Store password temporarily for session creation after OTP verification
              await AsyncStorage.setItem('temp_password', password);
              
              // Step 4: Navigate to verify-otp with the email
              router.push(`./verify-otp?email=${encodeURIComponent(email)}` as any);
              
            } catch {
              toast.show({
                placement: "top",
                render: ({ id }) => (
                  <Toast nativeID={id} action="error" variant="solid" className="mt-12">
                    <ToastTitle size="md">Error</ToastTitle>
                    <ToastDescription size="sm">Failed to create account. Please try again.</ToastDescription>
                  </Toast>
                ),
              });
            } finally {
              setLoading(false);
            }
          }}
          disabled={!isComplete || loading}
        />

        {/* OR separator */}
        <View className="flex-row items-center my-3">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-3 text-gray-500">OR</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Google sign up */}
        <TouchableOpacity
          className="py-3 rounded-lg flex-row items-center justify-center mb-3 border border-gray-300 bg-white"
          style={{
            width: screenWidth - 64,
            height: 56,
            alignSelf: 'center',
          }}
          onPress={() => { /* TODO: google sign up */ }}
          activeOpacity={0.8}
        >
          <Image
            source={require('../../assets/images/registration/google.png')}
            style={{ width: 20, height: 20, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text className="text-gray-900 font-semibold text-lg">
            Sign Up with Google
          </Text>
        </TouchableOpacity>

        {/* Bottom link */}
        <View className="items-center mt-4">
          <Text className="text-gray-500">
            Already have an account?{' '}
            <Text className="font-bold text-blue-600" onPress={() => router.push('/login')}>Sign In</Text>
          </Text>
        </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className={`bg-white rounded-t-2xl max-h-4/5 ${isDesktop ? 'px-15' : isTablet ? 'px-10' : 'px-6'}`}>
            <Text className="mb-2 text-base font-semibold text-gray-900">Select Date</Text>

            {/* Header with month navigation */}
            <View className="flex-row justify-between items-center mb-2">
              <TouchableOpacity
                onPress={() => {
                  const y = calendarCursor.getFullYear();
                  const m = calendarCursor.getMonth();
                  const prev = new Date(y, m - 1, 1);
                  setCalendarCursor(prev);
                  setShowMonthSelect(false);
                  setShowYearSelect(false);
                }}
                className="p-1.5"
              >
                <Ionicons name="chevron-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => { setShowMonthSelect(v => !v); setShowYearSelect(false); }} className="py-1.5 px-2">
                  <Text className="text-base font-bold text-gray-900">
                    {calendarCursor.toLocaleString(undefined, { month: 'long' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowYearSelect(v => !v); setShowMonthSelect(false); }} className="py-1.5 px-2">
                  <Text className="text-base font-bold text-gray-900">
                    {calendarCursor.getFullYear()}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const y = calendarCursor.getFullYear();
                  const m = calendarCursor.getMonth();
                  const next = new Date(y, m + 1, 1);
                  setCalendarCursor(next);
                  setShowMonthSelect(false);
                  setShowYearSelect(false);
                }}
                className="p-1.5"
              >
                <Ionicons name="chevron-forward" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Month selection grid */}
            {showMonthSelect && (
              <View className="mb-2">
                {(() => {
                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  const rows: React.ReactNode[] = [];
                  for (let r = 0; r < 3; r++) {
                    rows.push(
                      <View key={r} className="flex-row mb-1.5">
                        {months.slice(r * 4, r * 4 + 4).map((label, idx) => {
                          const monthIndex = r * 4 + idx;
                          const isActive = monthIndex === calendarCursor.getMonth();
                          const isFutureMonth = (calendarCursor.getFullYear() === today.getFullYear()) && monthIndex > today.getMonth();
                          return (
                            <TouchableOpacity
                              key={label}
                              disabled={isFutureMonth}
                              onPress={() => {
                                const y = calendarCursor.getFullYear();
                                setCalendarCursor(new Date(y, monthIndex, 1));
                                setShowMonthSelect(false);
                              }}
                              className={`flex-1 py-2.5 mx-1 rounded-lg items-center ${
                                isFutureMonth ? 'bg-gray-300' : isActive ? 'bg-blue-600' : 'bg-gray-100'
                              }`}
                            >
                              <Text className={`font-bold ${
                                isFutureMonth ? 'text-gray-400' : isActive ? 'text-white' : 'text-gray-900'
                              }`}>{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  }
                  return <View>{rows}</View>;
                })()}
              </View>
            )}

            {/* Year selection list */}
            {showYearSelect && (
              <View className="mb-2 h-48 rounded-lg border border-gray-300">
                <ScrollView>
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const maxYear = Math.min(2025, currentYear);
                    const years: number[] = [];
                    for (let y = maxYear; y >= 1950; y--) years.push(y);
                    return years.map((y) => {
                      const isActive = y === calendarCursor.getFullYear();
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => {
                            const m = calendarCursor.getMonth();
                            setCalendarCursor(new Date(y, m, 1));
                            setShowYearSelect(false);
                          }}
                          className={`py-2.5 px-3 ${isActive ? 'bg-blue-600' : 'bg-transparent'}`}
                        >
                          <Text className={`${isActive ? 'font-bold text-white' : 'font-semibold text-gray-900'}`}>{y}</Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
              </View>
            )}

            {/* Weekday headers */}
            {!showMonthSelect && !showYearSelect && (
              <View className="flex-row mb-1">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                  <Text key={d} className="flex-1 font-semibold text-center text-gray-500">{d}</Text>
                ))}
              </View>
            )}

            {/* Dates grid */}
            {!showMonthSelect && !showYearSelect && (() => {
              const y = calendarCursor.getFullYear();
              const m = calendarCursor.getMonth();
              const firstDay = new Date(y, m, 1);
              const startWeekday = firstDay.getDay();
              const daysInMonth = new Date(y, m + 1, 0).getDate();
              const cells: (Date | null)[] = [];
              for (let i = 0; i < startWeekday; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
              while (cells.length % 7 !== 0) cells.push(null);
              while (cells.length < 42) cells.push(null);
              const rows: React.ReactNode[] = [];
              const today0 = new Date(today);
              today0.setHours(0,0,0,0);
              for (let r = 0; r < 6; r++) {
                rows.push(
                  <View key={r} className="flex-row mb-1">
                    {cells.slice(r * 7, r * 7 + 7).map((date, idx) => {
                      const isSelected = !!date && tempDate &&
                        date.getFullYear() === tempDate.getFullYear() &&
                        date.getMonth() === tempDate.getMonth() &&
                        date.getDate() === tempDate.getDate();
                      const isDisabled = !date || (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() > today0.getTime());
                      return (
                        <TouchableOpacity
                          key={idx}
                          disabled={isDisabled}
                          onPress={() => date && !isDisabled && setTempDate(date)}
                          className={`flex-1 py-2.5 items-center rounded-lg ${isSelected ? 'bg-blue-600' : 'bg-transparent'}`}
                        >
                          <Text className={`font-semibold ${isSelected ? 'text-white' : isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                            {date ? date.getDate() : '0'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              }
              return <View>{rows}</View>;
            })()}

            <View className="flex-row justify-end mt-2">
              <TouchableOpacity onPress={() => setShowDatePicker(false)} className="py-2.5 px-3 mr-2">
                <Text className="font-semibold text-gray-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const today0 = new Date();
                  today0.setHours(0,0,0,0);
                  const sel0 = new Date(tempDate);
                  sel0.setHours(0,0,0,0);
                  const finalDate = sel0.getTime() > today0.getTime() ? today0 : sel0;
                  setBirthdate(finalDate);
                  validateAge(finalDate);
                  setShowDatePicker(false);
                }}
                className="py-2.5 px-3"
              >
                <Text className="font-bold text-blue-600">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}