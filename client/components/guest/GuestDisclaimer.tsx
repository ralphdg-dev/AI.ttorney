import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, UserPlus } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { LAYOUT } from '../../constants/LayoutConstants';
import { GUEST_DISCLAIMER } from '../../config/guestConfig';

interface GuestDisclaimerProps {
  variant?: 'banner' | 'modal' | 'inline';
  showCTA?: boolean;
  onDismiss?: () => void;
}

/**
 * Guest Disclaimer Component
 * Shows information about guest mode limitations
 * Follows DRY principle - uses centralized disclaimer text
 */
export const GuestDisclaimer: React.FC<GuestDisclaimerProps> = ({
  variant = 'banner',
  showCTA = true,
  onDismiss,
}) => {
  const router = useRouter();

  const handleSignUp = () => {
    router.push('/onboarding/registration');
  };

  if (variant === 'banner') {
    return (
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <Info size={16} color={Colors.primary.blue} strokeWidth={2} />
          <Text style={styles.bannerText}>{GUEST_DISCLAIMER.SHORT}</Text>
        </View>
        {showCTA && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSignUp}
            activeOpacity={0.7}
          >
            <UserPlus size={14} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.ctaText}>Sign Up</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === 'modal') {
    return (
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Info size={24} color={Colors.primary.blue} strokeWidth={2} />
          <Text style={styles.modalTitle}>Guest Mode</Text>
        </View>
        <Text style={styles.modalText}>{GUEST_DISCLAIMER.FULL}</Text>
        {showCTA && (
          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleSignUp}
            activeOpacity={0.7}
          >
            <UserPlus size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.modalButtonText}>{GUEST_DISCLAIMER.CTA}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Inline variant
  return (
    <View style={styles.inline}>
      <Info size={14} color={Colors.text.secondary} strokeWidth={2} />
      <Text style={styles.inlineText}>{GUEST_DISCLAIMER.SHORT}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Banner variant (top of screen)
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: LAYOUT.SPACING.md,
    paddingVertical: LAYOUT.SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: LAYOUT.SPACING.sm,
  },
  bannerText: {
    fontSize: 13,
    color: Colors.text.primary,
    marginLeft: LAYOUT.SPACING.xs,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: LAYOUT.SPACING.sm,
    paddingVertical: LAYOUT.SPACING.xs,
    borderRadius: LAYOUT.RADIUS.sm,
  },
  ctaText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: LAYOUT.SPACING.xxs,
  },

  // Modal variant (full modal content)
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: LAYOUT.RADIUS.lg,
    padding: LAYOUT.SPACING.lg,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: LAYOUT.SPACING.sm,
  },
  modalText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: LAYOUT.SPACING.lg,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: LAYOUT.SPACING.lg,
    paddingVertical: LAYOUT.SPACING.md,
    borderRadius: LAYOUT.RADIUS.md,
    minHeight: LAYOUT.MIN_TOUCH_TARGET,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: LAYOUT.SPACING.xs,
  },

  // Inline variant (small, subtle)
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.xs,
  },
  inlineText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: LAYOUT.SPACING.xs,
  },
});
