import { Text, View } from "react-native";
import tw from "tailwind-react-native-classnames";
import { router } from "expo-router";
import Colors from "../../constants/Colors";

interface ActionLinkProps {
  text?: string;
  linkText?: string;
  route?: string;
  onPress?: () => void;
}

export default function ActionLink({ 
  text = "Already have an account?", 
  linkText = "Login",
  route = "/login",
  onPress
}: ActionLinkProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={tw`absolute bottom-8 left-0 right-0 items-center`}>
      <Text style={[tw`text-center`, { color: Colors.text.sub }]}>
        {text}{" "}
        <Text
          style={[tw`font-bold`, { color: Colors.primary.blue }]}
          onPress={handlePress}
        >
          {linkText}
        </Text>
      </Text>
    </View>
  );
} 