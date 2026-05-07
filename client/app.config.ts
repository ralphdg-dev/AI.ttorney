import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Ai.ttorney',
    slug: 'aittorney',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'ai-ttorney',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false, // Disabled for Expo Go compatibility
    owner: 'j24a',
    // platforms: ['android'], // Removed for Expo Go compatibility
    android: {
      package: 'com.j24a.aittorney',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION'
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD0OPK0U7WdEwlzNh7XKsYpYVMyHea-G80',
        },
      },
      intentFilters: [
        {
          action: 'VIEW',
          data: [{ scheme: 'ai-ttorney' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
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
      'expo-secure-store',
      'expo-web-browser',
      'expo-camera',
      'expo-image-picker',
      'expo-location'
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '3a516245-8faa-40f9-87b8-0d369afde669',
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vmlbrckrlgwlobhnpstx.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbGJyY2tybGd3bG9iaG5wc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDI5MDksImV4cCI6MjA2OTM3ODkwOX0.ucK9BXmRg7wYaamFBkTKWTkOavlp7SzNrZwDvNmKsK8',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD0OPK0U7WdEwlzNh7XKsYpYVMyHea-G80',
    },
  };
};
