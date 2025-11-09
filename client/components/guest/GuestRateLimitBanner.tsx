import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, AlertCircle, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { useGuest } from '@/contexts/GuestContext';
import { GUEST_PROMPT_LIMIT } from '@/config/guestConfig';

interface GuestRateLimitBannerProps {
  variant?: 'warning' | 'limit-reached';
  showInChatbot?: boolean;
}

/**
 * Rate limit banner for guest users
 * Follows ChatGPT/Claude patterns for rate limiting UI
 * Shows remaining prompts and countdown timer when limit is reached
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

  const handleSignUp = () => {
    router.push('/onboarding/registration');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  // Limit reached state (like ChatGPT's rate limit message)
  if (hasReachedLimit) {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.limitReachedBanner]}>
          <View style={styles.iconContainer}>
            <AlertCircle size={20} color="#DC2626" strokeWidth={2} />
          </View>
          <View style={styles.content}>
            <Text style={styles.limitReachedTitle}>
              You've reached the free limit
            </Text>
            <Text style={styles.limitReachedSubtitle}>
              {timeUntilReset ? (
                <>Free prompts reset in <Text style={styles.timeHighlight}>{timeUntilReset}</Text></>
              ) : (
                'Your prompts will reset in 24 hours'
              )}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleSignUp}
                activeOpacity={0.8}
              >
                <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.primaryButtonText}>Get Unlimited Access</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Warning state (prompts running low)
  const isLowPrompts = promptsRemaining <= 3;
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.banner, 
        isLowPrompts ? styles.warningBanner : styles.infoBanner
      ]}>
        <View style={styles.iconContainer}>
          <Clock 
            size={18} 
            color={isLowPrompts ? "#F59E0B" : Colors.primary.blue} 
            strokeWidth={2} 
          />
        </View>
        <View style={styles.content}>
          <Text style={[
            styles.warningText,
            isLowPrompts && styles.warningTextUrgent
          ]}>
            <Text style={styles.promptCount}>{promptsRemaining}</Text> of {GUEST_PROMPT_LIMIT} free messages left
          </Text>
          <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
            <Text style={styles.linkText}>Sign up for unlimited access →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBanner: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  limitReachedBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 16,
  },
  iconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  warningText: {
    fontSize: 13,
    color: Colors.text.body,
    marginBottom: 4,
    ...GlobalStyles.text,
  },
  warningTextUrgent: {
    color: '#92400E',
    fontWeight: '500',
  },
  promptCount: {
    fontWeight: '700',
    color: Colors.primary.blue,
  },
  linkText: {
    fontSize: 13,
    color: Colors.primary.blue,
    fontWeight: '600',
    ...GlobalStyles.textSemiBold,
  },
  limitReachedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
    ...GlobalStyles.textBold,
  },
  limitReachedSubtitle: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 12,
    ...GlobalStyles.text,
  },
  timeHighlight: {
    fontWeight: '700',
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    ...GlobalStyles.textSemiBold,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.blue,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.blue,
    ...GlobalStyles.textSemiBold,
  },
});
