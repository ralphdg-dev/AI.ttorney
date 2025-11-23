module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }]
    ],
    plugins: [
      ["module-resolver", {
        root: ["./"],
        alias: {
          "@": "./",
          "tailwind.config": "./tailwind.config.js"
        }
      }],
      ["babel-plugin-transform-inline-environment-variables", {
        include: [
          "EXPO_ROUTER_APP_ROOT",
          "EXPO_PUBLIC_SUPABASE_URL",
          "EXPO_PUBLIC_SUPABASE_ANON_KEY",
          "EXPO_PUBLIC_API_URL",
          "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
        ]
      }],
      'react-native-reanimated/plugin',
    ],
  };
};