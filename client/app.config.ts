import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Ai.ttorney',
  slug: 'aittorney',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'ai-ttorney',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  owner: 'j24a',
  android: {
    package: 'com.j24a.aittorney',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'ai-ttorney' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '586d8e19-554a-4ea4-821f-635b25e93de9',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://aittorney-staging.up.railway.app',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vmlbrckrlgwlobhnpstx.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbGJyY2tybGd3bG9iaG5wc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDI5MDksImV4cCI6MjA2OTM3ODkwOX0.ucK9BXmRg7wYaamFBkTKWTkOavlp7SzNrZwDvNmKsK8',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyD0OPK0U7WdEwlzNh7XKsYpYVMyHea-G80',
  },
});
