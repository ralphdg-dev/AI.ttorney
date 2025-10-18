import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { fetchLawyerDashboardData, DashboardStats, ConsultationRequest } from '../services/lawyerDashboardService';

/**
 * Custom hook for lawyer dashboard data management
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

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const dashboardData = await fetchLawyerDashboardData(accessToken);
        
        setStats(dashboardData.stats);
        setRecentConsultations(dashboardData.recentConsultations);
        setAcceptedConsultations(dashboardData.acceptedConsultations);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load dashboard data');
        setError(error);
        if (__DEV__) {
          console.error('Error loading dashboard data:', error);
        }
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [accessToken]);

  return {
    loading,
    error,
    stats,
    recentConsultations,
    acceptedConsultations,
  };
};
