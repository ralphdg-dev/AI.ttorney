import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";

interface BackButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

export default function BackButton({ 
  onPress, 
  color = "#A0A0A0", 
  size = 24 
}: BackButtonProps) {
  const handlePress = () => {
    onPress();
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={tw`p-2`}
      activeOpacity={0.7}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    >
      <Ionicons name="arrow-back" size={size} color={color} />
    </TouchableOpacity>
  );
}