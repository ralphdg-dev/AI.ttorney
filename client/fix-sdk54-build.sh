#!/bin/bash

echo "🔧 Fixing AI.ttorney SDK 54 Build Issues..."

# Clean npm cache and node_modules
echo "🧹 Cleaning dependencies..."
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force

# Install dependencies
echo "📦 Installing stable SDK 54 dependencies..."
npm install

# Clear Metro cache
echo "🚀 Clearing Metro cache..."
npx expo start --clear

echo "✅ SDK 54 build fix complete!"
echo "🎯 Key changes applied:"
echo "   - Downgraded to stable React 18.3.1 and React Native 0.76.5"
echo "   - Fixed Expo Router to stable 3.5.23 version"
echo "   - Added required @expo/metro-runtime and react-native-worklets"
echo "   - Simplified babel config (removed NativeWind conflicts)"
echo "   - Added expo-web-browser plugin for SDK 54"
echo "   - Updated TypeScript and ESLint to SDK 54 compatible versions"
echo ""
echo "🚀 Ready to test in Expo Go!"
