import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';
import StickyFooterButton from './StickyFooterButton';
import { Box } from './box';
import { Text } from './text';
import { Image } from './image';

export type StatusScreenProps = {
  image: any; // require('path/to/image.png')
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void; // keep router wiring out for now
  onBack?: () => void; // optional back button handler
  showBackButton?: boolean; // whether to show back button (default: true)
  imageAlt?: string; // accessibility alt text for image
};

export default function StatusScreen({ image, title, description, buttonLabel, onPress, onBack, showBackButton = true, imageAlt }: StatusScreenProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Default back behavior - use router
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/home');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with BackButton */}
      {showBackButton && (
        <Box className="flex-row items-center px-6 pt-12 pb-4" style={{ zIndex: 1000 }}>
          <BackButton onPress={handleBack} />
        </Box>
      )}

      {/* Centered content with bottom padding to prevent overlap */}
      <Box className="flex-1 items-center justify-center px-6 pb-32">
        <Image 
          source={image} 
          className="w-[180px] h-[180px] mb-5" 
          resizeMode="contain"
          alt={imageAlt || title}
        />
        <Text className="text-[22px] font-bold text-gray-900 text-center mb-2">{title}</Text>
        <Text className="text-[15px] text-gray-500 text-center">{description}</Text>
      </Box>

      {/* Sticky footer button */}
      <StickyFooterButton
        title={buttonLabel}
        disabled={false}
        bottomOffset={16}
        onPress={onPress}
      />
    </SafeAreaView>
  );
}
