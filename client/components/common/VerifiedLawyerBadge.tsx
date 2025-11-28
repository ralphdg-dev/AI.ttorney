import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { Shield } from 'lucide-react-native';

interface VerifiedLawyerBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { icon: 12, text: 10, paddingV: 2, paddingH: 6, radius: 9999 },
  md: { icon: 14, text: 12, paddingV: 3, paddingH: 8, radius: 9999 },
  lg: { icon: 16, text: 14, paddingV: 4, paddingH: 10, radius: 9999 },
} as const;

export const VerifiedLawyerBadge: React.FC<VerifiedLawyerBadgeProps> = ({ size = 'sm' }) => {
  const { width: screenWidth } = useWindowDimensions();
  const s = sizeMap[size];
  
  // Calculate responsive font size based on screen width
  const responsiveFontSize = Math.max(s.text, screenWidth * 0.025);
  const responsiveIconSize = Math.max(s.icon, screenWidth * 0.03);
  
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5', // green-50
        borderColor: '#A7F3D0', // green-200
        borderWidth: 1,
        paddingVertical: s.paddingV,
        paddingHorizontal: s.paddingH,
        borderRadius: s.radius,
        maxWidth: screenWidth * 0.4, // Prevent overflow on small screens
        minWidth: screenWidth * 0.25, // Ensure minimum width
      }}
    >
      <Shield 
        size={responsiveIconSize} 
        color="#10B981" 
        fill="#10B981" 
        stroke="none" 
        strokeWidth={0} 
      />
      <Text
        style={{
          marginLeft: 4,
          fontSize: responsiveFontSize,
          fontWeight: '600',
          color: '#047857', // green-700
          flexShrink: 1, // Allow text to shrink if needed
        }}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.7}
      >
        Verified Lawyer
      </Text>
    </View>
  );
};

export default VerifiedLawyerBadge;
