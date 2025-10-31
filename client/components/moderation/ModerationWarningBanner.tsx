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
        <Ban size={20} color="#DC2626" />
        <View style={styles.textContainer}>
          <Text style={styles.titleBanned}>Account Permanently Banned</Text>
          <Text style={styles.descriptionBanned}>
            Your account has been permanently banned after 3 suspensions. You cannot post or reply.
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
        <AlertCircle size={20} color="#DC2626" />
        <View style={styles.textContainer}>
          <Text style={styles.titleSuspended}>Account Suspended</Text>
          <Text style={styles.descriptionSuspended}>
            Your account is suspended until {suspensionEndDate}. You cannot post or reply during this time.
          </Text>
          {suspensionCount > 0 && (
            <Text style={styles.suspensionWarning}>
              {suspensionCount === 1 && '⚠️ 2 more suspensions will result in permanent ban'}
              {suspensionCount === 2 && '⚠️ 1 more suspension will result in permanent ban'}
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
      <AlertTriangle size={20} color="#D97706" />
      <View style={styles.textContainer}>
        <Text style={styles.titleWarning}>
          {strikeCount === 1 && '1 Strike - Warning'}
          {strikeCount === 2 && '2 Strikes - Final Warning'}
          {strikeCount >= 3 && '3 Strikes - Suspension Pending'}
        </Text>
        <Text style={styles.descriptionWarning}>
          {strikeCount === 1 && `You have 1 strike. ${remainingStrikes} more violations will result in a 7-day suspension.`}
          {strikeCount === 2 && `You have 2 strikes. 1 more violation will result in a 7-day suspension.`}
          {strikeCount >= 3 && 'You have reached 3 strikes. Your account may be suspended.'}
        </Text>
        
        {/* Show suspension count if any */}
        {suspensionCount > 0 && (
          <Text style={styles.suspensionInfo}>
            {suspensionCount === 1 && '2 more suspensions will result in permanent ban'}
            {suspensionCount === 2 && '1 more suspension will result in permanent ban'}
          </Text>
        )}
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
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  bannerWarning: {
    backgroundColor: '#FEF3C7', // amber-100
    borderLeftWidth: 4,
    borderLeftColor: '#D97706', // amber-600
  },
  bannerSuspended: {
    backgroundColor: '#FEE2E2', // red-100
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626', // red-600
  },
  bannerBanned: {
    backgroundColor: '#FEE2E2', // red-100
    borderLeftWidth: 4,
    borderLeftColor: '#991B1B', // red-800
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  titleWarning: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E', // amber-800
  },
  titleSuspended: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B', // red-800
  },
  titleBanned: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F1D1D', // red-900
  },
  descriptionWarning: {
    fontSize: 13,
    color: '#78350F', // amber-900
    lineHeight: 18,
  },
  descriptionSuspended: {
    fontSize: 13,
    color: '#7F1D1B', // red-900
    lineHeight: 18,
  },
  descriptionBanned: {
    fontSize: 13,
    color: '#7F1D1D', // red-900
    lineHeight: 18,
  },
  suspensionWarning: {
    fontSize: 12,
    color: '#991B1B', // red-800
    fontWeight: '500',
    marginTop: 4,
  },
  suspensionInfo: {
    fontSize: 12,
    color: '#92400E', // amber-800
    fontWeight: '500',
    marginTop: 6,
  },
});
