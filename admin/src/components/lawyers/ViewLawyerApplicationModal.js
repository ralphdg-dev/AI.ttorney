import React from 'react';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { History, Eye, Clock, FileText, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

const ViewLawyerApplicationModal = ({ open, onClose, application, loading = false, onViewHistoricalApplication, isHistoricalView = false }) => {
  // State for application history - must be at the top before any returns
  const [history, setHistory] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState(null);
  const [currentApplicationId, setCurrentApplicationId] = React.useState(null);
  
  // State for audit logs
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [auditError, setAuditError] = React.useState(null);

  // Extract the actual application data from the API response
  const applicationData = application?.data || application;

  // Load application history
  const loadHistory = React.useCallback(async () => {
    if (!applicationData?.id) return;
    
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await lawyerApplicationsService.getApplicationHistory(applicationData.id);
      setHistory(response.data || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [applicationData?.id]);

  // Load audit logs
  const loadAuditLogs = React.useCallback(async () => {
    if (!applicationData?.id) return;
    
    try {
      setAuditLoading(true);
      setAuditError(null);
      const response = await lawyerApplicationsService.getApplicationAuditLogs(applicationData.id);
      setAuditLogs(response.data || []);
    } catch (err) {
      setAuditError(err.message);
    } finally {
      setAuditLoading(false);
    }
  }, [applicationData?.id]);

  // Load application history when modal opens (only for main view, not historical view)
  React.useEffect(() => {
    if (open && applicationData?.id && !isHistoricalView) {
      // Check if this is a different application
      if (currentApplicationId !== applicationData.id) {
        // Clear previous data and load new one
        setHistory([]);
        setHistoryError(null);
        setAuditLogs([]);
        setAuditError(null);
        setCurrentApplicationId(applicationData.id);
        loadHistory();
        loadAuditLogs();
      }
    } else if (!open) {
      // Clear data when modal closes
      setHistory([]);
      setHistoryError(null);
      setAuditLogs([]);
      setAuditError(null);
      setCurrentApplicationId(null);
    }
  }, [open, applicationData?.id, currentApplicationId, loadHistory, loadAuditLogs, isHistoricalView]);

  if (!application && !loading) return <Modal open={open} onClose={onClose} title="Lawyer Application Details" />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Lawyer Application Details" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading application details...</p>
          </div>
        </div>
      </Modal>
    );
  }
  
  const {
    full_name: name,
    roll_number: rollNumber,
    roll_signing_date: rollSignDate,
    submitted_at: registered,
    ibp_id: ibpCardPath,
    selfie: selfiePath,
    matched_roll_id: matchedRollId,
    status,
  } = applicationData || {};

  // Get email and name from nested users object or direct field (for historical applications)
  const email = applicationData?.users?.email || applicationData?.email;
  const fullName = applicationData?.users?.full_name || applicationData?.full_name || name;
  
  // Set PRA status based on whether roll is matched
  const praStatus = matchedRollId ? 'matched' : 'not_found';

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

  // Get status icon and color for history
  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return {
          icon: <CheckCircle size={14} />,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200'
        };
      case 'rejected':
        return {
          icon: <XCircle size={14} />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'resubmission':
        return {
          icon: <RotateCcw size={14} />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'pending':
      default:
        return {
          icon: <Clock size={14} />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
    }
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

  // Component to load images from private Supabase Storage using signed URLs
  const SecureImage = ({ imagePath, alt, className, primaryBucket }) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [currentBucketIndex, setCurrentBucketIndex] = React.useState(0);

    // Possible bucket names to try
    const possibleBuckets = [
      primaryBucket,
      'uploads',
      'images', 
      'lawyer-documents',
      'application-files',
      'documents',
      'files'
    ].filter(Boolean);

    // Load signed URL when component mounts or imagePath changes
    React.useEffect(() => {
      if (!imagePath) return;

      const loadSignedUrl = async () => {
        setLoading(true);
        setError(null);
        setImageLoaded(false);
        setCurrentBucketIndex(0);

        // Try each bucket until we find the image
        for (let i = 0; i < possibleBuckets.length; i++) {
          try {
            setCurrentBucketIndex(i);
            const signedUrl = await lawyerApplicationsService.getSignedUrl(possibleBuckets[i], imagePath);
            setImageUrl(signedUrl);
            setLoading(false);
            return; // Success, exit the loop
          } catch (err) {
            // Continue to next bucket
            continue;
          }
        }

        // If we get here, all buckets failed
        setError('Image not found in any bucket');
        setLoading(false);
      };

      loadSignedUrl();
    }, [imagePath]);

    if (!imagePath) {
      return (
        <div className="w-full h-40 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[10px] text-gray-500">
          No image available
        </div>
      );
    }

    if (loading) {
      return (
        <div className="w-full h-40 rounded-md border border-gray-200 bg-gray-100 grid place-items-center text-[10px] text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-1"></div>
            <p>Loading image...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-40 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[10px] text-gray-500">
          <div className="text-center">
            <p>Failed to load image</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          onError={() => setError('Failed to load image')}
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        {!imageLoaded && imageUrl && (
          <div className="w-full h-40 rounded-md border border-gray-200 bg-gray-100 grid place-items-center text-[10px] text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-1"></div>
              <p>Loading image...</p>
            </div>
          </div>
        )}
      </>
    );
  };


  const RollMatchBadge = ({ status }) => {
    const s = (status || '').toLowerCase();
    const isMatched = s === 'matched';
    const styles = isMatched
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200';
    const label = isMatched ? 'Matched' : 'Not Found';
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
        {label}
      </span>
    );
  };


  // Status badge component
  const StatusBadge = ({ status }) => {
    const getStatusStyles = (status) => {
      switch (status?.toLowerCase()) {
        case 'approved':
        case 'accepted':
          return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case 'rejected':
          return 'bg-red-50 text-red-700 border border-red-200';
        case 'resubmission':
          return 'bg-orange-50 text-orange-700 border border-orange-200';
        case 'pending':
        default:
          return 'bg-amber-50 text-amber-700 border border-amber-200';
      }
    };

    const getStatusLabel = (status) => {
      switch (status?.toLowerCase()) {
        case 'approved': return 'Approved';
        case 'accepted': return 'Accepted';
        case 'rejected': return 'Rejected';
        case 'resubmission': return 'Resubmission';
        case 'pending': return 'Pending';
        default: return status || 'Pending';
      }
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyles(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Lawyer Application Details" width="max-w-4xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-gray-500">Full Name</div>
            <div className="text-xs font-medium text-gray-900">{fullName || '-'}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Email</div>
            <div className="text-xs font-medium text-gray-900">{email || '-'}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Roll Number</div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-gray-900">{rollNumber || '-'}</div>
              <RollMatchBadge status={praStatus} />
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Application Status</div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Roll Sign Date</div>
            <div className="text-xs font-medium text-gray-900">{formatDate(rollSignDate, false)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Application Date</div>
            <div className="text-xs font-medium text-gray-900">{formatDate(registered)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-medium text-gray-700 mb-1">IBP Card</div>
            <SecureImage 
              imagePath={ibpCardPath}
              alt="IBP Card"
              className="w-full h-40 object-cover rounded-md border border-gray-200"
              primaryBucket="ibp-ids"
            />
          </div>
          <div>
            <div className="text-[9px] font-medium text-gray-700 mb-1">Live Selfie</div>
            <SecureImage 
              imagePath={selfiePath}
              alt="Live Selfie"
              className="w-full h-40 object-cover rounded-md border border-gray-200"
              primaryBucket="selfie-ids"
            />
          </div>
        </div>

        {/* Application History & Audit Trail Section - Only show for main view, not historical view */}
        {!isHistoricalView && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Application History Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3 w-3 text-gray-600" />
                  <h4 className="text-xs font-medium text-gray-900">Application History</h4>
                  <span className="text-[10px] text-gray-500">({history.length} versions)</span>
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
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Version
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                          <th className="px-2 py-1.5 text-right text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {history.map((app, index) => {
                          const statusDisplay = getStatusDisplay(app.status);
                          return (
                            <tr key={app.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <span className="text-[9px] font-medium text-gray-900">
                                  v{app.version || (history.length - index)}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${statusDisplay.bgColor} ${statusDisplay.color} ${statusDisplay.borderColor} border`}>
                                  <span className="capitalize">{app.status}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                                {formatDate(app.submitted_at, false)}
                              </td>
                              <td className="px-2 py-1.5 max-w-32">
                                <div className="text-[9px] text-gray-700 truncate" title={app.notes || '-'}>
                                  {app.notes || '-'}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap text-right">
                                <Tooltip content="View">
                                  <button 
                                    className="p-1 rounded hover:bg-gray-100" 
                                    aria-label="View" 
                                    onClick={() => onViewHistoricalApplication && onViewHistoricalApplication(app)}
                                  >
                                    <Eye size={12} />
                                  </button>
                                </Tooltip>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500">No application history found</p>
                  </div>
                )}
              </div>

              {/* Audit Trail Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-3 w-3 text-gray-600" />
                  <h4 className="text-xs font-medium text-gray-900">Audit Trail</h4>
                  <span className="text-[10px] text-gray-500">({auditLogs.length} entries)</span>
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
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Notes
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
                              detailedAction = `Changed status from ${metadata.old_status} to ${metadata.new_status}`;
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
                              <td className="px-2 py-1.5 max-w-32">
                                <div className="text-[9px] text-gray-700 truncate" title={log.notes || '-'}>
                                  {log.notes || '-'}
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
                ) : (
                  <div className="text-center py-6">
                    <History className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500">No audit trail found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewLawyerApplicationModal;
