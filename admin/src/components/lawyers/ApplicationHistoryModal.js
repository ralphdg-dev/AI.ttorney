import React from 'react';
import Modal from '../ui/Modal';
import { Eye, Clock, FileText, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

const ApplicationHistoryModal = ({ open, onClose, applicationId, onViewApplication }) => {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Load application history when modal opens
  React.useEffect(() => {
    if (open && applicationId) {
      loadHistory();
    }
  }, [open, applicationId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await lawyerApplicationsService.getApplicationHistory(applicationId);
      setHistory(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status icon and color
  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return {
          icon: <CheckCircle size={16} />,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200'
        };
      case 'rejected':
        return {
          icon: <XCircle size={16} />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'resubmission':
        return {
          icon: <RotateCcw size={16} />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'pending':
      default:
        return {
          icon: <Clock size={16} />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
    }
  };

  // Get application type display
  const getApplicationTypeDisplay = (type, isLatest) => {
    if (isLatest) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
          Current
        </span>
      );
    }
    
    switch (type?.toLowerCase()) {
      case 'resubmission':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            Resubmission
          </span>
        );
      case 'initial':
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            Initial
          </span>
        );
    }
  };

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Application History" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading application history...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal open={open} onClose={onClose} title="Application History" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <p className="text-sm text-red-600 mb-2">Failed to load application history</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button 
              onClick={loadHistory}
              className="bg-[#023D7B] text-white text-xs px-3 py-1.5 rounded-md hover:bg-[#013462]"
            >
              Try Again
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Application History" width="max-w-4xl">
      <div className="space-y-4">
        {/* Header Info */}
        {history.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {history[0]?.full_name}
                </h3>
                <p className="text-xs text-gray-500">
                  {history[0]?.email} • Roll Number: {history[0]?.roll_number}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Total Applications</p>
                <p className="text-lg font-semibold text-gray-900">{history.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        {history.length > 0 ? (
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((app, index) => {
                  const statusDisplay = getStatusDisplay(app.status);
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            v{app.version || (history.length - index)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getApplicationTypeDisplay(app.application_type, app.is_latest)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color} ${statusDisplay.borderColor} border`}>
                          {statusDisplay.icon}
                          <span className="ml-1 capitalize">{app.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.submitted_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.updated_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => onViewApplication(app)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-[#023D7B] bg-[#023D7B]/10 rounded-md hover:bg-[#023D7B]/20 transition-colors"
                        >
                          <Eye size={12} className="mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No application history found</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ApplicationHistoryModal;
