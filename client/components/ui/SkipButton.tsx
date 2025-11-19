import { TouchableOpacity, Text } from "react-native";
import tw from "tailwind-react-native-classnames";

interface SkipButtonProps {
  onPress: () => void;
  title?: string;
  color?: string;
}

export default function SkipButton({ 
  onPress, 
  title = "Skip",
  color = "#A0A0A0"
}: SkipButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} style={tw`p-2`}>
      <Text style={[tw`text-base font-medium`, { color }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
} 