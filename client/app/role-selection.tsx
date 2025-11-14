import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { useState } from "react";
import Colors from "../constants/Colors";
import StickyFooterButton from "../components/ui/StickyFooterButton";
import { apiClient } from "../lib/api-client";
import { useAuth } from "../contexts/AuthContext";

import lawyer_selected from "../assets/images/lawyer_selected.png";
import lawyer_notselected from "../assets/images/lawyer_notselected.png";
import legalseeker_selected from "../assets/images/legalseeker_selected.png";
import legalseeker_notselected from "../assets/images/legalseeker_notselected.png";

const { width, height } = Dimensions.get("window");

// responsive breakpoints
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isShortScreen = height < 700;

// types for responsive styles
interface ResponsiveStyles {
  container: {
    paddingHorizontal: number;
  };
  topPadding: {
    paddingTop: number;
  };
  headingContainer: {
    marginBottom: number;
    marginTop: number;
  };
  headingText: {
    fontSize: number;
    lineHeight: number;
  };
  cardContainer: {
    paddingHorizontal: number;
    flex: number;
    justifyContent: "flex-start" | "center";
  };
  card: {
    padding: number;
    marginBottom: number;
  };
  iconContainer: {
    width: number;
    height: number;
    marginBottom: number;
  };
  lawyerImage: {
    width: number;
    height: number;
    marginBottom: number;
  };
  iconSize: number;
  cardTitle: {
    fontSize: number;
    marginBottom: number;
  };
  cardDescription: {
    fontSize: number;
    lineHeight: number;
  };
  buttonContainer: {
    paddingBottom: number;
    paddingTop: number;
  };
  button: {
    paddingVertical: number;
    marginBottom: number;
  };
  buttonText: {
    fontSize: number;
  };
}

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUserData, user } = useAuth();


  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    
    try {
      // Get user email from AuthContext instead of AsyncStorage
      const userEmail = user?.email;
      
      
      if (!userEmail) {
        Alert.alert('Error', 'User email not found. Please try logging in again.');
        setIsLoading(false);
        return;
      }

      // Both seeker and lawyer selections result in registered_user role
      const apiRoleSelection = "registered_user";
      
      // Call role selection API
      
      const response = await apiClient.selectRole({
        email: userEmail,
        selected_role: apiRoleSelection
      });


      if (response.success) {
        // Refresh user data in AuthContext to update role
        await refreshUserData();
        
        // Navigate based on selected role
        console.log('✅ Role updated successfully, navigating...');
        
        if (selectedRole === "seeker") {
          // Legal seeker goes to home page - use replace to prevent back navigation
          console.log('🏠 Navigating to home for legal seeker');
          router.replace("/home");
        } else if (selectedRole === "lawyer") {
          // Lawyer goes to verification instructions - use replace to prevent back navigation
          console.log('⚖️ Navigating to lawyer verification for lawyer');
          router.replace("/onboarding/lawyer/verification-instructions");
        } else {
          // Fallback
          console.log('🔄 Fallback navigation to home');
          router.replace("/home");
        }
      } else {
        console.error('❌ Role selection failed:', response.error);
        Alert.alert('Error', response.error || 'Failed to update role');
      }
    } catch {
      Alert.alert('Error', 'Failed to update role. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

    </View>
  );

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Responsive, scrollable content */}
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Sticky footer button */}
      <StickyFooterButton
        title={isLoading ? "Updating..." : "Continue"}
        onPress={handleContinue}
        disabled={!selectedRole || isLoading}
        bottomOffset={0}
      />
    </View>
  );
}
