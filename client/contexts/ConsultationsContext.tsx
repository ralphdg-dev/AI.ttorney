import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { AppState, AppStateStatus } from 'react-native';

interface ConsultationsContextType {
  consultationsCount: number;
  loadConsultations: () => Promise<void>;
  incrementCount: () => void;
  decrementCount: () => void;
}

interface ConsultationsProviderProps {
  children: ReactNode;
}

const ConsultationsContext = createContext<ConsultationsContextType | undefined>(undefined);

export const ConsultationsProvider: React.FC<ConsultationsProviderProps> = ({ children }) => {
  const [consultationsCount, setConsultationsCount] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();
  const subscriptionRef = useRef<any>(null);

  const loadConsultations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      console.log("⚠️ ConsultationsContext: No user authenticated, setting count to 0");
      setConsultationsCount(0);
      return;
    }

    try {
      console.log("🔄 ConsultationsContext: Loading consultations for user:", user.id, "role:", user.role);
      
      let query = supabase
        .from("consultation_requests")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      // For lawyers: count pending requests they need to respond to
      if (user.role === 'verified_lawyer') {
        // RLS Note: Lawyers can only see consultations where lawyer_id matches their lawyer_info.id
        // The RLS policy handles the mapping: auth.uid() → lawyer_info.lawyer_id → lawyer_info.id
        query = query.eq("lawyer_id", user.id).eq("status", "pending");
        console.log("📋 ConsultationsContext: Counting pending requests for lawyer");
      } 
      // For users: count all active consultations (pending + accepted)
      else {
        query = query
          .eq("user_id", user.id)
          .in("status", ["pending", "accepted"]);
        console.log("📋 ConsultationsContext: Counting active consultations (pending + accepted) for user");
      }

      console.log("🔍 ConsultationsContext: Executing query...");
      const { count, error } = await query;

      if (error) {
        console.error("❌ ConsultationsContext: Error fetching consultations count:", error);
        console.error("❌ Error details:", {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        
        // RLS errors typically have code "42501" (insufficient privilege)
        if (error.code === '42501') {
          console.error("🔒 RLS Policy Error: User may not have permission to view consultations");
          console.error("🔍 Check: 1) RLS policies are correct, 2) User role is set properly");
        }
        
        // Set to 0 on error (fail gracefully)
        setConsultationsCount(0);
        return;
      }

      console.log("✅ ConsultationsContext: Loaded count:", count);
      console.log("📊 ConsultationsContext: Setting consultationsCount to:", count || 0);
      setConsultationsCount(count || 0);
      
      // Debug: Log the current state after setting
      console.log("🔍 ConsultationsContext: consultationsCount is now:", count || 0);
    } catch (error) {
      console.error("❌ ConsultationsContext: Exception in loadConsultations:", error);
      // Fail gracefully
      setConsultationsCount(0);
    }
  }, [isAuthenticated, user?.id, user?.role]);

  // Optimistic updates (instant feedback)
  const incrementCount = useCallback(() => {
    setConsultationsCount(prev => prev + 1);
  }, []);

  const decrementCount = useCallback(() => {
    setConsultationsCount(prev => Math.max(0, prev - 1));
  }, []);

  // Real-time sync + initial load
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setConsultationsCount(0);
      return;
    }

    loadConsultations();

    // Real-time subscription - listen to ALL changes on consultation_requests table
    // This catches bulk operations, manual cleanup, and individual row changes
    const channel = supabase
      .channel(`consultations-all:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'consultation_requests',
          // No filter - catch ALL table changes including bulk operations
        },
        (payload: any) => {
          console.log('📡 ConsultationsContext: Database change detected (sidebar update)', {
            event: payload.eventType,
            table: payload.table,
            userId: user.id,
            role: user.role
          });
          
          // Only refresh sidebar count on table changes - more efficient
          loadConsultations();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // App state listener - refresh when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 ConsultationsContext: App came to foreground, refreshing counts');
        loadConsultations();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Periodic refresh to prevent stale counts (every 2 minutes - more frequent)
    const periodicRefresh = setInterval(() => {
      console.log("⏰ ConsultationsContext: Periodic refresh to prevent stale counts");
      loadConsultations();
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      appStateSubscription?.remove();
      clearInterval(periodicRefresh);
    };
  }, [isAuthenticated, user?.id, user?.role, loadConsultations]);

  const value: ConsultationsContextType = React.useMemo(() => ({
    consultationsCount,
    loadConsultations,
    incrementCount,
    decrementCount,
  }), [consultationsCount, loadConsultations, incrementCount, decrementCount]);

  return (
    <ConsultationsContext.Provider value={value}>
      {children}
    </ConsultationsContext.Provider>
  );
};

export const useConsultations = (): ConsultationsContextType => {
  const context = useContext(ConsultationsContext);
  if (context === undefined) {
    throw new Error('useConsultations must be used within a ConsultationsProvider');
  }
  return context;
};
