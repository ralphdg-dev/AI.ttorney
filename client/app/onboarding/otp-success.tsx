import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Box } from "../../components/ui/box";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { StatusBar } from "../../components/ui/status-bar";
import { Image } from "../../components/ui/image";
import Colors from "../../constants/Colors";
// import successIcon from "../../assets/images/registration/success.png";

export default function OtpSuccess() {
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : "";

  useEffect(() => {
    // Automatically redirect to login after 2 seconds
    const timer = setTimeout(() => {
      console.log('Auto-redirecting to login page...');
      router.replace('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <VStack className="flex-1 justify-center items-center px-6">
        {/* Success Icon - Using emoji instead */}
        <Box className="mb-8">
          <Text style={{ fontSize: 64, textAlign: 'center' }}>✅</Text>
        </Box>

        {/* Success Message */}
        <VStack className="items-center space-y-4">
          <Text 
            className="text-2xl font-bold text-center"
            style={{ color: Colors.text.head }}
          >
            Email Verified Successfully!
          </Text>
          
          <Text 
            className="text-base text-center leading-6"
            style={{ color: Colors.text.sub }}
          >
            Your email {email} has been verified.{'\n'}
            Redirecting to login page...
          </Text>
          
          <Box className="mt-4">
            <Text 
              className="text-sm text-center"
              style={{ color: Colors.primary.blue }}
            >
              Please wait...
            </Text>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
}
