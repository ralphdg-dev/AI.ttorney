import { Stack } from 'expo-router';

export default function ArticleLayout() {
  return (
    <Stack>
      {/* Hide the default Stack header for the article detail screen */}
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
