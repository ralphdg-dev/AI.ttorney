import { StyleSheet } from 'react-native';

export const GlobalStyles = StyleSheet.create({
  // Global text styles with Inter font
  text: {
    fontFamily: 'Inter_400Regular',
  },
  textMedium: {
    fontFamily: 'Inter_500Medium',
  },
  textSemiBold: {
    fontFamily: 'Inter_600SemiBold',
  },
  textBold: {
    fontFamily: 'Inter_700Bold',
  },
});

// Default font family for the entire app
export const defaultFontFamily = 'Inter_400Regular'; 