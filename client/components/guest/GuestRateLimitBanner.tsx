import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { useGuest } from '@/contexts/GuestContext';

interface GuestRateLimitBannerProps {
  variant?: 'warning' | 'limit-reached';
  showInChatbot?: boolean;
}

/**
 * Simplified rate limit banner for guest users
 * Clean, minimalist design with clear visual hierarchy
 */
export const GuestRateLimitBanner: React.FC<GuestRateLimitBannerProps> = ({ 
  variant = 'warning',
  showInChatbot = false 
}) => {
  const router = useRouter();
  const { promptsRemaining, hasReachedLimit, timeUntilReset } = useGuest();

  // Don't show if not in chatbot and has plenty of prompts
  if (!showInChatbot && promptsRemaining > 5) {
    return null;
  }

  const handleUpgrade = () => {
    router.push('/onboarding/registration');
  };

  // Limit reached state - minimal and clear
  if (hasReachedLimit) {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.limitReached]}>
          <Clock size={16} color="#DC2626" strokeWidth={2} />
          <View style={styles.content}>
            <Text style={styles.limitText}>
              Free prompts reset {timeUntilReset}
            </Text>
            <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.7}>
              <Text style={styles.upgradeLink}>Upgrade now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Warning state - subtle and informative
  const isLowPrompts = promptsRemaining <= 3;
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.banner, 
        isLowPrompts ? styles.warning : styles.normal
      ]}>
        <Clock 
          size={16} 
          color={isLowPrompts ? "#F59E0B" : Colors.primary.blue} 
          strokeWidth={2} 
        />
        <Text style={[
          styles.text,
          isLowPrompts && styles.warningText
        ]}>
          {promptsRemaining} free messages left
        </Text>
        <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.7}>
          <Text style={styles.upgradeLink}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  normal: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  limitReached: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 13,
    color: Colors.text.body,
    ...GlobalStyles.text,
  },
  warningText: {
    color: '#92400E',
    fontWeight: '500',
  },
  limitText: {
    fontSize: 13,
    color: '#991B1B',
    ...GlobalStyles.text,
  },
  upgradeLink: {
    fontSize: 13,
    color: Colors.primary.blue,
    fontWeight: '600',
    ...GlobalStyles.textSemiBold,
  },
});
