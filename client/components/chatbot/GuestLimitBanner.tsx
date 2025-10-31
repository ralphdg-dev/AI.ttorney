import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, X, LogIn, UserPlus } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { LAYOUT } from '../../constants/LayoutConstants';

interface GuestLimitBannerProps {
  promptsRemaining: number;
  hasReachedLimit: boolean;
  onDismiss?: () => void;
}

/**
 * Banner component to display guest prompt limit status
 * Shows remaining prompts and encourages registration when limit is reached
 * Follows Material Design 3 guidelines for informational banners
 */
export const GuestLimitBanner: React.FC<GuestLimitBannerProps> = ({
  promptsRemaining,
  hasReachedLimit,
  onDismiss,
}) => {
  const router = useRouter();

  // Don't show banner if user has plenty of prompts remaining
  if (!hasReachedLimit && promptsRemaining > 5) {
    return null;
  }

  const handleLogin = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/onboarding/registration');
  };

  // Limit reached - show registration CTA
  if (hasReachedLimit) {
    return (
      <View style={styles.container}>
        <View style={styles.limitReachedBanner}>
          <View style={styles.iconContainer}>
            <AlertCircle size={20} color={Colors.primary.blue} strokeWidth={2.5} />
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title}>Guest Limit Reached</Text>
            <Text style={styles.message}>
              You&apos;ve used all 15 free prompts. Sign up to continue chatting with unlimited access!
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSignUp}
                activeOpacity={0.8}
              >
                <UserPlus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.primaryButtonText}>Sign Up Free</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <LogIn size={16} color={Colors.primary.blue} strokeWidth={2.5} />
                <Text style={styles.secondaryButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Warning - low prompts remaining
  return (
    <View style={styles.container}>
      <View style={styles.warningBanner}>
        <View style={styles.iconContainer}>
          <AlertCircle size={18} color="#F59E0B" strokeWidth={2.5} />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.warningTitle}>
            {promptsRemaining} {promptsRemaining === 1 ? 'prompt' : 'prompts'} remaining
          </Text>
          <Text style={styles.warningMessage}>
            Sign up for unlimited access to AI legal assistance
          </Text>
        </View>
        
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SPACING.md,
    paddingVertical: LAYOUT.SPACING.sm,
  },
  limitReachedBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: LAYOUT.RADIUS.lg,
    padding: LAYOUT.SPACING.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: LAYOUT.RADIUS.md,
    padding: LAYOUT.SPACING.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  iconContainer: {
    marginRight: LAYOUT.SPACING.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.head,
    marginBottom: LAYOUT.SPACING.xs,
  },
  message: {
    fontSize: 14,
    color: Colors.text.sub,
    lineHeight: 20,
    marginBottom: LAYOUT.SPACING.md,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  warningMessage: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.sm,
    paddingHorizontal: LAYOUT.SPACING.md,
    borderRadius: LAYOUT.RADIUS.md,
    gap: LAYOUT.SPACING.xs,
    minHeight: LAYOUT.MIN_TOUCH_TARGET,
  },
  primaryButton: {
    backgroundColor: Colors.primary.blue,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary.blue,
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: Colors.primary.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: LAYOUT.SPACING.xs,
    marginLeft: LAYOUT.SPACING.xs,
  },
});
