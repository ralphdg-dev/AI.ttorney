import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import { useState } from 'react';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      // Navigate based on selected role
      if (selectedRole === "lawyer") {
        //	router.push("/lawyer-signup");
      } else if (selectedRole === "seeker") {
        // router.push("/seeker-signup");
      }
    }
    console.log("Continue pressed with role:", selectedRole);
  };

  const handleContinueAsGuest = () => {
    // router.push("/home");
    console.log("Continue as guest pressed");
  };

  const handleSkip = () => {
    // Skip to guest mode or next screen
    handleContinueAsGuest();
  };

  // Responsive styles
  const responsiveStyles: ResponsiveStyles = {
    container: {
      paddingHorizontal: isSmallScreen ? 16 : isMediumScreen ? 20 : 24,
    },
    topPadding: {
      paddingTop: isShortScreen ? 8 : 12,
    },
    headingContainer: {
      marginBottom: isShortScreen ? 20 : isMediumScreen ? 32 : 48,
      marginTop: isShortScreen ? 8 : 16,
    },
    headingText: {
      fontSize: isSmallScreen ? 20 : isMediumScreen ? 22 : 24,
      lineHeight: isSmallScreen ? 22 : isMediumScreen ? 26 : 28,
    },
    cardContainer: {
      paddingHorizontal: isSmallScreen ? 8 : isMediumScreen ? 24 : 48,
      flex: 1,
      justifyContent: isShortScreen ? "flex-start" : "center",
    },
    card: {
      padding: isSmallScreen ? 16 : isMediumScreen ? 20 : 24,
      marginBottom: isShortScreen ? 12 : 16,
    },
    iconContainer: {
      width: isSmallScreen ? 64 : isMediumScreen ? 80 : 96,
      height: isSmallScreen ? 64 : isMediumScreen ? 80 : 96,
      marginBottom: isSmallScreen ? 8 : 12,
    },
    lawyerImage: {
      width: isSmallScreen ? 64 : isMediumScreen ? 80 : 96,
      height: isSmallScreen ? 64 : isMediumScreen ? 80 : 96,
      marginBottom: isSmallScreen ? 8 : 12,
    },
    iconSize: isSmallScreen ? 24 : isMediumScreen ? 28 : 32,
    cardTitle: {
      fontSize: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
      marginBottom: isSmallScreen ? 4 : 8,
    },
    cardDescription: {
      fontSize: isSmallScreen ? 12 : isMediumScreen ? 14 : 14,
      lineHeight: isSmallScreen ? 14 : isMediumScreen ? 16 : 18,
    },
    buttonContainer: {
      paddingBottom: isShortScreen ? 16 : 32,
      paddingTop: isShortScreen ? 8 : 0,
    },
    button: {
      paddingVertical: isSmallScreen ? 12 : isMediumScreen ? 14 : 16,
      marginBottom: isSmallScreen ? 12 : 16,
    },
    buttonText: {
      fontSize: isSmallScreen ? 16 : isMediumScreen ? 17 : 18,
    },
  };

  const renderContent = () => (
    <View style={[tw`flex-1`, responsiveStyles.container]}>
      {/* Heading */}
      <View style={responsiveStyles.headingContainer}>
        <Text
          style={[
            tw`text-center font-bold mb-0`,
            {
              color: Colors.text.head,
              fontSize: responsiveStyles.headingText.fontSize,
              lineHeight: responsiveStyles.headingText.lineHeight,
            },
          ]}
        >
          Bawat kwento, may
        </Text>
        <Text
          style={[
            tw`text-center font-bold mb-0`,
            {
              color: Colors.text.head,
              fontSize: responsiveStyles.headingText.fontSize,
              lineHeight: responsiveStyles.headingText.lineHeight,
            },
          ]}
        >
          dalawang panig.
        </Text>
        <Text
          style={[
            tw`text-center font-bold`,
            {
              color: Colors.text.head,
              fontSize: responsiveStyles.headingText.fontSize,
              lineHeight: responsiveStyles.headingText.lineHeight,
            },
          ]}
        >
          Nasaan ka?
        </Text>
      </View>

      {/* Role Cards */}
      <View style={responsiveStyles.cardContainer}>
        {/* Lawyer Card */}
        <TouchableOpacity
          onPress={() => setSelectedRole("lawyer")}
          style={[
            tw`rounded-lg border`,
            responsiveStyles.card,
            {
              borderColor:
                selectedRole === "lawyer" ? Colors.primary.blue : "#E5E7EB",
              backgroundColor: selectedRole === "lawyer" ? "#F0F8FF" : "white",
            },
          ]}
        >
          <View style={tw`items-center`}>
            <Image
              source={
                selectedRole === "lawyer" ? lawyer_selected : lawyer_notselected
              }
              style={[
                {
                  width: responsiveStyles.lawyerImage.width,
                  height: responsiveStyles.lawyerImage.height,
                  marginBottom: responsiveStyles.lawyerImage.marginBottom,
                },
              ]}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[
              tw`text-center font-bold`,
              {
                color: Colors.text.head,
                fontSize: responsiveStyles.cardTitle.fontSize,
                marginBottom: responsiveStyles.cardTitle.marginBottom,
              },
            ]}
          >
            Lawyer
          </Text>
          <Text
            style={[
              tw`text-center`,
              {
                color: Colors.text.sub,
                fontSize: responsiveStyles.cardDescription.fontSize,
                lineHeight: responsiveStyles.cardDescription.lineHeight,
              },
            ]}
          >
            Para sa lisensyadong abogado na nagbibigay ng libreng gabay
          </Text>
        </TouchableOpacity>

        {/* Legal Seeker Card */}
        <TouchableOpacity
          onPress={() => setSelectedRole("seeker")}
          style={[
            tw`rounded-lg border`,
            responsiveStyles.card,
            {
              borderColor:
                selectedRole === "seeker" ? Colors.primary.blue : "#E5E7EB",
              backgroundColor: selectedRole === "seeker" ? "#F0F8FF" : "white",
            },
          ]}
        >
          <View style={tw`items-center mb-4`}>
            <Image
              source={
                selectedRole === "seeker"
                  ? legalseeker_selected
                  : legalseeker_notselected
              }
              style={[
                {
                  width: responsiveStyles.lawyerImage.width,
                  height: responsiveStyles.lawyerImage.height,
                  marginBottom: responsiveStyles.lawyerImage.marginBottom,
                },
              ]}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[
              tw`text-center font-bold`,
              {
                color: Colors.text.head,
                fontSize: responsiveStyles.cardTitle.fontSize,
                marginBottom: responsiveStyles.cardTitle.marginBottom,
              },
            ]}
          >
            Legal Seeker
          </Text>
          <Text
            style={[
              tw`text-center`,
              {
                color: Colors.text.sub,
                fontSize: responsiveStyles.cardDescription.fontSize,
                lineHeight: responsiveStyles.cardDescription.lineHeight,
              },
            ]}
          >
            Para sa mga naghahanap ng legal na impormasyon o tulong
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={responsiveStyles.buttonContainer}>
        {/* Continue Button */}
        <TouchableOpacity
          style={[
            tw`rounded-lg items-center justify-center`,
            responsiveStyles.button,
            {
              backgroundColor: selectedRole ? Colors.primary.blue : "#D1D5DB",
            },
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
        >
          <Text
            style={[
              tw`font-semibold`,
              {
                color: selectedRole ? "white" : "#9CA3AF",
                fontSize: responsiveStyles.buttonText.fontSize,
              },
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>

        {/* Continue as Guest */}
        <Text
          style={[
            tw`text-center mb-1`,
            {
              color: Colors.text.sub,
              fontSize: isSmallScreen ? 14 : 16,
            },
          ]}
        >
          Already have an account?{" "}
          <Text
            style={[tw`font-bold`, { color: Colors.primary.blue }]}
            onPress={() => router.push("/login")}
          >
            Login
          </Text>
        </Text>
      </View>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Static Header - Same as Onboarding */}
      <View style={tw`flex-row justify-between items-center px-6 pt-12 pb-4`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`p-2`}>
          <Ionicons name="arrow-back" size={24} color="#A0A0A0" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={tw`p-2`}>
          <Text style={[tw`text-base font-medium`, { color: "#A0A0A0" }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {isShortScreen ? (
        // Use ScrollView for short screens
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      ) : (
        // Regular layout for taller screens
        renderContent()
      )}
    </View>
  );
}