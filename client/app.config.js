export default {
  expo: {
    name: "Ai.ttorney",
    slug: "aittorney",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "ai-ttorney",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    owner: "j24angeles",
    android: {
      icon: "./assets/images/icon.png",
      softwareKeyboardLayoutMode: "resize",
      windowSoftInputMode: "adjustResize",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    ios: {
      infoPlist: {
        NSCameraUsageDescription: "AI.ttorney needs access to your camera to take profile photos.",
        NSPhotoLibraryUsageDescription: "AI.ttorney needs access to your photo library to select profile photos."
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-font",
      "expo-image-picker",
      [
        "react-native-maps",
        {
          ios: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
          android: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "586d8e19-554a-4ea4-821f-635b25e93de9"
      }
    }
  }
};
