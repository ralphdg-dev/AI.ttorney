import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { History, Activity, Download, Eye, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import legalSeekerService from '../../services/legalSeekerService';

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
  
  // State for audit logs and recent activity
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const { admin: currentAdmin } = useAuth();

  // Load audit logs when modal opens
  const loadAuditLogs = async () => {
    if (!userData?.id) return;
    
    try {
      setAuditLoading(true);
      setAuditError(null);
      
      const response = await legalSeekerService.getAuditLogs(userData.id, { limit: 50 });
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditError(error.message);
      
      // Fallback to mock data if API fails
      const mockAuditLogs = [
        {
          id: 1,
          action: 'Account created',
          actor_name: 'System',
          role: 'system',
          created_at: userData.created_at,
          details: JSON.stringify({ action: 'User account created' })
        },
        {
          id: 2,
          action: 'Email verified',
          actor_name: userData.full_name || 'User',
          role: 'user',
          created_at: userData.updated_at || userData.created_at,
          details: JSON.stringify({ action: 'Email verification completed' })
        }
      ];
      
      setAuditLogs(mockAuditLogs);
    } finally {
      setAuditLoading(false);
    }
  };

  // Load recent activity when modal opens
  const loadRecentActivity = async () => {
    if (!userData?.id) return;
    
    try {
      setActivityLoading(true);
      setActivityError(null);
      
      const response = await legalSeekerService.getRecentActivity(userData.id, { limit: 50 });
      setRecentActivity(response.data || []);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      setActivityError(error.message);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (open && userData?.id) {
      loadAuditLogs();
      loadRecentActivity();
    }
  }, [open, userData?.id]);

  // Debug logging
  React.useEffect(() => {
    if (userData) {
    }
  }, [user, userData]);

  // Transform audit logs for display
  const auditTrail = auditLogs.map(log => ({
    id: log.id,
    action: log.action,
    admin: log.actor_name || 'Unknown Admin',
    role: log.actor_role || 'User',
    date: log.created_at,
    details: (() => {
      try {
        const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        return parsed?.action || log.action;
      } catch {
        return log.action;
      }
    })()
  }));

  // Handle PDF export for audit trail (placeholder)
  const handleExportAuditTrail = async () => {
    try {
      // TODO: Implement PDF export functionality
      alert('PDF export functionality will be implemented soon');
    } catch (error) {
      console.error('Failed to export audit trail PDF:', error);
      alert('Failed to export audit trail PDF. Please try again.');
    }
  };

  // Handle PDF export for recent activity (placeholder)
  const handleExportActivity = async () => {
    try {
      // TODO: Implement PDF export functionality
      alert('PDF export functionality will be implemented soon');
    } catch (error) {
      console.error('Failed to export activity PDF:', error);
      alert('Failed to export activity PDF. Please try again.');
    }
  };

  // Handle viewing activity details
  const handleViewActivity = (activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  // Handle closing activity modal
  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedActivity(null);
  };

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

  if (!user && !loading) return <Modal open={open} onClose={() => {}} title="Legal Seeker Details" showCloseButton={false} />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={() => {}} title="Legal Seeker Details" width="max-w-4xl" showCloseButton={false}>
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
      onClose={() => {}} 
      title="Legal Seeker Details" 
      width="max-w-4xl"
      showCloseButton={false}
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
              <div className="text-[9px] text-gray-500">Last Edited At</div>
              <div className="text-xs text-gray-700">
                {updatedAt ? formatDate(updatedAt) : 
                 createdAt ? formatDate(createdAt) : 'Never'}
              </div>
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

        {/* Legal Seeker History & Audit Trail Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Activity Column */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-gray-600" />
                  <h4 className="text-xs font-medium text-gray-900">Recent Activity</h4>
                  <span className="text-[10px] text-gray-500">({recentActivity.length} entries)</span>
                </div>
                <Tooltip content="Download as PDF">
                  <button
                    onClick={handleExportActivity}
                    disabled={!recentActivity || recentActivity.length === 0}
                    className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={14} />
                  </button>
                </Tooltip>
              </div>

              {recentActivity.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <div className="max-h-32 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="px-2 py-1.5 text-right text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentActivity.map((activity) => (
                          <tr key={activity.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <div className="text-[9px] font-medium text-gray-900">
                                {activity.action}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                              {formatDate(activity.created_at)}
                            </td>
                            <td className="px-2 py-1.5 max-w-32">
                              <div className="text-[9px] text-gray-700 truncate" title={activity.details || '-'}>
                                {activity.details || '-'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <Tooltip content="View Details">
                                <button
                                  onClick={() => handleViewActivity(activity)}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                                >
                                  <Eye size={12} />
                                </button>
                              </Tooltip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">No recent activity found</p>
                </div>
              )}
            </div>

            {/* Audit Trail Column */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <History className="h-3 w-3 text-gray-600" />
                  <h4 className="text-xs font-medium text-gray-900">Audit Trail</h4>
                  <span className="text-[10px] text-gray-500">({auditTrail.length} entries)</span>
                </div>
                <Tooltip content="Download as PDF">
                  <button
                    onClick={handleExportAuditTrail}
                    disabled={auditLoading || !auditTrail || auditTrail.length === 0}
                    className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {auditLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                </Tooltip>
              </div>

              {auditLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-1 animate-spin" />
                  <p className="text-[10px] text-gray-500">Loading audit trail...</p>
                </div>
              ) : auditError ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
                  <p className="text-[10px] text-red-500 mb-2">Failed to load audit trail</p>
                  <button 
                    onClick={loadAuditLogs}
                    className="text-[9px] text-blue-600 hover:text-blue-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : auditTrail.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <div className="max-h-32 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditTrail.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <div className="text-[9px] font-medium text-gray-900">
                                {log.action}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-[9px]">
                                <div className="font-medium text-gray-900">
                                  {log.admin || 'Unknown Admin'}
                                </div>
                                <div className="text-gray-500 capitalize">{log.role || 'User'}</div>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                              {formatDate(log.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <History className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">No audit trail found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B]"
          >
            Close
          </button>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {showActivityModal && selectedActivity && (
        <Modal
          open={showActivityModal}
          onClose={handleCloseActivityModal}
          title="Activity Details"
          width="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Activity Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  {selectedActivity.action}
                </h3>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedActivity.created_at)}
                </span>
              </div>
            </div>

            {/* Activity Details */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Action Type
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedActivity.action}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Details
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedActivity.details || 'No additional details available'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Timestamp
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(selectedActivity.created_at, true)}
                </div>
              </div>

              {selectedActivity.metadata && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default ViewLegalSeekerModal;
