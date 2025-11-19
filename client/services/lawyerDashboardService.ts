import { NetworkConfig } from '../utils/networkConfig';

export interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  accepted_requests: number;
  completed_requests: number;
  rejected_requests: number;
  today_sessions: number;
}

export interface ConsultationRequest {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  message: string;
  email: string | null;
  mobile_number: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  consultation_date: string | null;
  consultation_time: string | null;
  consultation_mode: 'online' | 'onsite' | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  client_username: string | null;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  recentConsultations: ConsultationRequest[];
  acceptedConsultations: ConsultationRequest[];
}

/**
 * Fetch lawyer dashboard statistics
 */
export const fetchLawyerDashboardStats = async (
  accessToken: string
): Promise<DashboardStats> => {
  try {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    const response = await fetch(`${apiUrl}/api/consult-actions/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lawyer dashboard stats:', error);
    throw error;
  }
};

/**
 * Fetch recent consultation requests for lawyer dashboard
 * Returns the most recent 3 consultations
 */
export const fetchRecentConsultations = async (
  accessToken: string,
  limit: number = 3
): Promise<ConsultationRequest[]> => {
  try {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    const response = await fetch(
      `${apiUrl}/api/consult-actions/my-consultations`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch consultations: ${response.status}`);
    }

    const data: ConsultationRequest[] = await response.json();
    
    // Return only the most recent consultations (limit to 3 for dashboard)
    return data.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent consultations:', error);
    throw error;
  }
};

/**
 * Fetch all accepted consultations for calendar view
 */
export const fetchAcceptedConsultations = async (
  accessToken: string
): Promise<ConsultationRequest[]> => {
  try {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    const response = await fetch(
      `${apiUrl}/api/consult-actions/my-consultations?status_filter=accepted`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch accepted consultations: ${response.status}`);
    }

    const data: ConsultationRequest[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching accepted consultations:', error);
    throw error;
  }
};

/**
 * Fetch complete dashboard data (stats + recent consultations + accepted consultations)
 * OPTIMIZED: Single API call to fetch all consultations, then process locally
 */
export const fetchLawyerDashboardData = async (
  accessToken: string
): Promise<DashboardData> => {
  try {
    // Use auto-detection to get the best available API URL
    const apiUrl = await NetworkConfig.getBestApiUrl();
    
    // Fetch all consultations in a single API call
    const response = await fetch(
      `${apiUrl}/api/consult-actions/my-consultations`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (__DEV__) {
        console.error('❌ API Error:', errorText);
      }
      throw new Error(`Failed to fetch consultations: ${response.status}`);
    }

    const allConsultations: ConsultationRequest[] = await response.json();
    if (__DEV__) {
      console.log('📊 Fetched consultations:', allConsultations.length, 'total');
    }
    
    // Calculate stats locally (avoid separate API call)
    const today = new Date().toISOString().split('T')[0];
    const stats: DashboardStats = {
      total_requests: allConsultations.length,
      pending_requests: allConsultations.filter(c => c.status === 'pending').length,
      accepted_requests: allConsultations.filter(c => c.status === 'accepted').length,
      completed_requests: allConsultations.filter(c => c.status === 'completed').length,
      rejected_requests: allConsultations.filter(c => c.status === 'rejected').length,
      today_sessions: allConsultations.filter(
        c => c.status === 'accepted' && c.consultation_date === today
      ).length,
    };
    
    // Get recent consultations (first 3)
    const recentConsultations = allConsultations.slice(0, 3);

    return {
      stats,
      recentConsultations,
      acceptedConsultations: allConsultations.filter(c => c.status === 'accepted'),
    };
  } catch (error) {
    if (__DEV__) {
      console.error('Error fetching lawyer dashboard data:', error);
    }
    throw error;
  }
};
