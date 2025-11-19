import Colors from '../constants/Colors';

/**
 * Utility functions for consultation styling (DRY principle)
 * These functions are shared across multiple components
 */

export interface StyleColors {
  bg: string;
  text: string;
  border?: string;
}

/**
 * Get color scheme for consultation status
 */
export const getStatusColor = (status: string): StyleColors => {
  switch (status) {
    case 'pending':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'accepted':
      return { bg: '#E8F4FD', text: Colors.primary.blue };
    case 'rejected':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'completed':
      return { bg: '#D1FAE5', text: '#065F46' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
};

/**
 * Get color scheme for consultation mode
 */
export const getModeColor = (mode: string | null): StyleColors => {
  switch (mode) {
    case 'online':
      return { bg: '#E8F4FD', text: Colors.primary.blue, border: '#C1E4F7' };
    case 'onsite':
      return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
  }
};

/**
 * Get client name from consultation data
 */
export const getClientName = (consultation: {
  users?: { first_name: string; last_name: string };
  client_name?: string;
}): string => {
  if (consultation.users) {
    return `${consultation.users.first_name} ${consultation.users.last_name}`;
  }
  return consultation.client_name || 'Client';
};

/**
 * Format date for display
 */
export const formatConsultationDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
};
