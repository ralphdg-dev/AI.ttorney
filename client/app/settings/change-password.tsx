import React, { useState } from "react";
import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { Eye, EyeOff } from "lucide-react-native";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!oldPassword || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Both passwords must match");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Must be at least 8 characters");
      return;
    }

    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        "Success", 
        "Your password has been reset successfully",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
      
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Error", "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Box className="flex-1 bg-white">
      <Header showBackButton={true} showMenu={false} onBackPress={() => router.back()} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 8 }}>
          Create new password
        </GSText>
        
        {/* Old Password Field */}
        <VStack style={{ marginBottom: 24 }}>
          <GSText size="sm" style={{ color: Colors.text.head, marginBottom: 8 }}>
            Current Password
          </GSText>
          <View style={{ position: 'relative' }}>
            <Input variant="outline" size="lg" style={{ borderColor: '#E5E7EB', borderRadius: 8 }}>
              <InputField
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showOldPassword}
                style={{ fontSize: 16, paddingVertical: 16, paddingRight: 48 }}
              />
            </Input>
            <TouchableOpacity
              onPress={() => setShowOldPassword(!showOldPassword)}
              style={{ position: 'absolute', right: 16, top: 18 }}
            >
              {showOldPassword ? (
                <EyeOff size={20} color="#9CA3AF" />
              ) : (
                <Eye size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
          <GSText size="xs" style={{ color: Colors.text.sub, marginTop: 8 }}>
            Enter your current password.
          </GSText>
        </VStack>

        {/* Password Field */}
        <VStack style={{ marginBottom: 24 }}>
          <GSText size="sm" style={{ color: Colors.text.head, marginBottom: 8 }}>
            New Password
          </GSText>
          <View style={{ position: 'relative' }}>
            <Input variant="outline" size="lg" style={{ borderColor: '#E5E7EB', borderRadius: 8 }}>
              <InputField
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                style={{ fontSize: 16, paddingVertical: 16, paddingRight: 48 }}
              />
            </Input>
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 16, top: 18 }}
            >
              {showPassword ? (
                <EyeOff size={20} color="#9CA3AF" />
              ) : (
                <Eye size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
          <GSText size="xs" style={{ color: Colors.text.sub, marginTop: 8 }}>
            Must be at least 8 characters.
          </GSText>
        </VStack>

        {/* Confirm Password Field */}
        <VStack style={{ marginBottom: 32 }}>
          <GSText size="sm" style={{ color: Colors.text.head, marginBottom: 8 }}>
            Confirm New Password
          </GSText>
          <View style={{ position: 'relative' }}>
            <Input variant="outline" size="lg" style={{ borderColor: '#E5E7EB', borderRadius: 8 }}>
              <InputField
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                style={{ fontSize: 16, paddingVertical: 16, paddingRight: 48 }}
              />
            </Input>
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ position: 'absolute', right: 16, top: 18 }}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#9CA3AF" />
              ) : (
                <Eye size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
          <GSText size="xs" style={{ color: Colors.text.sub, marginTop: 8 }}>
            Both passwords must match.
          </GSText>
        </VStack>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            onPress={handleCancel}
            disabled={loading}
            style={{ 
              flex: 1,
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              paddingVertical: 16,
              opacity: loading ? 0.5 : 1
            }}
          >
            <ButtonText style={{ color: "#6B7280", fontSize: 16, fontWeight: '600' }}>
              Cancel
            </ButtonText>
          </Button>
          
          <Button
            onPress={handleResetPassword}
            disabled={loading}
            style={{ 
              flex: 1,
              backgroundColor: loading ? "#9CA3AF" : Colors.primary.blue,
              borderRadius: 12,
              paddingVertical: 16,
              opacity: loading ? 0.7 : 1
            }}
          >
            <ButtonText style={{ color: "#FFFFFF", fontSize: 16, fontWeight: '600' }}>
              {loading ? "Resetting..." : "Reset Password"}
            </ButtonText>
          </Button>
        </View>
      </ScrollView>
      
      <Navbar />
    </Box>
  );
}
