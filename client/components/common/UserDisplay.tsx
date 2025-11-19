import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { VerifiedLawyerBadge } from './VerifiedLawyerBadge';

interface UserDisplayProps {
  user?: {
    name?: string;
    username?: string;
    avatar?: string;
    isLawyer?: boolean;
    account_status?: string;
  };
  showAvatar?: boolean;
  showVerifiedBadge?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const UserDisplay: React.FC<UserDisplayProps> = ({
  user,
  showAvatar = true,
  showVerifiedBadge = true,
  onPress,
  size = 'medium',
  style,
}) => {
  const isDeactivated = user?.account_status === 'deactivated';
  const displayName = isDeactivated ? 'Deactivated Account' : (user?.name || user?.username || 'Anonymous');
  const avatarSource = isDeactivated ? null : (user?.avatar ? { uri: user.avatar } : null);

  // Size configurations
  const sizeConfig = {
    small: { avatar: 24, text: 12, container: { paddingVertical: 4, paddingHorizontal: 8 } },
    medium: { avatar: 32, text: 14, container: { paddingVertical: 6, paddingHorizontal: 12 } },
    large: { avatar: 40, text: 16, container: { paddingVertical: 8, paddingHorizontal: 16 } },
  };

  const config = sizeConfig[size];

  const UserContent = () => (
    <View style={[styles.container, config.container, style]}>
      {showAvatar && (
        <View style={[styles.avatarContainer, { width: config.avatar, height: config.avatar }]}>
          {isDeactivated ? (
            <View style={[styles.deactivatedAvatar, { width: config.avatar, height: config.avatar }]}>
              <User size={config.avatar * 0.6} color="#9CA3AF" />
            </View>
          ) : avatarSource ? (
            <Image source={avatarSource} style={[styles.avatar, { width: config.avatar, height: config.avatar }]} />
          ) : (
            <View style={[styles.defaultAvatar, { width: config.avatar, height: config.avatar }]}>
              <User size={config.avatar * 0.6} color="#6B7280" />
            </View>
          )}
        </View>
      )}
      
      <View style={styles.textContainer}>
        <Text style={[
          styles.name,
          { fontSize: config.text },
          isDeactivated && styles.deactivatedText
        ]}>
          {displayName}
        </Text>
        
        {showVerifiedBadge && user?.isLawyer && !isDeactivated && (
          <VerifiedLawyerBadge size="sm" />
        )}
        
        {isDeactivated && (
          <Text style={[styles.deactivatedLabel, { fontSize: config.text - 2 }]}>
            Account deactivated
          </Text>
        )}
      </View>
    </View>
  );

  // Disable press for deactivated users
  if (onPress && !isDeactivated) {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDeactivated}>
        <UserContent />
      </TouchableOpacity>
    );
  }

  return <UserContent />;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    borderRadius: 20,
  },
  defaultAvatar: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deactivatedAvatar: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    color: '#111827',
  },
  deactivatedText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  deactivatedLabel: {
    color: '#6B7280',
    marginTop: 2,
  },
});

export default UserDisplay;
