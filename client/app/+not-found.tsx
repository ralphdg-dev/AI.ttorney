import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, type ViewStyle, type TextStyle, type ImageStyle } from "react-native";
import { useRouter } from "expo-router";
import { Home, Search } from "lucide-react-native";
import Colors from "@/constants/Colors";
import notfoundImage from "../public/assets/404.png";

const NotFound = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* 404 Image and Status */}
      <View style={styles.iconContainer}>
        <Image 
          source={notfoundImage} 
          style={styles.errorImage}
          resizeMode="contain"
        />
      </View>

      {/* Error Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.titleText}>Page Not Found</Text>
        <Text style={styles.subtitleText}>
          Oops! The page you're looking for doesn't exist or has been moved.
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/")}
        activeOpacity={0.8}
      >
        <Home size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  } as ViewStyle,
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  } as ViewStyle,
  errorImage: {
    width: 320,
    height: 320,
    marginBottom: 0,
  } as ImageStyle,
  statusText: {
    fontSize: 64,
    fontWeight: "700",
    color: Colors.text.tertiary,
    marginTop: 16,
    fontFamily: "Inter_700Bold",
  } as TextStyle,
  messageContainer: {
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
  } as ViewStyle,
  titleText: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  } as TextStyle,
  subtitleText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  } as TextStyle,
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: "Inter_600SemiBold",
  } as TextStyle,
  quickNavContainer: {
    alignItems: "center",
    width: "100%",
  } as ViewStyle,
  quickNavTitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginBottom: 16,
    fontFamily: "Inter_500Medium",
  } as TextStyle,
  quickNavButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  } as ViewStyle,
  quickNavButton: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
  } as ViewStyle,
  quickNavButtonText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontFamily: "Inter_500Medium",
  } as TextStyle,
});

export default NotFound;
