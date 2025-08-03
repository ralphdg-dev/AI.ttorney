import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { useState, useEffect, useCallback, useMemo } from "react";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import logo from "../assets/images/logo.png";
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallScreen = screenHeight < 700;

// Google Logo Component - Memoized to prevent re-renders
const GoogleLogo = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

// Memoized InputField component to prevent unnecessary re-renders
const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  isPassword = false,
  showPassword,
  onTogglePassword,
  keyboardType = "default",
  autoCapitalize = "none",
  style = {},
}) => {
  // Memoize styles to prevent recalculation
  const inputStyle = useMemo(
    () => [
      tw`border rounded-lg px-4 py-3 bg-white`,
      {
        color: Colors.text.head,
        borderColor: error ? "#EF4444" : "#D1D5DB",
        paddingRight: isPassword ? 48 : 16,
      },
    ],
    [error, isPassword]
  );

  return (
    <View style={[tw`mb-4`, style]}>
      <Text style={[tw`font-bold mb-2`, { color: Colors.text.head }]}>
        {label} <Text style={{ color: "#EF4444" }}>*</Text>
      </Text>
      <View style={tw`relative`}>
        <TextInput
          style={inputStyle}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          accessibilityLabel={label}
          accessibilityHint={`Enter your ${label.toLowerCase()}`}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={tw`absolute right-3 top-3`}
            accessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[tw`text-sm mt-1`, { color: "#EF4444" }]}>{error}</Text>
      )}
    </View>
  );
};

// Date Picker Field Component
const DatePickerField = ({ label, value, onDateChange, error, style = {} }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    value ? new Date(value) : new Date()
  );

  // Format date for display
  const formatDate = useCallback((date) => {
    if (!date) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }, []);

  const handleDateConfirm = useCallback(
    (event, date) => {
      if (Platform.OS === "android") {
        setShowPicker(false);
      }

      if (date) {
        setSelectedDate(date);
        const formattedDate = formatDate(date);
        onDateChange(formattedDate);
      }
    },
    [formatDate, onDateChange]
  );

  const openDatePicker = useCallback(() => {
    setShowPicker(true);
  }, []);

  const closeDatePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  // Calculate max date (18 years ago from today) and min date (100 years ago)
  const maxDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date;
  }, []);

  const minDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 100);
    return date;
  }, []);

  return (
    <View style={[tw`mb-4`, style]}>
      <Text style={[tw`font-bold mb-2`, { color: Colors.text.head }]}>
        {label} <Text style={{ color: "#EF4444" }}>*</Text>
      </Text>

      <TouchableOpacity
        style={[
          tw`border rounded-lg px-4 py-3 bg-white flex-row items-center justify-between`,
          {
            borderColor: error ? "#EF4444" : "#D1D5DB",
          },
        ]}
        onPress={openDatePicker}
        accessibilityLabel={label}
        accessibilityHint="Tap to select date"
        accessibilityRole="button"
      >
        <Text
          style={[
            {
              color: value ? Colors.text.head : "#9CA3AF",
            },
          ]}
        >
          {value || "MM/DD/YYYY"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {error && (
        <Text style={[tw`text-sm mt-1`, { color: "#EF4444" }]}>{error}</Text>
      )}

      {showPicker && (
        <>
          {Platform.OS === "ios" && (
            <View style={tw`bg-white border-t border-gray-200`}>
              <View
                style={tw`flex-row justify-between items-center px-4 py-2 border-b border-gray-200`}
              >
                <TouchableOpacity onPress={closeDatePicker}>
                  <Text style={[tw`text-lg`, { color: Colors.primary.blue }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[tw`font-semibold`, { color: Colors.text.head }]}>
                  Select Date
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const formattedDate = formatDate(selectedDate);
                    onDateChange(formattedDate);
                    closeDatePicker();
                  }}
                >
                  <Text style={[tw`text-lg`, { color: Colors.primary.blue }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                maximumDate={maxDate}
                minimumDate={minDate}
                style={{ backgroundColor: "white" }}
              />
            </View>
          )}

          {Platform.OS === "android" && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateConfirm}
              maximumDate={maxDate}
              minimumDate={minDate}
            />
          )}
        </>
      )}
    </View>
  );
};

export default function NonLawReg() {
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    birthdate: "",
    password: "",
    confirmPassword: "",
  });
  const [formState, setFormState] = useState({
    showPassword: false,
    showConfirmPassword: false,
    agreeToTerms: false,
    isLoading: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Memoize responsive dimensions to prevent recalculation
  const responsiveDimensions = useMemo(() => {
    const isCurrentTablet = screenData.width >= 768;
    return {
      isCurrentTablet,
      containerPadding: isCurrentTablet ? "px-12" : "px-6",
      maxWidth: isCurrentTablet ? "max-w-md" : "max-w-sm",
      logoSize: isCurrentTablet ? 32 : isSmallScreen ? 20 : 24,
      headerSize: isCurrentTablet ? "text-2xl" : "text-xl",
    };
  }, [screenData.width]);

  // Validation functions - memoized with useCallback
  const validateEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePassword = useCallback((password) => {
    return password.length >= 8;
  }, []);

  const validateBirthdate = useCallback((birthdate) => {
    if (!birthdate) return false;

    // Check if the date is in MM/DD/YYYY format
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dateRegex.test(birthdate)) return false;

    // Check if the user is at least 18 years old
    const [month, day, year] = birthdate.split("/").map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      return age - 1 >= 18;
    }

    return age >= 18;
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.birthdate.trim()) {
      newErrors.birthdate = "Birthdate is required";
    } else if (!validateBirthdate(formData.birthdate)) {
      newErrors.birthdate = "You must be at least 18 years old";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formState.agreeToTerms) {
      newErrors.terms = "You must agree to the terms of service";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    formData,
    formState.agreeToTerms,
    validateEmail,
    validatePassword,
    validateBirthdate,
  ]);

  // Form update handlers - memoized with useCallback
  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    setErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const updateFormState = useCallback((field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Individual field handlers to prevent re-renders
  const handleFirstNameChange = useCallback(
    (text) => {
      updateFormData("firstName", text);
    },
    [updateFormData]
  );

  const handleLastNameChange = useCallback(
    (text) => {
      updateFormData("lastName", text);
    },
    [updateFormData]
  );

  const handleEmailChange = useCallback(
    (text) => {
      updateFormData("email", text.toLowerCase());
    },
    [updateFormData]
  );

  const handleUsernameChange = useCallback(
    (text) => {
      updateFormData("username", text.toLowerCase());
    },
    [updateFormData]
  );

  const handleBirthdateChange = useCallback(
    (date) => {
      updateFormData("birthdate", date);
    },
    [updateFormData]
  );

  const handlePasswordChange = useCallback(
    (text) => {
      updateFormData("password", text);
    },
    [updateFormData]
  );

  const handleConfirmPasswordChange = useCallback(
    (text) => {
      updateFormData("confirmPassword", text);
    },
    [updateFormData]
  );

  // Toggle handlers
  const togglePassword = useCallback(() => {
    updateFormState("showPassword", !formState.showPassword);
  }, [formState.showPassword, updateFormState]);

  const toggleConfirmPassword = useCallback(() => {
    updateFormState("showConfirmPassword", !formState.showConfirmPassword);
  }, [formState.showConfirmPassword, updateFormState]);

  const toggleTerms = useCallback(() => {
    updateFormState("agreeToTerms", !formState.agreeToTerms);
  }, [formState.agreeToTerms, updateFormState]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors in the form");
      return;
    }

    updateFormState("isLoading", true);
    try {
      // TODO: Implement registration logic
      console.log("Register pressed with data:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // On successful registration, navigate to OTP verification
      Alert.alert(
        "Registration Successful",
        "Please check your email for verification code.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to OTP verification screen with email parameter
              router.push({
                pathname: "/verifyotp-reg",
                params: { email: formData.email },
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      updateFormState("isLoading", false);
    }
  }, [validateForm, updateFormState, formData]);

  const handleGoogleRegister = useCallback(async () => {
    // TODO: Implement Google registration
    console.log("Google register pressed");

    // For demo purposes, simulate Google registration success
    try {
      // Simulate Google registration API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Assuming Google provides email, navigate to OTP verification
      const googleEmail = "user@gmail.com"; // This would come from Google OAuth

      Alert.alert(
        "Google Registration Successful",
        "Please verify your email to complete registration.",
        [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/verify-otp",
                params: { email: googleEmail },
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Google registration failed. Please try again.");
    }
  }, []);

  const handleSignIn = useCallback(() => {
    router.push("/login");
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-white`}
    >
      {/* Top Navigation */}
      <View
        style={[
          tw`flex-row items-center pt-12 pb-4`,
          tw`${responsiveDimensions.containerPadding}`,
        ]}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={tw`p-2`}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#A0A0A0" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={tw`pb-8`}
      >
        {/* Main Content */}
        <View
          style={[
            tw`flex-1 justify-center items-center`,
            tw`${responsiveDimensions.containerPadding}`,
          ]}
        >
          {/* Logo and Header */}
          <View style={tw`mb-6 items-center`}>
            <Image
              source={logo}
              style={[
                tw`mb-2`,
                {
                  width: responsiveDimensions.logoSize * 4,
                  height: responsiveDimensions.logoSize * 4,
                },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                tw`${responsiveDimensions.headerSize} font-bold mb-2`,
                { color: Colors.text.head },
              ]}
            >
              Create an Account
            </Text>
            <Text style={[tw`text-sm text-center`, { color: Colors.text.sub }]}>
              Join our community and get started today
            </Text>
          </View>

          {/* Registration Form */}
          <View style={[tw`w-full`, tw`${responsiveDimensions.maxWidth}`]}>
            {/* First Name and Last Name Row */}
            <View
              style={tw`${
                responsiveDimensions.isCurrentTablet ? "flex-col" : "flex-row"
              } mb-0`}
            >
              <InputField
                label="First Name"
                placeholder="John"
                value={formData.firstName}
                onChangeText={handleFirstNameChange}
                error={errors.firstName}
                autoCapitalize="words"
                style={tw`${
                  responsiveDimensions.isCurrentTablet ? "mb-0" : "flex-1 mr-2"
                }`}
              />
              <InputField
                label="Last Name"
                placeholder="Doe Cruz"
                value={formData.lastName}
                onChangeText={handleLastNameChange}
                error={errors.lastName}
                autoCapitalize="words"
                style={tw`${
                  responsiveDimensions.isCurrentTablet ? "mb-0" : "flex-1 ml-2"
                }`}
              />
            </View>

            {/* Email Input */}
            <InputField
              label="Email Address"
              placeholder="user@gmail.com"
              value={formData.email}
              onChangeText={handleEmailChange}
              error={errors.email}
              keyboardType="email-address"
            />

            {/* Username Input */}
            <InputField
              label="Username"
              placeholder="jdoecruz"
              value={formData.username}
              onChangeText={handleUsernameChange}
              error={errors.username}
            />

            {/* Birthdate Date Picker */}
            <DatePickerField
              label="Birthdate"
              value={formData.birthdate}
              onDateChange={handleBirthdateChange}
              error={errors.birthdate}
            />

            {/* Password Input */}
            <InputField
              label="Password"
              placeholder="••••••••"
              value={formData.password}
              onChangeText={handlePasswordChange}
              error={errors.password}
              isPassword={true}
              showPassword={formState.showPassword}
              onTogglePassword={togglePassword}
            />

            {/* Confirm Password Input */}
            <InputField
              label="Confirm Password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              error={errors.confirmPassword}
              isPassword={true}
              showPassword={formState.showConfirmPassword}
              onTogglePassword={toggleConfirmPassword}
            />

            {/* Terms and Conditions */}
            <View style={tw`flex-row items-start mb-6`}>
              <TouchableOpacity
                onPress={toggleTerms}
                style={tw`mt-1 mr-3`}
                accessibilityLabel="Agree to terms of service"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: formState.agreeToTerms }}
              >
                <View
                  style={[
                    tw`w-5 h-5 border rounded items-center justify-center`,
                    {
                      borderColor: formState.agreeToTerms
                        ? Colors.primary.blue
                        : "#D1D5DB",
                      backgroundColor: formState.agreeToTerms
                        ? Colors.primary.blue
                        : "transparent",
                    },
                  ]}
                >
                  {formState.agreeToTerms && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={[tw`text-sm flex-1`, { color: Colors.text.head }]}>
                By continuing, you agree to our{" "}
                <Text style={{ color: Colors.primary.blue }}>
                  terms of service
                </Text>{" "}
                and{" "}
                <Text style={{ color: Colors.primary.blue }}>
                  privacy policy
                </Text>
              </Text>
            </View>
            {errors.terms && (
              <Text style={[tw`text-sm mb-4 -mt-2`, { color: "#EF4444" }]}>
                {errors.terms}
              </Text>
            )}

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                tw`py-4 rounded-lg items-center justify-center mb-4`,
                {
                  backgroundColor: formState.isLoading
                    ? "#9CA3AF"
                    : Colors.primary.blue,
                  opacity: formState.isLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleRegister}
              disabled={formState.isLoading}
              accessibilityLabel="Create account"
              accessibilityRole="button"
            >
              <Text style={tw`text-white font-semibold text-lg`}>
                {formState.isLoading ? "Creating Account..." : "Sign Up"}
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
              style={tw`py-4 rounded-lg items-center justify-center border border-gray-300 bg-white flex-row mb-6`}
              onPress={handleGoogleRegister}
              accessibilityLabel="Sign up with Google"
              accessibilityRole="button"
            >
              <GoogleLogo size={25} />
              <Text
                style={[
                  tw`font-semibold text-lg ml-3`,
                  { color: Colors.text.head },
                ]}
              >
                Sign Up with Google
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View
        style={[
          tw`items-center pb-8`,
          tw`${responsiveDimensions.containerPadding}`,
        ]}
      >
        <Text style={[tw`text-center`, { color: Colors.text.sub }]}>
          Already have an account?{" "}
          <Text
            style={[tw`font-bold`, { color: Colors.primary.blue }]}
            onPress={handleSignIn}
          >
            Sign In
          </Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
