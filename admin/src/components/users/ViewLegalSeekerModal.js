import React from 'react';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { History, FileText } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified_lawyer':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'admin':
      case 'superadmin':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'registered_user':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'guest':
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified_lawyer': return 'Verified Lawyer';
      case 'admin': return 'Admin';
      case 'superadmin': return 'Super Admin';
      case 'registered_user': return 'Registered User';
      case 'guest': return 'Guest';
      default: return 'Unknown';
    }
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyles(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};

const VerificationBadge = ({ isVerified }) => {
  if (isVerified === null || isVerified === undefined) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
        Not Set
      </span>
    );
  }

  const styles = isVerified
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-red-50 text-red-700 border border-red-200';
  const label = isVerified ? 'Verified' : 'Not Verified';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {label}
    </span>
  );
};

const BooleanBadge = ({ value, trueLabel = 'Yes', falseLabel = 'No', invertColors = false, grayForFalse = false }) => {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
        Not Set
      </span>
    );
  }

  let styles;
  if (grayForFalse) {
    // For cases like "Pending Lawyer Application" where false (None) should be gray
    styles = value
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-gray-50 text-gray-700 border border-gray-200';
  } else if (invertColors) {
    // For cases like "Blocked from Applying" where false (Allowed) should be green
    styles = value
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else {
    // Normal case where true is green, false is red
    styles = value
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200';
  }
  
  const label = value ? trueLabel : falseLabel;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {label}
    </span>
  );
};

const ViewLegalSeekerModal = ({ open, onClose, user, loading = false }) => {
  // Extract the actual user data from the API response
  const userData = user?.data || user;

  // Debug logging
  React.useEffect(() => {
    if (userData) {
      console.log('ViewLegalSeekerModal - Raw user data:', user);
      console.log('ViewLegalSeekerModal - Processed userData:', userData);
      console.log('ViewLegalSeekerModal - Available fields:', Object.keys(userData));
    }
  }, [user, userData]);

  // Memoize extracted values to prevent unnecessary re-renders
  const extractedData = React.useMemo(() => {
    if (!userData) return {};

    const {
      id,
      email,
      username,
      full_name: fullName,
      role,
      is_verified: isVerified,
      created_at: createdAt,
      updated_at: updatedAt,
      birthdate,
      pending_lawyer: pendingLawyer,
      reject_count: rejectCount,
      last_rejected_at: lastRejectedAt,
      is_blocked_from_applying: isBlockedFromApplying
    } = userData;

    return {
      id,
      email,
      username,
      fullName,
      role,
      isVerified,
      createdAt,
      updatedAt,
      birthdate,
      pendingLawyer,
      rejectCount,
      lastRejectedAt,
      isBlockedFromApplying
    };
  }, [userData]);

  if (!user && !loading) return <Modal open={open} onClose={onClose} title="Legal Seeker Details" />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Legal Seeker Details" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading user details...</p>
          </div>
        </div>
      </Modal>
    );
  }
  
  // Extract values from memoized data
  const {
    id,
    email,
    username,
    fullName,
    role,
    isVerified,
    createdAt,
    updatedAt,
    birthdate,
    pendingLawyer,
    rejectCount,
    lastRejectedAt,
    isBlockedFromApplying
  } = extractedData;

  // Format date for display
  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Legal Seeker Details" 
      width="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Account Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Account Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] text-gray-500">Full Name</div>
              <div className="text-xs font-medium text-gray-900">{fullName || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Email</div>
              <div className="text-xs font-medium text-gray-900">{email || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Username</div>
              <div className="text-xs font-medium text-gray-900">{username || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Verification Status</div>
              <div className="flex items-center gap-2">
                <VerificationBadge isVerified={isVerified} />
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Created At</div>
              <div className="text-xs text-gray-700">{formatDate(createdAt)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Updated At</div>
              <div className="text-xs text-gray-700">{formatDate(updatedAt)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Birthdate</div>
              <div className="text-xs text-gray-700">{formatDate(birthdate, false)}</div>
            </div>
          </div>
        </div>

        {/* Lawyer Application Status */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Lawyer Application Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-gray-500">Pending Lawyer Application</div>
              <div className="flex items-center gap-2">
                <BooleanBadge value={pendingLawyer} trueLabel="Pending" falseLabel="None" grayForFalse={true} />
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Blocked from Applying</div>
              <div className="flex items-center gap-2">
                <BooleanBadge value={isBlockedFromApplying} trueLabel="Blocked" falseLabel="Allowed" invertColors={true} />
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Rejection Count</div>
              <div className="text-xs font-medium text-gray-900">
                {rejectCount !== null && rejectCount !== undefined ? rejectCount : 0}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Last Rejected At</div>
              <div className="text-xs text-gray-700">{formatDate(lastRejectedAt)}</div>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <Tooltip content="View User Activity History">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100">
                <History size={12} />
                Activity History
              </button>
            </Tooltip>
            <Tooltip content="Generate User Report">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                <FileText size={12} />
                Generate Report
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewLegalSeekerModal;
