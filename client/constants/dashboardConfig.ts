import { Calendar, TrendingUp } from 'lucide-react-native';
import { DashboardStats } from '../services/lawyerDashboardService';

/**
 * Dashboard configuration constants
 * Industry standard: Configuration over hardcoding
 */

export interface QuickStatConfig {
  label: string;
  getValue: (stats: DashboardStats) => string;
  icon: typeof Calendar | typeof TrendingUp;
  color: string;
  bgColor: string;
  getChange: (stats: DashboardStats) => string;
  changeType: 'positive' | 'negative';
}

export const QUICK_STATS_CONFIG: QuickStatConfig[] = [
  {
    label: "Today's Consultations",
    getValue: (stats) => stats.today_sessions.toString(),
    icon: Calendar,
    color: '#059669',
    bgColor: '#ECFDF5',
    getChange: (stats) => `${stats.accepted_requests} total accepted`,
    changeType: 'positive',
  },
  {
    label: 'Total Consultations',
    getValue: (stats) => stats.total_requests.toString(),
    icon: TrendingUp,
    color: '#0369A1',
    bgColor: '#EFF6FF',
    getChange: (stats) => `${stats.pending_requests} pending`,
    changeType: 'positive',
  },
];

export const DASHBOARD_CONSTANTS = {
  RECENT_CONSULTATIONS_LIMIT: 3,
  LOADING_MESSAGE: 'Loading dashboard...',
  EMPTY_STATE_MESSAGE: 'No recent consultations',
} as const;
