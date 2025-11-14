/**
 * Consultation Type System
 * 
 * Industry-standard type definitions for consultation management
 * Following HIPAA/GDPR privacy principles for legal consultation data
 * 
 * Privacy Considerations:
 * - All PII (email, mobile_number, message) marked as sensitive
 * - Soft delete support (deleted_at, deleted_by) for audit trails
 * - Reply tracking for lawyer-client communication
 */

import { Database } from './database.types';

// ============================================================================
// BASE TYPES (Direct from Database Schema)
// ============================================================================

export type ConsultationRow = Database['public']['Tables']['consultation_requests']['Row'];
export type ConsultationInsert = Database['public']['Tables']['consultation_requests']['Insert'];
export type ConsultationUpdate = Database['public']['Tables']['consultation_requests']['Update'];

// ============================================================================
// ENUMS (Type-Safe Constants)
// ============================================================================

/**
 * Consultation status lifecycle:
 * pending → accepted/rejected → completed
 * pending → cancelled (user action)
 */
export type ConsultationStatus = Database['public']['Enums']['consultation_status'];

/**
 * Consultation communication modes:
 * - online: Video call (Zoom, Google Meet, etc.)
 * - phone: Phone call
 * - onsite: In-person meeting at lawyer's office
 */
export type ConsultationMode = Database['public']['Enums']['consultation_mode'];

// ============================================================================
// EXTENDED TYPES (With Relations)
// ============================================================================

/**
 * Consultation with lawyer information (User's view)
 * 
 * Privacy: Does NOT include lawyer's personal contact info
 * Only includes public profile data
 */
export interface ConsultationWithLawyer extends ConsultationRow {
  lawyer_info: {
    name: string;
    specialization: string | null;
    location: string | null;
    // Note: phone_number intentionally excluded for privacy
  } | null;
}

/**
 * Consultation with user information (Lawyer's view)
 * 
 * Privacy: Includes necessary contact info for consultation
 * User consents to sharing this data when booking
 */
export interface ConsultationWithUser extends ConsultationRow {
  users: {
    full_name: string;
    email: string;
    username: string | null;
  } | null;
}

// ============================================================================
// UI-SPECIFIC TYPES
// ============================================================================

/**
 * Consultation card display data
 * Optimized for list views with minimal data
 */
export interface ConsultationCardData {
  id: string;
  lawyer_name: string;
  specialization: string;
  consultation_date: string;
  consultation_time: string;
  consultation_mode: ConsultationMode;
  status: ConsultationStatus;
  message: string;
  created_at: string;
  responded_at: string | null;
  email: string;
  mobile_number: string;
}

/**
 * Consultation detail view data
 * Includes full information for detail modal/page
 */
export interface ConsultationDetailData extends ConsultationWithLawyer {
  // All fields from ConsultationWithLawyer
  // Plus computed fields for UI
  formatted_date?: string;
  formatted_time?: string;
  time_until_consultation?: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type ConsultationFilterStatus = ConsultationStatus | 'all';
export type ConsultationFilterMode = ConsultationMode | 'all';

export interface ConsultationFilters {
  status: ConsultationFilterStatus;
  mode: ConsultationFilterMode;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create consultation request payload
 * Matches backend ConsultationRequestCreate model
 */
export interface CreateConsultationRequest {
  user_id: string;
  lawyer_id: string;
  message: string;
  email: string;
  mobile_number: string;
  consultation_date: string; // ISO date format
  consultation_time: string; // HH:MM format
  consultation_mode: ConsultationMode;
}

/**
 * Update consultation status payload
 * Used by lawyers to accept/reject/complete
 */
export interface UpdateConsultationStatusRequest {
  status: ConsultationStatus;
}

/**
 * Consultation list response with pagination
 */
export interface ConsultationListResponse {
  success: boolean;
  data: ConsultationWithLawyer[] | ConsultationWithUser[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Single consultation response
 */
export interface ConsultationResponse {
  success: boolean;
  data: ConsultationWithLawyer | ConsultationWithUser;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ConsultationError {
  code: ConsultationErrorCode;
  message: string;
  status_code: number;
}

export type ConsultationErrorCode =
  | 'BOOKING_CONFLICT'
  | 'INVALID_DATE'
  | 'LAWYER_NOT_FOUND'
  | 'LAWYER_NOT_ACCEPTING'
  | 'INVALID_STATUS'
  | 'NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'CREATE_FAILED'
  | 'UPDATE_FAILED'
  | 'DELETE_FAILED'
  | 'FETCH_FAILED'
  | 'INTERNAL_ERROR';

// ============================================================================
// PRIVACY UTILITIES
// ============================================================================

/**
 * Redact sensitive information for logging
 * GDPR/HIPAA compliant logging
 */
export function redactConsultationForLogging(consultation: ConsultationRow): Partial<ConsultationRow> {
  return {
    id: consultation.id,
    status: consultation.status,
    consultation_date: consultation.consultation_date,
    consultation_mode: consultation.consultation_mode,
    created_at: consultation.created_at,
    // Redact PII
    email: '***@***.***',
    mobile_number: '***-***-****',
    message: '[REDACTED]',
  };
}

/**
 * Check if consultation can be cancelled by user
 * Business rule: Can cancel pending and accepted consultations
 */
export function canCancelConsultation(consultation: ConsultationRow): boolean {
  return (consultation.status === 'pending' || consultation.status === 'accepted') && !consultation.deleted_at;
}

/**
 * Check if consultation can be deleted by user
 * Business rule: Can delete any consultation except active ones
 */
export function canDeleteConsultation(consultation: ConsultationRow): boolean {
  return consultation.status !== 'accepted' && !consultation.deleted_at;
}

/**
 * Check if lawyer can add notes to consultation
 * Business rule: Can add notes to accepted consultations
 */
export function canAddNotesToConsultation(consultation: ConsultationRow): boolean {
  return consultation.status === 'accepted' && !consultation.deleted_at;
}
