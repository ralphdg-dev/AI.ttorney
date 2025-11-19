import React from 'react';
import { View, Text } from 'react-native';
import { Shield } from 'lucide-react-native';

interface VerifiedLawyerBadgeProps {
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: { icon: 12, text: 10, paddingV: 2, paddingH: 6, radius: 9999 },
  md: { icon: 14, text: 12, paddingV: 3, paddingH: 8, radius: 9999 },
} as const;

export const VerifiedLawyerBadge: React.FC<VerifiedLawyerBadgeProps> = ({ size = 'sm' }) => {
  const s = sizeMap[size];
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
      }}
    >
      <Shield size={s.icon} color="#10B981" fill="#10B981" stroke="none" strokeWidth={0} />
      <Text
        style={{
          marginLeft: 4,
          fontSize: s.text,
          fontWeight: '600',
          color: '#047857', // green-700
        }}
      >
        Verified Lawyer
      </Text>
    </View>
  );
};

export default VerifiedLawyerBadge;
