import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Header';

interface RoleBasedHeaderProps {
  variant?: string;
  title?: string;
  showNotifications?: boolean;
  showSettings?: boolean;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
}

const RoleBasedHeader: React.FC<RoleBasedHeaderProps> = ({
  variant,
  title,
  showNotifications,
  showSettings,
  onNotificationPress,
  onSettingsPress,
}) => {
  const { user, isLawyer } = useAuth();

  if (!user) {
    return (
      <Header 
        variant="default"
        title={title}
        showNotifications={showNotifications}
        showSettings={showSettings}
        onNotificationPress={onNotificationPress}
        onSettingsPress={onSettingsPress}
      />
    );
  }

  // Determine header variant based on user role and current variant
  let headerVariant: 'default' | 'home' | 'minimal' | 'lawyer-home' | 'lawyer-cases' | 'lawyer-consult' | 'lawyer-clients' | 'lawyer-profile' = variant as any;
  if (!headerVariant) {
    if (isLawyer()) {
      headerVariant = 'lawyer-home';
    } else {
      headerVariant = 'home';
    }
  }

  return (
    <Header 
      variant={headerVariant}
      title={title}
      showNotifications={showNotifications}
      showSettings={showSettings}
      onNotificationPress={onNotificationPress}
      onSettingsPress={onSettingsPress}
    />
  );
};

export default RoleBasedHeader;
