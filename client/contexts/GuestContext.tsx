import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GUEST_PROMPT_LIMIT,
  GUEST_SESSION_EXPIRY_MS,
  GUEST_SESSION_STORAGE_KEY,
  generateGuestSessionId,
  isSessionExpired,
  validateGuestSession,
  calculateRemainingPrompts,
  isPromptLimitReached,
  getTimeUntilReset,
  type GuestSession,
} from '../config/guestConfig';

export interface GuestContextType {
  isGuestMode: boolean;
  guestSession: GuestSession | null;
  promptCount: number;
  promptsRemaining: number;
  hasReachedLimit: boolean;
  resetTime: number | null;
  timeUntilReset: string | null;
  startGuestSession: () => Promise<void>;
  updateGuestSessionId: (sessionId: string) => Promise<void>;
  incrementPromptCount: () => Promise<boolean>; // Returns false if limit reached
  clearGuestSession: () => Promise<void>;
  isLoading: boolean;
  isStartingSession: boolean; // Production: track session start progress
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false); // Prevent race conditions
  const [, forceUpdate] = useState(0); // Force re-render trigger
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Define clearGuestSession first (no dependencies)
  const clearGuestSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      setGuestSession(null);
      console.log('🗑️ Guest session cleared');
    } catch (error) {
      console.error('❌ Error clearing guest session:', error);
    }
  }, []);

  // Define startGuestSession (no dependencies)
  const startGuestSession = useCallback(async () => {
    // Prevent race conditions - don't allow multiple simultaneous session starts
    if (isStartingSession) {
      console.log('⏸️ Session start already in progress, skipping');
      return;
    }

    try {
      setIsStartingSession(true);
      
      // First check if we already have a valid session
      const existingSessionData = await AsyncStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      if (existingSessionData) {
        try {
          const existingSession: GuestSession = JSON.parse(existingSessionData);
          if (!validateGuestSession(existingSession)) {
            console.warn('⚠️ Invalid existing session, creating new one');
          } else if (isSessionExpired(existingSession.expiresAt)) {
            console.log('⏰ Existing session expired, creating new one');
          } else {
            console.log('📋 Reusing existing valid guest session:', existingSession.id);
            setGuestSession(existingSession);
            console.log('🧭 GuestContext: Guest session reused, letting index.tsx handle routing');
            return;
          }
        } catch (parseError) {
          console.error('❌ Corrupted session data, clearing and creating new session:', parseError);
          await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        }
      }
      
      // Create new session only if needed
      const now = Date.now();
      const newSession: GuestSession = {
        id: generateGuestSessionId(),
        promptCount: 0,
        createdAt: now,
        expiresAt: now + GUEST_SESSION_EXPIRY_MS,
      };

      await AsyncStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setGuestSession(newSession);
      
      console.log('✅ [PROD] Guest session lifecycle: started', {
        sessionId: newSession.id,
        expiresAt: new Date(newSession.expiresAt).toISOString(),
        promptLimit: GUEST_PROMPT_LIMIT,
        timestamp: new Date().toISOString(),
        action: 'session_created'
      });
      
      // Let index.tsx handle the routing to guest-onboarding
      console.log('🧭 GuestContext: Guest session created, letting index.tsx handle routing');
    } catch (error) {
      console.error('❌ [PROD] Guest session start failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        action: 'startGuestSession'
      });
      // In production, consider showing user-friendly error message
      // For now, just log - user can try again
    } finally {
      setIsStartingSession(false);
    }
  }, [isStartingSession]);

  // Update guest session with new ID from server (for session refresh)
  const updateGuestSessionId = useCallback(async (sessionId: string) => {
    if (!guestSession) {
      console.warn('⚠️ No existing guest session to update');
      await startGuestSession();
      return;
    }
    
    const updatedSession: GuestSession = {
      ...guestSession,
      id: sessionId,
      // Keep existing prompt count and expiry
    };
    
    setGuestSession(updatedSession);
    await AsyncStorage.setItem('guestSession', JSON.stringify(updatedSession));
    console.log('🔄 Guest session updated with new ID:', sessionId);
  }, [guestSession, startGuestSession]);

  // Initialize without auto-loading guest sessions
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Define incrementPromptCount (depends on guestSession and startGuestSession)
  const incrementPromptCount = useCallback(async (): Promise<boolean> => {
    if (!guestSession) {
      console.warn('⚠️ No guest session found, creating new one...');
      await startGuestSession();
      return true;
    }

    // Validate session before incrementing (security check)
    if (!validateGuestSession(guestSession)) {
      console.error('❌ Invalid guest session, cannot increment');
      await clearGuestSession();
      return false;
    }

    // Check if session expired
    if (isSessionExpired(guestSession.expiresAt)) {
      console.log('⏰ Guest session expired during use');
      await clearGuestSession();
      return false;
    }

    // Check if limit reached
    if (isPromptLimitReached(guestSession.promptCount)) {
      console.log('🚫 Guest prompt limit reached');
      return false;
    }

    try {
      const updatedSession: GuestSession = {
        ...guestSession,
        promptCount: guestSession.promptCount + 1,
      };

      await AsyncStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
      setGuestSession(updatedSession); // This triggers re-render
      forceUpdate(prev => prev + 1); // Force banner to re-render

      const newCount = updatedSession.promptCount;
      console.log(`📊 Guest prompt count updated: ${newCount}/${GUEST_PROMPT_LIMIT}`);
      console.log(`📊 Prompts remaining: ${GUEST_PROMPT_LIMIT - newCount}`);

      return true;
    } catch (error) {
      console.error('❌ [PROD] Failed to increment guest prompt count:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: guestSession.id,
        currentCount: guestSession.promptCount,
        timestamp: new Date().toISOString(),
        action: 'incrementPromptCount'
      });
      // Return false to indicate failure - conversation should handle this gracefully
      return false;
    }
  }, [guestSession, startGuestSession, clearGuestSession]);

  // FAANG Best Practice: Memoize context value to prevent unnecessary re-renders
  const value: GuestContextType = React.useMemo(() => ({
    isGuestMode: !!guestSession,
    guestSession,
    promptCount: guestSession?.promptCount || 0,
    promptsRemaining: guestSession ? calculateRemainingPrompts(guestSession.promptCount) : GUEST_PROMPT_LIMIT,
    hasReachedLimit: guestSession ? isPromptLimitReached(guestSession.promptCount) : false,
    resetTime: guestSession?.expiresAt || null,
    timeUntilReset: guestSession ? getTimeUntilReset(guestSession.expiresAt) : null,
    startGuestSession,
    updateGuestSessionId,
    incrementPromptCount,
    clearGuestSession,
    isLoading,
    isStartingSession, // Production: expose loading state to UI
    showTutorial,
    setShowTutorial,
    showOnboarding,
    setShowOnboarding,
  }), [guestSession, startGuestSession, updateGuestSessionId, incrementPromptCount, clearGuestSession, isLoading, isStartingSession, showTutorial, setShowTutorial, showOnboarding, setShowOnboarding]);

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};

export const useGuest = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};
