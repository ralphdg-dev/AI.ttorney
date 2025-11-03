import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { NetworkConfig } from '../utils/networkConfig';
import { supabase } from '../config/supabase';

interface ConsultationRequest {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  message: string;
  email: string | null;
  mobile_number: string | null;
  status: "pending" | "accepted" | "rejected" | "completed";
  consultation_date: string | null;
  consultation_time: string | null;
  consultation_mode: "online" | "onsite" | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  client_username: string | null;
}

interface ConsultationStats {
  total_requests: number;
  pending_requests: number;
  accepted_requests: number;
  completed_requests: number;
  rejected_requests: number;
  today_sessions: number;
}

interface ConsultationCache {
  data: ConsultationRequest[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for managing lawyer consultations with FAANG-grade optimizations
 * Features:
 * - Smart caching with TTL
 * - Client-side filtering
 * - Real-time updates with debouncing
 * - Optimistic UI updates
 */
export const useLawyerConsultations = (userId: string | undefined, accessToken: string | undefined) => {
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [stats, setStats] = useState<ConsultationStats>({
    total_requests: 0,
    pending_requests: 0,
    accepted_requests: 0,
    completed_requests: 0,
    rejected_requests: 0,
    today_sessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const cacheRef = useRef<ConsultationCache | null>(null);

  // ⚡ FAANG OPTIMIZATION: Calculate stats client-side (eliminates API call)
  const calculateStats = useCallback((requests: ConsultationRequest[]): ConsultationStats => {
    const today = new Date().toISOString().split("T")[0];

    return {
      total_requests: requests.length,
      pending_requests: requests.filter(r => r.status === "pending").length,
      accepted_requests: requests.filter(r => r.status === "accepted").length,
      completed_requests: requests.filter(r => r.status === "completed").length,
      rejected_requests: requests.filter(r => r.status === "rejected").length,
      today_sessions: requests.filter(r => r.status === "accepted" && r.consultation_date === today).length,
    };
  }, []);

  // ⚡ FAANG OPTIMIZATION: Check cache validity
  const isCacheValid = useCallback(() => {
    if (!cacheRef.current) return false;
    const age = Date.now() - cacheRef.current.timestamp;
    return age < CACHE_TTL;
  }, []);

  // ⚡ FAANG OPTIMIZATION: Fetch with smart caching
  const fetchConsultations = useCallback(async (skipCache = false) => {
    if (!userId) {
      console.log("❌ No user ID, skipping fetch");
      return;
    }

    // Instant render with cached data
    if (!skipCache && isCacheValid() && cacheRef.current) {
      console.log("⚡ Using cached data (instant load)");
      setConsultations(cacheRef.current.data);
      setStats(calculateStats(cacheRef.current.data));
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      // Only show loading on initial load
      if (isInitialLoad) {
        setLoading(true);
      }

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/consult-actions/my-consultations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Cache the data
        cacheRef.current = {
          data,
          timestamp: Date.now()
        };
        
        setConsultations(data);
        setStats(calculateStats(data));
      } else {
        const errorData = await response.text();
        console.error("❌ Failed to fetch:", response.status, errorData);
        Alert.alert("Error", "Failed to load consultation requests");
      }
    } catch (error) {
      console.error("❌ Error fetching consultations:", error);
      Alert.alert("Error", "Failed to load consultations. Please check your connection.");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [userId, accessToken, isInitialLoad, isCacheValid, calculateStats]);

  // ⚡ FAANG OPTIMIZATION: Invalidate cache (for mutations)
  const invalidateCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  // ⚡ FAANG OPTIMIZATION: Optimistic update
  const updateConsultationStatus = useCallback((id: string, status: ConsultationRequest['status']) => {
    setConsultations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status } : c);
      setStats(calculateStats(updated));
      return updated;
    });
  }, [calculateStats]);

  // Initial fetch
  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // ⚡ FAANG OPTIMIZATION: Real-time updates with debouncing
  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel('lawyer_consultation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_requests',
          filter: `lawyer_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('⚡ Consultation change detected:', payload.eventType);
          
          // Debounce rapid changes (300ms)
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            invalidateCache();
            fetchConsultations(true);
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConsultations, invalidateCache]);

  return {
    consultations,
    stats,
    loading,
    isInitialLoad,
    fetchConsultations,
    invalidateCache,
    updateConsultationStatus,
  };
};
