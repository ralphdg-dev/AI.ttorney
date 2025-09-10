import React from 'react';
import { StatusBar, Image, View, Text, SafeAreaView } from 'react-native';
import BackButton from './BackButton';
import StickyFooterButton from './StickyFooterButton';

export type StatusScreenProps = {
  image: any; // require('path/to/image.png')
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void; // keep router wiring out for now
};

export default function StatusScreen({ image, title, description, buttonLabel, onPress }: StatusScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with BackButton */}
      <View className="flex-row items-center px-6 pt-12 pb-4">
        <BackButton onPress={onPress} />
      </View>

      {/* Centered content */}
      <View className="flex-1 items-center justify-center px-6 -mt-44">
        <Image source={image} style={{ width: 180, height: 180, marginBottom: 20 }} resizeMode="contain" />
        <Text className="text-[22px] font-bold text-gray-900 text-center mb-2">{title}</Text>
        <Text className="text-[15px] text-gray-500 text-center">{description}</Text>
      </View>

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
