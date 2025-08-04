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
  return (
    <TouchableOpacity onPress={onPress} style={tw`p-2`}>
      <Ionicons name="arrow-back" size={size} color={color} />
    </TouchableOpacity>
  );
} 