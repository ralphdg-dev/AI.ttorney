// Moderation status management

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getUserModerationStatus, type ModerationStatus } from '@/services/moderationService';
import { useAuth } from './AuthContext';

interface ModerationContextType {
  moderationStatus: ModerationStatus | null;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
  isBlocked: boolean;
}

const ModerationContext = createContext<ModerationContextType | undefined>(undefined);

export const ModerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isAuthenticated } = useAuth();
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (!session?.access_token || !isAuthenticated || isFetchingRef.current) {
      if (!session?.access_token || !isAuthenticated) setModerationStatus(null);
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      const status = await getUserModerationStatus(session.access_token);
      if (status) setModerationStatus(status);
    } catch (error) {
      console.error('Failed to fetch moderation status:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.access_token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && session?.access_token) {
      refreshStatus();
    } else {
      setModerationStatus(null);
    }
  }, [isAuthenticated, session?.access_token, refreshStatus]);

  const isBlocked = moderationStatus?.account_status === 'suspended' || 
                    moderationStatus?.account_status === 'banned';

  return (
    <ModerationContext.Provider value={{ moderationStatus, isLoading, refreshStatus, isBlocked }}>
      {children}
    </ModerationContext.Provider>
  );
};

export const useModerationStatus = (): ModerationContextType => {
  const context = useContext(ModerationContext);
  if (!context) throw new Error('useModerationStatus must be used within ModerationProvider');
  return context;
};
