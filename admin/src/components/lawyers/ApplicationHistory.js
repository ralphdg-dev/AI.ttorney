import React from 'react';
import { FileText, Download, Eye, AlertCircle } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import StatusBadge from './StatusBadge';
import { exportApplicationHistoryPDF } from './PDFExportUtils';

const ApplicationHistory = ({ 
  history, 
  historyLoading, 
  historyError, 
  onViewHistoricalApplication,
  fullName,
  email,
  application,
  loadHistory
}) => {
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

  // Get application type display for history
  const getApplicationTypeDisplay = (type, isLatest) => {
    if (isLatest) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
          Current
        </span>
      );
    }
    
    switch (type?.toLowerCase()) {
      case 'resubmission':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
            Resubmission
          </span>
        );
      case 'initial':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
            Initial
          </span>
        );
    }
  };

  const handleExportPDF = async () => {
    await exportApplicationHistoryPDF(history, fullName, email, application);
  };

  // Return the original table design
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3 text-gray-600" />
          <h4 className="text-xs font-medium text-gray-900">Application History</h4>
          <span className="text-[10px] text-gray-500">({history.length} versions)</span>
        </div>
        <Tooltip content="Download as PDF">
          <button
            onClick={handleExportPDF}
            disabled={!history || history.length === 0}
            className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
          </button>
        </Tooltip>
      </div>

      {historyLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#023D7B] mx-auto mb-1"></div>
            <p className="text-[10px] text-gray-600">Loading history...</p>
          </div>
        </div>
      ) : historyError ? (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <AlertCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
            <p className="text-[10px] text-red-600 mb-1">Failed to load history</p>
            <button 
              onClick={loadHistory}
              className="text-[10px] bg-[#023D7B] text-white px-2 py-1 rounded hover:bg-[#013462]"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : history.length > 0 ? (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <div className="max-h-32 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-2 py-1.5 text-right text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((app, index) => {
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span className="text-[9px] font-medium text-gray-900">
                          v{app.version || (history.length - index)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {getApplicationTypeDisplay(app.application_type, index === 0)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                        {formatDate(app.submitted_at, false)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right">
                        {/* Only show view button for historical applications (not the current one) */}
                        {index !== 0 ? (
                          <Tooltip content="View">
                            <button 
                              className="p-1 rounded hover:bg-gray-100" 
                              aria-label="View" 
                              onClick={() => onViewHistoricalApplication && onViewHistoricalApplication(app)}
                            >
                              <Eye size={12} />
                            </button>
                          </Tooltip>
                        ) : (
                          <span className="text-[9px] text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded">
                            Current
                          </span>
                        )}
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
          <FileText className="h-6 w-6 text-gray-400 mx-auto mb-1" />
          <p className="text-[10px] text-gray-500">No application history found</p>
        </div>
      )}
    </>
  );
};

export default ApplicationHistory;
