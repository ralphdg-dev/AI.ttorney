import { TouchableOpacity, Text, Dimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "../../constants/Colors";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const { width } = Dimensions.get("window");

export default function PrimaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false 
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[
        tw`py-3 rounded-lg flex-row items-center justify-center mb-3`,
        { 
          backgroundColor: disabled ? "#D1D5DB" : Colors.primary.blue,
          width: width - 64, // Slightly narrower: full width minus 32px on each side
          height: 56, // Fixed height
          alignSelf: 'center', // Center the button
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <Text
        style={[
          tw`text-white font-semibold text-lg`,
          {
            color: disabled ? "#9CA3AF" : "white",
          },
        ]}
      >
        {loading ? "Loading..." : title}
      </Text>
    </TouchableOpacity>
  );
} 