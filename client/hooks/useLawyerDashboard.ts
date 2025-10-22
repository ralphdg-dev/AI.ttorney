import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { fetchLawyerDashboardData, DashboardStats, ConsultationRequest } from '../services/lawyerDashboardService';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// In-memory cache (persists across component re-renders but not app restarts)
let dashboardCache: {
  data: {
    stats: DashboardStats;
    recentConsultations: ConsultationRequest[];
    acceptedConsultations: ConsultationRequest[];
  } | null;
  timestamp: number | null;
  token: string | null;
} = {
  data: null,
  timestamp: null,
  token: null
};

/**
 * Custom hook for lawyer dashboard data management with caching
 * 
 * Caching Strategy:
 * - Caches data for 5 minutes to prevent unnecessary API calls
 * - Cache is invalidated when access token changes (different user)
 * - Cache persists across component re-renders but not app restarts
 * - First load shows loading state, subsequent loads use cached data instantly
 * 
 * Follows industry standard: Separation of concerns - data fetching logic separated from UI
 */
export const useLawyerDashboard = (accessToken: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total_requests: 0,
    pending_requests: 0,
    accepted_requests: 0,
    completed_requests: 0,
    rejected_requests: 0,
    today_sessions: 0,
  });
  const [recentConsultations, setRecentConsultations] = useState<ConsultationRequest[]>([]);
  const [acceptedConsultations, setAcceptedConsultations] = useState<ConsultationRequest[]>([]);
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      // Check if we have valid cached data
      const now = Date.now();
      const isCacheValid = 
        dashboardCache.data !== null &&
        dashboardCache.timestamp !== null &&
        dashboardCache.token === accessToken &&
        (now - dashboardCache.timestamp) < CACHE_DURATION;

      if (isCacheValid && dashboardCache.data) {
        // Use cached data - instant load, no loading state
        console.log('📦 Using cached dashboard data');
        setStats(dashboardCache.data.stats);
        setRecentConsultations(dashboardCache.data.recentConsultations);
        setAcceptedConsultations(dashboardCache.data.acceptedConsultations);
        setLoading(false);
        setError(null);
        return;
      }

      // Cache miss or expired - fetch fresh data
      try {
        // Only show loading state on initial mount or if cache is empty
        if (isInitialMount.current || !dashboardCache.data) {
          setLoading(true);
        }
        setError(null);
        
        console.log('🔄 Fetching fresh dashboard data...');
        const dashboardData = await fetchLawyerDashboardData(accessToken);
        
        // Update state
        setStats(dashboardData.stats);
        setRecentConsultations(dashboardData.recentConsultations);
        setAcceptedConsultations(dashboardData.acceptedConsultations);
        
        // Update cache
        dashboardCache = {
          data: {
            stats: dashboardData.stats,
            recentConsultations: dashboardData.recentConsultations,
            acceptedConsultations: dashboardData.acceptedConsultations
          },
          timestamp: Date.now(),
          token: accessToken
        };
        
        console.log('✅ Dashboard data cached successfully');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load dashboard data');
        setError(error);
        if (__DEV__) {
          console.error('Error loading dashboard data:', error);
        }
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
        isInitialMount.current = false;
      }
    };

    loadDashboardData();
  }, [accessToken]);

  // Manual refresh function to force cache invalidation
  const refresh = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Manual refresh: Fetching fresh dashboard data...');
      const dashboardData = await fetchLawyerDashboardData(accessToken);
      
      // Update state
      setStats(dashboardData.stats);
      setRecentConsultations(dashboardData.recentConsultations);
      setAcceptedConsultations(dashboardData.acceptedConsultations);
      
      // Update cache
      dashboardCache = {
        data: {
          stats: dashboardData.stats,
          recentConsultations: dashboardData.recentConsultations,
          acceptedConsultations: dashboardData.acceptedConsultations
        },
        timestamp: Date.now(),
        token: accessToken
      };
      
      console.log('✅ Dashboard data refreshed and cached');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh dashboard data');
      setError(error);
      if (__DEV__) {
        console.error('Error refreshing dashboard data:', error);
      }
      Alert.alert('Error', 'Failed to refresh dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    stats,
    recentConsultations,
    acceptedConsultations,
    refresh, // Export refresh function for manual cache invalidation
  };
};
