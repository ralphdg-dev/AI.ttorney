import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  type GuestSession,
} from '../config/guestConfig';

export interface GuestContextType {
  isGuestMode: boolean;
  guestSession: GuestSession | null;
  promptCount: number;
  promptsRemaining: number;
  hasReachedLimit: boolean;
  startGuestSession: () => Promise<void>;
  incrementPromptCount: () => Promise<boolean>; // Returns false if limit reached
  clearGuestSession: () => Promise<void>;
  isLoading: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState(0); // Force re-render trigger

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
    try {
      const now = Date.now();
      const newSession: GuestSession = {
        id: generateGuestSessionId(),
        promptCount: 0,
        createdAt: now,
        expiresAt: now + GUEST_SESSION_EXPIRY_MS,
      };

      await AsyncStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setGuestSession(newSession);
      
      console.log('✅ Guest session started:', newSession.id);
      console.log('   Expires:', new Date(newSession.expiresAt).toLocaleString());
    } catch (error) {
      console.error('❌ Error starting guest session:', error);
    }
  }, []);

  // Define loadGuestSession (depends on clearGuestSession)
  const loadGuestSession = useCallback(async () => {
    try {
      const sessionData = await AsyncStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      if (sessionData) {
        const session: GuestSession = JSON.parse(sessionData);
        
        // Validate session integrity (security check)
        if (!validateGuestSession(session)) {
          console.warn('⚠️ Invalid guest session detected, clearing...');
          await clearGuestSession();
          return;
        }
        
        // Check if session is expired
        if (!isSessionExpired(session.expiresAt)) {
          setGuestSession(session);
          console.log('📋 Guest session loaded:', {
            id: session.id,
            promptCount: session.promptCount,
            remaining: calculateRemainingPrompts(session.promptCount),
            expires: new Date(session.expiresAt).toLocaleString()
          });
        } else {
          // Session expired, clear it
          console.log('⏰ Guest session expired, clearing...');
          await clearGuestSession();
        }
      }
    } catch (error) {
      console.error('❌ Error loading guest session:', error);
      // Clear potentially corrupted session
      await clearGuestSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearGuestSession]);

  // Load guest session from storage on mount and when app initializes
  // Also reload if guest session changes in storage
  useEffect(() => {
    loadGuestSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error('❌ Error incrementing prompt count:', error);
      return false;
    }
  }, [guestSession, startGuestSession, clearGuestSession]);

  // FAANG Best Practice: Memoize context value to prevent unnecessary re-renders
  const value: GuestContextType = React.useMemo(() => ({
    isGuestMode: !!guestSession && !isSessionExpired(guestSession?.expiresAt || 0),
    guestSession,
    promptCount: guestSession?.promptCount || 0,
    promptsRemaining: calculateRemainingPrompts(guestSession?.promptCount || 0),
    hasReachedLimit: isPromptLimitReached(guestSession?.promptCount || 0),
    startGuestSession,
    incrementPromptCount,
    clearGuestSession,
    isLoading,
  }), [guestSession, isLoading, startGuestSession, incrementPromptCount, clearGuestSession]);

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};

export const useGuest = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};
