import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false}} />
      <Stack.Screen name="onboarding/onboarding_1" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/onboarding_2" options={{ headerShown: false }} />
    </Stack>
  );
}