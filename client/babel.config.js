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
          "EXPO_PUBLIC_SUPABASE_URL",
          "EXPO_PUBLIC_SUPABASE_ANON_KEY",
          "EXPO_PUBLIC_USE_SERVER_API",
          "EXPO_PUBLIC_SERVER_API_URL"
        ]
      }],
      'react-native-reanimated/plugin',
    ],
  };
};