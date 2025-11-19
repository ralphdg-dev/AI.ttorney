import React from 'react';
import { History, Download, AlertCircle } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { exportAuditTrailPDF } from './PDFExportUtils';
import { useAuth } from '../../contexts/AuthContext';

const AuditTrail = ({ 
  auditLogs, 
  auditLoading, 
  auditError,
  fullName,
  email,
  loadAuditLogs,
  applicationId
}) => {
  // Get current admin info from auth context
  const { admin } = useAuth();
  // Format date for display
  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return '-';
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

  const handleExportPDF = async () => {
    await exportAuditTrailPDF(auditLogs, fullName, email, admin, applicationId);
  };

  // Return the original table design
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History className="h-3 w-3 text-gray-600" />
          <h4 className="text-xs font-medium text-gray-900">Audit Trail</h4>
          <span className="text-[10px] text-gray-500">({auditLogs.length} entries)</span>
        </div>
        <Tooltip content="Download as PDF">
          <button
            onClick={handleExportPDF}
            disabled={!auditLogs || auditLogs.length === 0}
            className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
          </button>
        </Tooltip>
      </div>

      {auditLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#023D7B] mx-auto mb-1"></div>
            <p className="text-[10px] text-gray-600">Loading audit trail...</p>
          </div>
        </div>
      ) : auditError ? (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <AlertCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
            <p className="text-[10px] text-red-600 mb-1">Failed to load audit trail</p>
            <button 
              onClick={loadAuditLogs}
              className="text-[10px] bg-[#023D7B] text-white px-2 py-1 rounded hover:bg-[#013462]"
            >
              Try Again
            </button>
          </div>
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
                    Admin
                  </th>
                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => {
                  // Parse metadata for detailed action description
                  let detailedAction = log.action;
                  try {
                    const metadata = typeof log.details === 'string' ? JSON.parse(log.details) : (log.metadata || {});
                    if (metadata.old_status && metadata.new_status) {
                      const version = metadata.version ? ` (Version ${metadata.version})` : '';
                      detailedAction = `Changed status from ${metadata.old_status} to ${metadata.new_status}${version}`;
                    }
                  } catch {
                    // Ignore parsing errors, use original action
                  }
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">
                        <div className="text-[9px] font-medium text-gray-900">
                          {detailedAction}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="text-[9px]">
                          <div className="font-medium text-gray-900">
                            {log.actor_full_name || log.actor_name || 'Unknown Admin'}
                          </div>
                          <div className="text-gray-500 capitalize">{log.role || 'Admin'}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                        {formatDate(log.created_at, false)}
                      </td>
                    </tr>
                  );
                })}
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
    </>
  );
};

export default AuditTrail;
