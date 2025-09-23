import React from 'react';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { History, Eye, Clock, FileText, CheckCircle, XCircle, AlertCircle, RotateCcw, Download, ZoomIn } from 'lucide-react';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

// Separate component for images to prevent re-renders
const StableSecureImage = React.memo(({ imagePath, alt, className, primaryBucket }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const loadedPathRef = React.useRef(null);

  const possibleBuckets = React.useMemo(() => [
    primaryBucket,
    'uploads',
    'images', 
    'lawyer-documents',
    'application-files',
    'documents',
    'files'
  ].filter(Boolean), [primaryBucket]);

  React.useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      setError(null);
      setImageLoaded(false);
      loadedPathRef.current = null;
      return;
    }

    // Don't reload if we already loaded this exact path
    if (loadedPathRef.current === imagePath && imageUrl) {
      return;
    }

    const loadSignedUrl = async () => {
      setLoading(true);
      setError(null);
      setImageLoaded(false);

      for (let i = 0; i < possibleBuckets.length; i++) {
        try {
          const signedUrl = await lawyerApplicationsService.getSignedUrl(possibleBuckets[i], imagePath);
          
          // Only update if we're still loading the same path
          if (imagePath === loadedPathRef.current || !loadedPathRef.current) {
            setImageUrl(signedUrl);
            setLoading(false);
            loadedPathRef.current = imagePath;
          }
          return;
        } catch (err) {
          continue;
        }
      }

      if (imagePath === loadedPathRef.current || !loadedPathRef.current) {
        setError('Image not found in any bucket');
        setLoading(false);
        loadedPathRef.current = imagePath;
      }
    };

    loadSignedUrl();
  }, [imagePath, alt]); // Removed possibleBuckets from deps to prevent unnecessary reloads

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

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${alt.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleView = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  return (
    <>
      <div className="relative group">
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          onError={() => setError('Failed to load image')}
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        
        {/* Hover overlay with buttons */}
        {imageLoaded && imageUrl && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 rounded-md">
            <Tooltip content="View Full Size">
              <button
                onClick={handleView}
                className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full transition-all duration-200 hover:scale-110"
              >
                <ZoomIn size={16} className="text-gray-700" />
              </button>
            </Tooltip>
            <Tooltip content="Download">
              <button
                onClick={handleDownload}
                className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full transition-all duration-200 hover:scale-110"
              >
                <Download size={16} className="text-gray-700" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      
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
}, (prevProps, nextProps) => {
  // Only re-render if imagePath actually changes
  return prevProps.imagePath === nextProps.imagePath && 
         prevProps.primaryBucket === nextProps.primaryBucket;
});

const ViewLawyerApplicationModal = ({ open, onClose, application, loading = false, onViewHistoricalApplication, isHistoricalView = false, isEditMode = false, onSave }) => {
  // State for application history - must be at the top before any returns
  const [history, setHistory] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState(null);
  const [currentApplicationId, setCurrentApplicationId] = React.useState(null);
  
  // State for audit logs
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [auditError, setAuditError] = React.useState(null);

  // State for edit mode
  const [editStatus, setEditStatus] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);

  // Extract the actual application data from the API response
  const applicationData = application?.data || application;


  // Memoize extracted values to prevent unnecessary re-renders
  const extractedData = React.useMemo(() => {
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

    return {
      name,
      rollNumber,
      rollSignDate,
      registered,
      ibpCardPath,
      selfiePath,
      matchedRollId,
      status,
      email,
      fullName,
      praStatus
    };
  }, [applicationData]);

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
      // Clear edit state
      setEditStatus('');
      setEditNotes('');
      setSaveError(null);
    }
  }, [open, applicationData?.id, currentApplicationId, loadHistory, loadAuditLogs, isHistoricalView]);

  // Initialize edit values when modal opens in edit mode
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (open && isEditMode && applicationData && !isInitialized) {
      // Only initialize once per modal opening
      setEditStatus(applicationData.status || '');
      setEditNotes(applicationData.admin_notes || applicationData.notes || '');
      setSaveError(null);
      setIsInitialized(true);
    } else if (!open) {
      // Reset initialization flag when modal closes
      setIsInitialized(false);
    }
  }, [open, isEditMode, applicationData, isInitialized]);

  // Handle save in edit mode
  const handleSave = async () => {
    if (!applicationData?.id) return;
    
    try {
      setSaveLoading(true);
      setSaveError(null);
      
      // Prepare detailed update data for audit trail
      const updateData = {
        status: editStatus.trim(),
        admin_notes: editNotes.trim(),
        // Include original values for audit trail comparison
        previous_status: applicationData.status,
        previous_admin_notes: applicationData.admin_notes || applicationData.notes || '',
        // Additional metadata for audit trail
        edit_timestamp: new Date().toISOString(),
        edit_reason: 'Manual edit via admin panel'
      };
      
      const response = await lawyerApplicationsService.updateLawyerApplication(
        applicationData.id, 
        updateData
      );
      
      if (onSave) {
        onSave(response.data);
      }
      
      onClose();
      
    } catch (err) {
      setSaveError(err.message || 'Failed to update application');
    } finally {
      setSaveLoading(false);
    }
  };

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
  
  // Extract values from memoized data
  const {
    name,
    rollNumber,
    rollSignDate,
    registered,
    ibpCardPath,
    selfiePath,
    matchedRollId,
    status,
    email,
    fullName,
    praStatus
  } = extractedData;

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
    <Modal 
      open={open} 
      onClose={onClose} 
      title={isEditMode ? `Edit Application - ${fullName || 'Unknown'}` : "Lawyer Application Details"} 
      width="max-w-4xl"
    >
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
              {isEditMode ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-[#023D7B]"
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="resubmission">Resubmission</option>
                </select>
              ) : (
                <StatusBadge status={status} />
              )}
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
          <div className="sm:col-span-2">
            <div className="text-[9px] text-gray-500">Notes</div>
            {isEditMode ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-[#023D7B] resize-none mt-1"
                placeholder="Edit notes for this application..."
              />
            ) : (
              <div className="text-xs font-medium text-gray-900 mt-1">
                {applicationData?.admin_notes || applicationData?.notes || 'No notes available'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-medium text-gray-700 mb-1">IBP Card</div>
            <StableSecureImage 
              imagePath={ibpCardPath}
              alt="IBP Card"
              className="w-full h-40 object-cover rounded-md border border-gray-200"
              primaryBucket="ibp-ids"
            />
          </div>
          <div>
            <div className="text-[9px] font-medium text-gray-700 mb-1">Live Selfie</div>
            <StableSecureImage 
              imagePath={selfiePath}
              alt="Live Selfie"
              className="w-full h-40 object-cover rounded-md border border-gray-200"
              primaryBucket="selfie-ids"
            />
          </div>
        </div>

        {/* Save Error Display */}
        {isEditMode && saveError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{saveError}</p>
          </div>
        )}

        {/* Edit Mode Action Buttons */}
        {isEditMode && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saveLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveLoading || !editStatus.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#023D7B] border border-transparent rounded-md hover:bg-[#013462] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}

        {/* Application History & Audit Trail Section - Only show for main view, not historical view, not edit mode */}
        {!isHistoricalView && !isEditMode && (
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
                                  {getApplicationTypeDisplay(app.application_type, index === 0)}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewLawyerApplicationModal;
