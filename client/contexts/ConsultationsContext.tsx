import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';

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
        query = query.eq("lawyer_id", user.id).eq("status", "pending");
        console.log("📋 ConsultationsContext: Counting pending requests for lawyer");
      } 
      // For users: count upcoming/accepted consultations they need to attend
      else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString();
        console.log("📅 ConsultationsContext: Today's date (ISO):", todayString);
        query = query.eq("user_id", user.id).eq("status", "accepted").gte("consultation_date", todayString);
        console.log("📋 ConsultationsContext: Counting upcoming consultations for user");
      }

      console.log("🔍 ConsultationsContext: Executing query...");
      const { count, error } = await query;

      if (error) {
        console.error("❌ ConsultationsContext: Error fetching consultations count:", error);
        return;
      }

      console.log("✅ ConsultationsContext: Loaded count:", count);
      console.log("📊 ConsultationsContext: Setting consultationsCount to:", count || 0);
      setConsultationsCount(count || 0);
    } catch (error) {
      console.error("❌ ConsultationsContext: Exception in loadConsultations:", error);
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

    // Real-time subscription
    const channel = supabase
      .channel(`consultations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_requests',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh count on any change
          loadConsultations();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [isAuthenticated, user?.id, loadConsultations]);

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
