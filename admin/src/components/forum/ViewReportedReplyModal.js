import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { MessageSquare, User, AlertTriangle, Calendar, Flag, History, Loader2 } from 'lucide-react';
import forumManagementService from '../../services/forumManagementService';

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'dismissed':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'sanctioned':
        return 'bg-green-50 text-green-700 border border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  const styles = getStatusStyles(status);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {displayStatus}
    </span>
  );
};

const ViewReportedReplyModal = ({ open, onClose, report, loading = false }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Load audit logs when modal opens
  useEffect(() => {
    if (open && report?.id) {
      loadAuditLogs();
    }
  }, [open, report?.id]);

  const loadAuditLogs = async () => {
    if (!report?.id) return;
    
    try {
      setAuditLoading(true);
      // Mock audit logs for now - replace with actual API call
      const mockLogs = [
        {
          id: 1,
          action: 'Report submitted',
          admin: report.reporter ? forumManagementService.formatUserDisplay(report.reporter) : 'User',
          role: 'user',
          date: report.submitted_at
        }
      ];
      
      if (report.status === 'dismissed' || report.status === 'sanctioned') {
        mockLogs.push({
          id: 2,
          action: report.status === 'dismissed' ? 'Report dismissed' : 'Report approved',
          admin: 'Admin User',
          role: 'admin',
          date: report.updated_at || report.submitted_at
        });
      }
      
      setAuditLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  if (!report && !loading) {
    return <Modal open={open} onClose={() => {}} title="Report Details" showCloseButton={false} />;
  }
  
  if (loading) {
    return (
      <Modal open={open} onClose={() => {}} title="Report Details" width="max-w-4xl" showCloseButton={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading report details...</p>
          </div>
        </div>
      </Modal>
    );
  }

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
      title="Report Details" 
      width="max-w-4xl"
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Report Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Report Information</h3>
          <div className="space-y-3">
            {/* First Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[9px] text-gray-500">Status</div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} />
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">Reported By</div>
                <div className="text-xs font-medium text-gray-900">
                  {forumManagementService.formatUserDisplay(report.reporter)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">Reported On</div>
                <div className="text-xs text-gray-700">{formatDate(report.submitted_at)}</div>
              </div>
            </div>
            
            {/* Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] text-gray-500">Report Reason</div>
                <div className="text-xs font-medium text-gray-900">
                  {forumManagementService.getReportCategoryDisplayName(report.reason)}
                </div>
              </div>
              {report.reason_context && (
                <div>
                  <div className="text-[9px] text-gray-500">Additional Context</div>
                  <div className="text-xs text-gray-700">
                    {report.reason_context}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reply Content */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-gray-600" />
                <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Reported Reply</div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-900 leading-relaxed mb-3">
                {report.reply?.reply_body || "Reply not found or has been deleted."}
              </p>
              {report.reply?.user && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                  <User className="w-3 h-3 text-gray-400" />
                  <div className="text-[10px] text-gray-600">
                    <span className="font-medium">Reply by:</span> {forumManagementService.formatUserDisplay(report.reply.user, false)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Original Post Context */}
          {report.reply?.post && (
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200 overflow-hidden">
              <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-blue-600" />
                  <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Original Post</div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-900 leading-relaxed mb-3">
                  {report.reply.post.body}
                </p>
                {report.reply.post.user && (
                  <div className="flex items-center gap-2 pt-3 border-t border-blue-200">
                    <User className="w-3 h-3 text-blue-400" />
                    <div className="text-[10px] text-gray-600">
                      <span className="font-medium">Posted by:</span>{" "}
                      {forumManagementService.formatUserDisplay(
                        report.reply.post.user,
                        report.reply.post.is_anonymous
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-3 w-3 text-gray-600" />
            <h4 className="text-xs font-medium text-gray-900">Audit Trail</h4>
            <span className="text-[10px] text-gray-500">({auditLogs.length} entries)</span>
          </div>

          {auditLoading ? (
            <div className="text-center py-6">
              <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-1 animate-spin" />
              <p className="text-[10px] text-gray-500">Loading audit trail...</p>
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="max-h-32 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                        Performed By
                      </th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5">
                          <div className="text-[9px] font-medium text-gray-900">
                            {log.action}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="text-[9px]">
                            <div className="font-medium text-gray-900">
                              {log.admin || 'Unknown'}
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
    </Modal>
  );
};

export default ViewReportedReplyModal;
