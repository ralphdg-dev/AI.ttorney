import { TouchableOpacity, Text, Platform, Dimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "../../constants/Colors";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function PrimaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false 
}: PrimaryButtonProps) {
  const { width: screenWidth } = Dimensions.get('window');
  
  // Responsive font size based on screen width
  const getFontSize = () => {
    if (screenWidth < 350) return 15; // Very small screens
    if (screenWidth < 400) return 16; // Small screens
    return 18; // Normal and larger screens
  };
  
  // Responsive padding based on screen width
  const getHorizontalPadding = () => {
    if (screenWidth < 350) return 12; // Very small screens
    if (screenWidth < 400) return 16; // Small screens
    return 20; // Normal and larger screens
  };
  
  return (
    <TouchableOpacity
      style={[
        tw`py-3 rounded-lg flex-row items-center justify-center mb-3`,
        { 
          backgroundColor: disabled ? "#D1D5DB" : Colors.primary.blue,
          width: '100%', // Use 100% width to respect parent container padding
          minHeight: 56, // Minimum height to allow expansion if needed
          paddingHorizontal: getHorizontalPadding(), // Responsive horizontal padding
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <Text
        style={[
          tw`text-white font-semibold text-center`,
          {
            color: disabled ? "#9CA3AF" : "white",
            fontSize: getFontSize(),
            flexShrink: 1, // Allow text to shrink if needed
            flexWrap: 'wrap', // Allow text to wrap on very small screens
            textAlign: 'center',
            lineHeight: getFontSize() + 4,
            // Android-specific fixes to prevent clipping
            ...(Platform.OS === 'android' && {
              includeFontPadding: false,
              textAlignVertical: 'center',
            }),
          },
        ]}
        numberOfLines={2} // Allow up to 2 lines if needed on very small screens
        adjustsFontSizeToFit={true} // Auto-adjust font size to fit
        minimumFontScale={0.85} // Don't shrink below 85% of original size
      >
        {loading ? "Loading..." : title}
      </Text>
    </TouchableOpacity>
  );
} 