/**
 * Moderation Status Context
 * 
 * Centralized state management for user moderation status (strikes, suspensions, bans)
 * Follows DRY principle - single source of truth for moderation data
 * 
 * Features:
 * - Real-time status tracking
 * - Automatic refresh after violations
 * - Shared state across forum & chatbot
 * - Optimized API calls (fetch once, use everywhere)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getUserModerationStatus, type ModerationStatus } from '@/services/moderationService';
import { useAuth } from './AuthContext';

interface ModerationContextType {
  moderationStatus: ModerationStatus | null;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
  isBlocked: boolean; // Convenience flag for suspended/banned
}

const ModerationContext = createContext<ModerationContextType | undefined>(undefined);

export const ModerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isAuthenticated } = useAuth();
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingRef = useRef(false); // Prevent duplicate fetches

  /**
   * Fetch moderation status from API
   */
  const refreshStatus = useCallback(async () => {
    if (!session?.access_token || !isAuthenticated) {
      setModerationStatus(null);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      console.log('[ModerationContext] Fetch already in progress, skipping...');
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      console.log('[ModerationContext] Fetching moderation status...');
      
      const status = await getUserModerationStatus(session.access_token);
      
      if (status) {
        setModerationStatus(status);
        console.log('[ModerationContext] Status updated:', {
          strikes: status.strike_count,
          suspensions: status.suspension_count,
          status: status.account_status,
        });
      }
    } catch (error) {
      console.error('[ModerationContext] Failed to fetch status:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.access_token, isAuthenticated]);

  /**
   * Fetch status on mount and when session changes
   */
  useEffect(() => {
    if (isAuthenticated && session?.access_token) {
      refreshStatus();
    } else {
      setModerationStatus(null);
    }
  }, [isAuthenticated, session?.access_token, refreshStatus]);

  /**
   * Convenience flag for blocked status
   */
  const isBlocked = moderationStatus?.account_status === 'suspended' || 
                    moderationStatus?.account_status === 'banned';

  const value: ModerationContextType = {
    moderationStatus,
    isLoading,
    refreshStatus,
    isBlocked,
  };

  return (
    <ModerationContext.Provider value={value}>
      {children}
    </ModerationContext.Provider>
  );
};

/**
 * Hook to access moderation context
 */
export const useModerationStatus = (): ModerationContextType => {
  const context = useContext(ModerationContext);
  if (!context) {
    throw new Error('useModerationStatus must be used within ModerationProvider');
  }
  return context;
};
