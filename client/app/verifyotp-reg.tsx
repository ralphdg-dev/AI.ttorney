import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  StatusBar,
  ScrollView,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { useState, useEffect, useRef } from "react";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import otpsent from "../assets/images/otpsent.png";
import PrimaryButton from "../components/ui/PrimaryButton";
import BackButton from "../components/ui/BackButton";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function VerifyOTP() {
  // Get email from route params using useLocalSearchParams
  const params = useLocalSearchParams();
  const email = params.email || "user@example.com";

  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");


  // Refs for OTP inputs
  const inputRefs = useRef([]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Timer for resend OTP
  useEffect(() => {
    let interval;
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

  // Responsive calculations
  const getResponsiveDimensions = () => {
    const { width, height } = screenData;
    const isTablet = width >= 768;
    const isLargeTablet = width >= 1024;
    const isSmallScreen = height < 700;
    const isVerySmallScreen = height < 600;
    const isLandscape = width > height;

    return {
      isTablet,
      isLargeTablet,
      isSmallScreen,
      isVerySmallScreen,
      isLandscape,
      width,
      height,
      // Container padding
      containerPadding: isLargeTablet ? 80 : isTablet ? 60 : 24,
      maxWidth: isTablet ? 480 : width - 48,
      // OTP box dimensions
      otpBoxSize: isLargeTablet ? 72 : isTablet ? 64 : isSmallScreen ? 48 : 56,
      otpBoxSpacing: isTablet ? 12 : isSmallScreen ? 6 : 8,
      // Typography
      headerSize: isLargeTablet ? 32 : isTablet ? 28 : isSmallScreen ? 20 : 24,
      subHeaderSize: isTablet ? 18 : isSmallScreen ? 14 : 16,
      bodySize: isTablet ? 16 : isSmallScreen ? 13 : 14,
      smallSize: isTablet ? 14 : 12,
      // Icon sizes
      iconSize: isTablet ? 36 : 28,
      backIconSize: isTablet ? 28 : 24,
      // Spacing
      iconContainerSize: isTablet ? 80 : isSmallScreen ? 56 : 64,
      verticalSpacing: isVerySmallScreen
        ? 16
        : isSmallScreen
        ? 24
        : isTablet
        ? 40
        : 32,
      smallVerticalSpacing: isVerySmallScreen
        ? 8
        : isSmallScreen
        ? 12
        : isTablet
        ? 20
        : 16,
      // Button
      buttonHeight: isTablet ? 56 : isSmallScreen ? 44 : 48,
      buttonTextSize: isTablet ? 18 : 16,
    };
  };

  const dimensions = getResponsiveDimensions();

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(""); // Clear error when user types

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
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
      // TODO: Implement OTP verification logic
      console.log("Verifying OTP:", otpString, "for email:", email);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if OTP is correct (for demo, accept 123456)
      if (otpString === "123456") {
        Alert.alert("Success", "Email verified successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Navigate to dashboard or next screen
              router.replace("/dashboard");
            },
          },
        ]);
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (error) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      // TODO: Implement resend OTP logic
      console.log("Resending OTP to:", email);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCanResend(false);
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      setError("");

      Alert.alert(
        "Code Sent",
        "A new verification code has been sent to your email."
      );

      // Focus first input
      inputRefs.current[0]?.focus();
    } catch (error) {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  const goBack = () => {
    router.push("/nonlaw-reg");
  };

  const maskEmail = (email) => {
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    const masked =
      localPart[0] + "*".repeat(localPart.length - 2) + localPart.slice(-1);
    return `${masked}@${domain}`;
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Navigation */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: Platform.OS === "ios" ? 60 : 40,
            paddingBottom: dimensions.smallVerticalSpacing,
            paddingHorizontal: dimensions.containerPadding,
          }}
        >
          <BackButton onPress={goBack} />
        </View>

        {/* Main Content Container */}
        <View
          style={{
            flex: 1,
            justifyContent:
              dimensions.isLandscape && !dimensions.isTablet
                ? "flex-start"
                : "center",
            paddingHorizontal: dimensions.containerPadding,
            paddingTop: dimensions.isLandscape && !dimensions.isTablet ? 20 : 0,
            maxWidth: dimensions.maxWidth,
            alignSelf: "center",
            width: "100%",
          }}
        >
          {/* Header */}
          <View
            style={{
              alignItems: "center",
              marginBottom: dimensions.verticalSpacing,
            }}
          >
            <Image
              source={otpsent}
              style={tw`w-36 h-36 mb-1 mr-6`}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: dimensions.headerSize,
                fontWeight: "bold",
                marginBottom: dimensions.smallVerticalSpacing,
                textAlign: "center",
                color: Colors.text.head,
              }}
            >
              Verify Your Email
            </Text>

                         <Text
               style={{
                 fontSize: dimensions.subHeaderSize,
                 textAlign: "center",
                 lineHeight: dimensions.subHeaderSize * 1.4,
                 marginBottom: dimensions.smallVerticalSpacing / 2,
                 color: Colors.text.sub,
               }}
             >
               We've sent a code to{" "}
               <Text style={{ fontWeight: "600", color: Colors.text.head }}>
                 {maskEmail(email)}
               </Text>
               . Enter it below to continue.
             </Text>
          </View>

          {/* OTP Input */}
          <View
            style={{
              alignItems: "center",
              marginBottom: dimensions.verticalSpacing,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: dimensions.isVerySmallScreen ? "wrap" : "nowrap",
              }}
            >
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={{
                                         width: dimensions.otpBoxSize * 0.8,
                    height: dimensions.otpBoxSize,
                    borderWidth: 2,
                    borderRadius: 12,
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: dimensions.isTablet
                      ? 24
                      : dimensions.isSmallScreen
                      ? 18
                      : 20,
                                         marginHorizontal: dimensions.otpBoxSpacing / 2,
                    marginVertical: dimensions.isVerySmallScreen ? 4 : 0,
                    borderColor: error
                      ? "#EF4444"
                      : digit
                      ? Colors.primary.blue
                      : "#E5E7EB",
                    backgroundColor: digit ? "#F0F9FF" : "white",
                    color: Colors.text.head,
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}

                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  accessibilityLabel={`Digit ${index + 1}`}
                />
              ))}
            </View>

            {error && (
              <Text
                style={{
                  fontSize: dimensions.bodySize,
                  marginTop: dimensions.smallVerticalSpacing,
                  textAlign: "center",
                  color: "#EF4444",
                  paddingHorizontal: 20,
                }}
              >
                {error}
              </Text>
            )}
          </View>

                                                      
          </View>
        </ScrollView>

                {/* Bottom Section - Fixed at bottom like onboarding */}
         <View style={tw`px-6 pb-12 mt-8`}>
           {/* Resend Code */}
           <View
             style={{
               alignItems: "center",
               marginBottom: 8,
             }}
           >
             <View
               style={{
                 flexDirection: "row",
                 alignItems: "center",
                 flexWrap: "wrap",
                 justifyContent: "center",
               }}
             >
               <Text
                 style={{
                   fontSize: dimensions.bodySize,
                   color: Colors.text.sub,
                 }}
               >
                 Didn't receive code?{" "}
               </Text>
               <TouchableOpacity
                 onPress={handleResendOTP}
                 disabled={!canResend}
                 accessibilityLabel="Resend verification code"
                 style={{ paddingVertical: 4, paddingHorizontal: 2 }}
               >
                 <Text
                   style={{
                     fontSize: dimensions.bodySize,
                     fontWeight: "600",
                     color: canResend ? "#3B82F6" : "#9CA3AF",
                     textDecorationLine: "none",
                   }}
                 >
                   {canResend ? "Resend OTP" : `Resend OTP (${resendTimer}s)`}
                 </Text>
               </TouchableOpacity>
             </View>
           </View>

           <PrimaryButton
             title={isLoading ? "Verifying..." : "Verify"}
             onPress={handleVerifyOTP}
             disabled={isLoading || !isOtpComplete}
             loading={isLoading}
           />
         </View>
      </KeyboardAvoidingView>
    );
  }
