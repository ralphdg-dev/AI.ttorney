import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Header';

interface RoleBasedHeaderProps {
  variant?: string;
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
}

const RoleBasedHeader: React.FC<RoleBasedHeaderProps> = ({
  variant,
  title,
  showSearch,
  showNotifications,
  showSettings,
  onSearchPress,
  onNotificationPress,
  onSettingsPress,
}) => {
  const { user, isLawyer } = useAuth();

  if (!user) {
    return (
      <Header 
        variant="default"
        title={title}
        showSearch={showSearch}
        showNotifications={showNotifications}
        showSettings={showSettings}
        onSearchPress={onSearchPress}
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
      showSearch={showSearch}
      showNotifications={showNotifications}
      showSettings={showSettings}
      onSearchPress={onSearchPress}
      onNotificationPress={onNotificationPress}
      onSettingsPress={onSettingsPress}
    />
  );
};

export default RoleBasedHeader;
