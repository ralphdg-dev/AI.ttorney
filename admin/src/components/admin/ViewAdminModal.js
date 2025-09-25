import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { X, Download, History, Activity, ChevronUp, ChevronDown, Eye, FileText, AlertCircle } from 'lucide-react';

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

  // Mock data for audit trail and recent activity
  const auditTrail = [
    {
      id: 1,
      action: 'Admin created',
      admin: 'System',
      role: 'System',
      date: admin.created_at,
      details: 'Admin account created'
    },
    {
      id: 2,
      action: 'Status changed',
      admin: 'John Doe',
      role: 'Superadmin',
      date: admin.updated_at,
      details: `Status changed to "${admin.status}"`
    },
    {
      id: 3,
      action: 'Last login',
      admin: admin.full_name,
      role: admin.role,
      date: admin.last_login,
      details: 'Admin logged into system'
    }
  ].filter(item => item.date); // Filter out items with null dates

  const recentActivity = [
    {
      id: 1,
      action: 'Logged in',
      date: admin.last_login,
      details: 'Admin panel access'
    },
    {
      id: 2,
      action: 'Profile updated',
      date: admin.updated_at,
      details: 'Admin profile information updated'
    }
  ].filter(item => item.date); // Filter out items with null dates

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Admin Details"
      width="max-w-4xl"
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
                Last Updated
              </label>
              <div className="text-xs text-gray-900">
                {formatDate(admin.updated_at)}
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
                    disabled={!auditTrail || auditTrail.length === 0}
                    className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={14} />
                  </button>
                </Tooltip>
              </div>

              {auditTrail.length > 0 ? (
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

      </div>
    </Modal>
  );
};

export default ViewAdminModal;
