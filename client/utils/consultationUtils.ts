/**
 * Consultation Utility Functions
 * 
 * Industry-standard UI helpers for consultation display
 * Following Material Design 3 and iOS HIG guidelines
 */

import { Phone, Video, MapPin, MessageCircle } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { ConsultationMode, ConsultationStatus } from '@/types/consultation.types';

// ============================================================================
// MODE UTILITIES (Communication Method)
// ============================================================================

/**
 * Get icon component for consultation mode
 * Industry standard: Video for online, Phone for calls, MapPin for in-person
 */
export function getModeIcon(mode: ConsultationMode | null) {
  switch (mode) {
    case 'online':
      return Video;
    case 'phone':
      return Phone;
    case 'onsite':
      return MapPin;
    default:
      return MessageCircle;
  }
}

/**
 * Get color scheme for consultation mode
 * Following Material Design 3 color semantics
 */
export function getModeColor(mode: ConsultationMode | null) {
  switch (mode) {
    case 'online':
      return {
        bg: '#E8F4FD',
        border: '#C1E4F7',
        text: Colors.primary.blue,
        label: 'Online Video'
      };
    case 'phone':
      return {
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#D97706',
        label: 'Phone Call'
      };
    case 'onsite':
      return {
        bg: '#F0FDF4',
        border: '#BBF7D0',
        text: '#16A34A',
        label: 'In-Person'
      };
    default:
      return {
        bg: '#F3F4F6',
        border: '#E5E7EB',
        text: '#6B7280',
        label: 'Not Specified'
      };
  }
}

/**
 * Get user-friendly label for consultation mode
 */
export function getModeLabel(mode: ConsultationMode | null): string {
  return getModeColor(mode).label;
}

// ============================================================================
// STATUS UTILITIES (Consultation Lifecycle)
// ============================================================================

/**
 * Get color scheme for consultation status
 * Following industry standards (Calendly, Acuity, Cal.com)
 */
export function getStatusColor(status: ConsultationStatus) {
  switch (status) {
    case 'pending':
      return {
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#D97706',
        label: 'Pending Review',
        icon: '⏳'
      };
    case 'accepted':
      return {
        bg: '#D1FAE5',
        border: '#A7F3D0',
        text: '#059669',
        label: 'Confirmed',
        icon: '✓'
      };
    case 'rejected':
      return {
        bg: '#FEE2E2',
        border: '#FECACA',
        text: '#DC2626',
        label: 'Declined',
        icon: '✕'
      };
    case 'completed':
      return {
        bg: '#E0E7FF',
        border: '#C7D2FE',
        text: '#4F46E5',
        label: 'Completed',
        icon: '✓'
      };
    case 'cancelled':
      return {
        bg: '#F3F4F6',
        border: '#E5E7EB',
        text: '#6B7280',
        label: 'Cancelled',
        icon: '⊘'
      };
    default:
      return {
        bg: '#F3F4F6',
        border: '#E5E7EB',
        text: '#6B7280',
        label: 'Unknown',
        icon: '?'
      };
  }
}

/**
 * Get user-friendly label for status
 */
export function getStatusLabel(status: ConsultationStatus): string {
  return getStatusColor(status).label;
}

/**
 * Check if status is actionable by user
 */
export function isStatusActionable(status: ConsultationStatus): boolean {
  return status === 'pending';
}

/**
 * Check if status is final (no more changes)
 */
export function isStatusFinal(status: ConsultationStatus): boolean {
  return ['completed', 'rejected', 'cancelled'].includes(status);
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format consultation date for display
 * Example: "Monday, January 15, 2024"
 */
export function formatConsultationDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format consultation time for display
 * Example: "2:30 PM"
 */
export function formatConsultationTime(timeString: string): string {
  try {
    // Handle HH:MM format
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString;
  }
}

/**
 * Get relative time until consultation
 * Example: "in 2 days", "tomorrow", "in 3 hours"
 */
export function getTimeUntilConsultation(dateString: string, timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const consultationDate = new Date(dateString);
    consultationDate.setHours(hours, minutes);
    
    const now = new Date();
    const diffMs = consultationDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMs < 0) {
      return 'Past';
    } else if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `in ${diffDays} days`;
    } else {
      const diffWeeks = Math.floor(diffDays / 7);
      return `in ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
    }
  } catch {
    return 'Unknown';
  }
}

/**
 * Check if consultation is upcoming (within 24 hours)
 */
export function isConsultationUpcoming(dateString: string, timeString: string): boolean {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const consultationDate = new Date(dateString);
    consultationDate.setHours(hours, minutes);
    
    const now = new Date();
    const diffMs = consultationDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours > 0 && diffHours <= 24;
  } catch {
    return false;
  }
}

// ============================================================================
// PRIVACY UTILITIES
// ============================================================================

/**
 * Mask email for privacy (GDPR compliant)
 * Example: "john.doe@example.com" → "j***e@e***.com"
 */
export function maskEmail(email: string): string {
  try {
    const [local, domain] = email.split('@');
    const [domainName, tld] = domain.split('.');
    
    const maskedLocal = local.length > 2
      ? `${local[0]}***${local[local.length - 1]}`
      : '***';
    
    const maskedDomain = domainName.length > 2
      ? `${domainName[0]}***`
      : '***';
    
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  } catch {
    return '***@***.***';
  }
}

/**
 * Mask phone number for privacy
 * Example: "+639171234567" → "+639***4567"
 */
export function maskPhoneNumber(phone: string): string {
  try {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    
    const lastFour = cleaned.slice(-4);
    const prefix = cleaned.slice(0, 3);
    
    return `+${prefix}***${lastFour}`;
  } catch {
    return '***-***-****';
  }
}

/**
 * Truncate message for preview (privacy + UX)
 * Example: Long message → "First 100 chars..."
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return `${message.substring(0, maxLength)}...`;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate consultation date (must be future)
 */
export function isValidConsultationDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date >= today;
  } catch {
    return false;
  }
}

/**
 * Validate consultation time format (HH:MM)
 */
export function isValidConsultationTime(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

/**
 * Sort consultations by date (upcoming first)
 */
export function sortConsultationsByDate<T extends { consultation_date: string; consultation_time: string }>(
  consultations: T[]
): T[] {
  return [...consultations].sort((a, b) => {
    const dateA = new Date(`${a.consultation_date}T${a.consultation_time}`);
    const dateB = new Date(`${b.consultation_date}T${b.consultation_time}`);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Sort consultations by status priority
 * Order: accepted → pending → completed → rejected → cancelled
 */
export function sortConsultationsByStatus<T extends { status: ConsultationStatus }>(
  consultations: T[]
): T[] {
  const statusPriority: Record<ConsultationStatus, number> = {
    accepted: 1,
    pending: 2,
    completed: 3,
    rejected: 4,
    cancelled: 5
  };
  
  return [...consultations].sort((a, b) => {
    return statusPriority[a.status] - statusPriority[b.status];
  });
}
