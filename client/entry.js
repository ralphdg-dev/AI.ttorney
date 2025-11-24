/**
 * Custom entry point for Expo Router
 * Sets EXPO_ROUTER_APP_ROOT before expo-router initializes
 * This ensures routes are discovered correctly in all environments
 * 
 * This runs BEFORE any other code, including Metro bundler transforms
 */

try {
  // Set EXPO_ROUTER_APP_ROOT as early as possible (BEFORE expo-router loads)
  if (!process.env.EXPO_ROUTER_APP_ROOT) {
    process.env.EXPO_ROUTER_APP_ROOT = './app';
    console.log('✅ [entry.js] Set EXPO_ROUTER_APP_ROOT=./app');
  } else {
    console.log('✅ [entry.js] EXPO_ROUTER_APP_ROOT already set:', process.env.EXPO_ROUTER_APP_ROOT);
  }

  // Verify the value is a string (required by require.context)
  if (typeof process.env.EXPO_ROUTER_APP_ROOT !== 'string') {
    throw new Error(`EXPO_ROUTER_APP_ROOT must be a string, got: ${typeof process.env.EXPO_ROUTER_APP_ROOT}`);
  }

  console.log('✅ [entry.js] Loading expo-router/entry...');
  
  // Now load the actual expo-router entry
  require('expo-router/entry');
  
  console.log('✅ [entry.js] expo-router/entry loaded successfully');
  
} catch (error) {
  console.error('❌ [entry.js] Fatal error during initialization:', error);
  
  // Attempt to show error to user
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
  
  // Re-throw to prevent silent failures
  throw error;
}
