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

  // Fetch moderation status (memoized to prevent unnecessary calls)
  const refreshStatus = useCallback(async () => {
    if (!session?.access_token || !isAuthenticated) {
      setModerationStatus(null);
      isFetchingRef.current = false;
      return;
    }

    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      const status = await getUserModerationStatus(session.access_token);
      setModerationStatus(status || null);
    } catch (error) {
      console.error('Failed to fetch moderation status:', error);
      setModerationStatus(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.access_token, isAuthenticated]);

  // Clear on logout, fetch on login
  useEffect(() => {
    if (!isAuthenticated || !session?.access_token) {
      setModerationStatus(null);
      isFetchingRef.current = false;
      return;
    }
    refreshStatus();
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
