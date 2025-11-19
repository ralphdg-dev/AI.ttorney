/**
 * Moderation Warning Banner
 * 
 * Displays strike warnings and suspension status to users
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Ban, AlertCircle } from 'lucide-react-native';

interface ModerationWarningBannerProps {
  strikeCount: number;
  suspensionCount: number;
  accountStatus: 'active' | 'suspended' | 'banned';
  suspensionEnd?: string | null;
}

export const ModerationWarningBanner: React.FC<ModerationWarningBannerProps> = ({
  strikeCount,
  suspensionCount,
  accountStatus,
  suspensionEnd,
}) => {
  // Don't show banner if no warnings
  if (strikeCount === 0 && accountStatus === 'active') {
    return null;
  }

  // Banned status
  if (accountStatus === 'banned') {
    return (
      <View style={[styles.banner, styles.bannerBanned]}>
        <View style={styles.textContainer}>
          <Text style={styles.titleBanned}>Account Permanently Closed</Text>
          <Text style={styles.descriptionBanned}>
            Account closed due to repeated violations. Posting and replies disabled.
          </Text>
        </View>
      </View>
    );
  }

  // Suspended status
  if (accountStatus === 'suspended') {
    const suspensionEndDate = suspensionEnd ? formatDate(suspensionEnd) : 'unknown';
    return (
      <View style={[styles.banner, styles.bannerSuspended]}>
        <View style={styles.textContainer}>
          <Text style={styles.titleSuspended}>Account Temporarily Suspended</Text>
          <Text style={styles.descriptionSuspended}>
            Suspended until {suspensionEndDate}. Posting and replies disabled.
          </Text>
          {suspensionCount > 0 && (
            <Text style={styles.suspensionWarning}>
              {suspensionCount === 1 && '2 more suspensions will result in permanent ban'}
              {suspensionCount === 2 && '1 more suspension will result in permanent ban'}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Strike warnings (active account)
  const remainingStrikes = 3 - strikeCount;
  
  return (
    <View style={[styles.banner, styles.bannerWarning]}>
      <View style={styles.textContainer}>
        <Text style={styles.titleWarning}>
          {strikeCount === 1 && 'Community Guidelines Notice'}
          {strikeCount === 2 && 'Community Guidelines Warning'}
          {strikeCount >= 3 && 'Account Review Required'}
        </Text>
        <Text style={styles.descriptionWarning}>
          {suspensionCount === 0 && strikeCount === 1 && `${strikeCount} violation. ${remainingStrikes} more will result in suspension.`}
          {suspensionCount === 0 && strikeCount === 2 && `${strikeCount} violations. 1 more will result in suspension.`}
          {suspensionCount === 0 && strikeCount >= 3 && 'Multiple violations detected. Account under review for suspension.'}
          {suspensionCount === 1 && `${strikeCount} violation${strikeCount > 1 ? 's' : ''}, ${suspensionCount} prior suspension. Next violation will trigger suspension. 2 more suspensions will result in permanent ban.`}
          {suspensionCount === 2 && `${strikeCount} violation${strikeCount > 1 ? 's' : ''}, ${suspensionCount} prior suspensions. Next violation will trigger suspension. 1 more suspension will result in permanent ban.`}
        </Text>
      </View>
    </View>
  );
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    padding: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 6,
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerWarning: {
    backgroundColor: '#FFFBEB', // amber-50
    borderWidth: 1,
    borderColor: '#FDE68A', // amber-200
  },
  bannerSuspended: {
    backgroundColor: '#FEF2F2', // red-50
    borderWidth: 1,
    borderColor: '#FECACA', // red-200
  },
  bannerBanned: {
    backgroundColor: '#FEF2F2', // red-50
    borderWidth: 1,
    borderColor: '#FECACA', // red-200
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  titleWarning: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E', // amber-800
    letterSpacing: 0.2,
  },
  titleSuspended: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B', // red-800
    letterSpacing: 0.2,
  },
  titleBanned: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F1D1D', // red-900
    letterSpacing: 0.2,
  },
  descriptionWarning: {
    fontSize: 11,
    color: '#78350F', // amber-900
    lineHeight: 16,
  },
  descriptionSuspended: {
    fontSize: 11,
    color: '#7F1D1B', // red-900
    lineHeight: 16,
  },
  descriptionBanned: {
    fontSize: 11,
    color: '#7F1D1D', // red-900
    lineHeight: 16,
  },
  suspensionWarning: {
    fontSize: 10,
    color: '#991B1B', // red-800
    fontWeight: '500',
    marginTop: 3,
  },
  suspensionInfo: {
    fontSize: 10,
    color: '#92400E', // amber-800
    fontWeight: '500',
    marginTop: 3,
  },
});
