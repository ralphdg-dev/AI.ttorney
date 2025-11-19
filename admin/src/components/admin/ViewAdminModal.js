import React, { useState, useEffect, useContext } from 'react';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { X, Download, History, Activity, ChevronUp, ChevronDown, Eye, FileText, AlertCircle, Loader2 } from 'lucide-react';
import adminManagementService from '../../services/adminManagementService';
import { useAuth } from '../../contexts/AuthContext';
import { exportAdminAuditTrailPDF, exportAdminActivityPDF } from './AdminPDFExportUtils';

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-green-100 text-green-800 border border-green-200';
    }
  };

  const getDisplayStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'suspended':
        return 'Suspended';
      default:
        return 'Active';
    }
  };

  const styles = getStatusStyles(status);
  const displayStatus = getDisplayStatus(status);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${styles}`}>
      {displayStatus}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const styles = role === 'superadmin'
    ? 'bg-purple-100 text-purple-800 border border-purple-200'
    : 'bg-blue-100 text-blue-800 border border-blue-200';
  
  const displayRole = role === 'superadmin' ? 'Superadmin' : 'Admin';
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${styles}`}>
      {displayRole}
    </span>
  );
};

const ViewAdminModal = ({ open, onClose, admin }) => {
  const [activeTab, setActiveTab] = useState('audit');
  
  // State for audit logs (actions performed ON this admin)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  
  // State for recent activity (actions performed BY this admin)
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const { admin: currentAdmin } = useAuth();
  useEffect(() => {
    if (open && admin?.id) {
      loadAuditLogs();
      loadRecentActivity();
    }
  }, [open, admin?.id]);

  if (!admin) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      
      const response = await adminManagementService.getAdminAuditLogs(admin.id, { limit: 100 });
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditError(error.message);
      // Fallback to mock data if API fails
      setAuditLogs([
        {
          id: 1,
          action: 'Admin created',
          actor_name: 'System',
          actor_role: 'system',
          created_at: admin.created_at,
          details: JSON.stringify({ action: 'Admin account created' })
        }
      ]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Transform audit logs for display
  const auditTrail = auditLogs.map(log => ({
    id: log.id,
    action: log.action,
    admin: log.actor_name || 'Unknown Admin',
    role: log.actor_role || 'Admin',
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

  // Load recent activity when modal opens
  const loadRecentActivity = async () => {
    try {
      setActivityLoading(true);
      setActivityError(null);
      
      const response = await adminManagementService.getAdminRecentActivity(admin.id, { limit: 50 });
      setRecentActivity(response.data || []);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      setActivityError(error.message);
      // Fallback to mock data if API fails
      setRecentActivity([
        {
          id: 1,
          action: 'Logged into admin panel',
          target_table: 'admin',
          created_at: admin.last_login || new Date().toISOString(),
          metadata: { action_type: 'login' }
        }
      ]);
    } finally {
      setActivityLoading(false);
    }
  };

  // Handle PDF export for audit trail
  const handleExportAuditTrail = async () => {
    try {
      await exportAdminAuditTrailPDF(
        auditLogs,
        admin.full_name,
        admin.email,
        currentAdmin,
        admin.id
      );
      
      // Refresh audit logs to show the new PDF generation entry
      setTimeout(() => {
        loadAuditLogs();
        loadRecentActivity();
      }, 1000); // Small delay to ensure the audit log is created
    } catch (error) {
      console.error('Failed to export audit trail PDF:', error);
      alert('Failed to export audit trail PDF. Please try again.');
    }
  };

  // Handle PDF export for recent activity
  const handleExportActivity = async () => {
    try {
      // Use the recent activity data from the new API
      const activityData = recentActivity.map(activity => ({
        action: activity.action,
        date: activity.created_at,
        details: activity.metadata?.action_type || activity.action
      }));

      await exportAdminActivityPDF(
        activityData,
        admin.full_name,
        admin.email,
        currentAdmin,
        admin.id
      );
      
      // Refresh both audit logs and recent activity to show the new PDF generation entry
      setTimeout(() => {
        loadAuditLogs();
        loadRecentActivity();
      }, 1000); // Small delay to ensure the audit log is created
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

  return (
    <Modal 
      open={open} 
      onClose={() => {}} 
      title="Admin Details"
      width="max-w-4xl"
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Admin Basic Info - Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="text-xs text-gray-900">
                {admin.full_name || 'N/A'}
              </div>
            </div>


            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Created Date
              </label>
              <div className="text-xs text-gray-900">
                {formatDate(admin.created_at)}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Role
              </label>
              <div>
                <RoleBadge role={admin.role} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-xs text-gray-900">
                {admin.email}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Status
              </label>
              <div>
                <StatusBadge status={admin.status} />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Last Edited At
              </label>
              <div className="text-xs text-gray-900">
                {admin.updated_at ? formatDate(admin.updated_at) : 
                 admin.created_at ? formatDate(admin.created_at) : 'Never'}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Last Login
              </label>
              <div className="text-xs text-gray-900">
                {formatLastLogin(admin.last_login)}
              </div>
            </div>
          </div>
        </div>

        {/* Admin History & Audit Trail Section */}
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
                              {formatDate(activity.date)}
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
                                <div className="text-gray-500 capitalize">{log.role || 'Admin'}</div>
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
                  {formatDate(selectedActivity.date)}
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
                  Date & Time
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(selectedActivity.date)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Details
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md min-h-[60px]">
                  {selectedActivity.details || 'No additional details available'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Admin Information
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <span>{admin.full_name}</span>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={admin.role} />
                      <StatusBadge status={admin.status} />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {admin.email}
                  </div>
                </div>
              </div>

              {/* Additional metadata if available */}
              {selectedActivity.id && selectedActivity.id.startsWith('audit_') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Activity ID
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                    {selectedActivity.id}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleCloseActivityModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default ViewAdminModal;
