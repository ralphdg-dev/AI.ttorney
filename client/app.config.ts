import { ExpoConfig, ConfigContext } from 'expo/config';

// Set EXPO_ROUTER_APP_ROOT at the earliest possible point
// This runs before Metro bundler initialization in all environments (local, EAS, CI/CD)
process.env.EXPO_ROUTER_APP_ROOT = './app';

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
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.aittorney.app',
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLName: 'ai-ttorney',
          CFBundleURLSchemes: ['ai-ttorney', 'exp+ai-ttorney'],
        },
      ],
      NSCameraUsageDescription: 'AI.ttorney needs camera access for lawyer verification and document scanning.',
      NSPhotoLibraryUsageDescription: 'AI.ttorney needs photo library access for profile pictures and document uploads.',
      NSMicrophoneUsageDescription: 'AI.ttorney needs microphone access for video recording in lawyer verification.',
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    package: 'com.aittorney.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'ai-ttorney',
          },
          {
            scheme: 'exp+ai-ttorney',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-web-browser',
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
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow AI.ttorney to use your location to find nearby law firms and legal services.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    eas: {
      projectId: '586d8e19-554a-4ea4-821f-635b25e93de9',
    },
  },
});
