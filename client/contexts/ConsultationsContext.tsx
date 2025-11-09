import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';

interface ConsultationsContextType {
  consultationsCount: number;
  loadConsultations: () => Promise<void>;
}

interface ConsultationsProviderProps {
  children: ReactNode;
}

const ConsultationsContext = createContext<ConsultationsContextType | undefined>(undefined);

export const ConsultationsProvider: React.FC<ConsultationsProviderProps> = ({ children }) => {
  const [consultationsCount, setConsultationsCount] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();

  const loadConsultations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setConsultationsCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("consultation_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching consultations count:", error);
        return;
      }

      setConsultationsCount(count || 0);
    } catch (error) {
      console.error("Error in loadConsultations:", error);
    }
  }, [isAuthenticated, user?.id]);

  // FAANG OPTIMIZATION: Load on mount and when auth state changes
  useEffect(() => {
    loadConsultations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const value: ConsultationsContextType = React.useMemo(() => ({
    consultationsCount,
    loadConsultations,
  }), [consultationsCount, loadConsultations]);

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
