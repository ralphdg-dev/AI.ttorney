import React from 'react';
import Modal from '../ui/Modal';
import SecureImage from './SecureImage';
import ApplicationHistory from './ApplicationHistory';
import AuditTrail from './AuditTrail';
import StatusBadge from './StatusBadge';
import RollMatchBadge from './RollMatchBadge';
// PDF export utilities can be imported here when needed
import lawyerApplicationsService from '../../services/lawyerApplicationsService';
import rollMatchService from '../../services/rollMatchService';
import { useAuth } from '../../contexts/AuthContext';

// Note: StableSecureImage component moved to separate SecureImage.js file

const ViewLawyerApplicationModal = ({ open, onClose, application, loading = false, onViewHistoricalApplication, isHistoricalView = false, isEditMode = false, onSave }) => {
  // Auth context available for future admin features
  useAuth();
  
  // State for application history - must be at the top before any returns
  const [history, setHistory] = React.useState([]);
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [auditLogsLoading, setAuditLogsLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState(null);
  const [auditError, setAuditError] = React.useState(null);
  const [currentApplicationId, setCurrentApplicationId] = React.useState(null);
  
  // State for roll verification status
  const [praStatus, setPraStatus] = React.useState('unknown');
  
  // State for edit mode
  const [editStatus, setEditStatus] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [saveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);


  // Extract the actual application data from the API response
  const applicationData = application?.data || application;

  // Check roll number and add pra_status like the table does
  React.useEffect(() => {
    if (open && applicationData?.id) {
      const checkRollNumber = async () => {
        try {
          // Fetch fresh data like the table does
          const freshApplicationData = await lawyerApplicationsService.getLawyerApplication(applicationData.id);
          
          const rollCheck = await rollMatchService.checkApplicationDetails({
            rollNumber: freshApplicationData.roll_number,
            fullName: freshApplicationData.full_name,
            rollSignDate: freshApplicationData.roll_sign_date,
          });
          // Use state setters to trigger re-render
          setPraStatus(rollCheck.status);
        } catch (error) {
          console.error('Failed to check roll number:', error);
          setPraStatus('not_found');
        }
      };
      checkRollNumber();
    }
  }, [open, applicationData?.id]);


  // Memoize extracted values to prevent unnecessary re-renders
  const extractedData = React.useMemo(() => {
    const {
      full_name: name,
      roll_number: rollNumber,
      roll_signing_date: rollSignDate,
      submitted_at: registered,
      ibp_id: ibpCardPath,
      selfie: selfiePath,
      status,
    } = applicationData || {};

    // Get email and name from nested users object or direct field (for historical applications)
    const email = applicationData?.users?.email || applicationData?.email;
    const fullName = applicationData?.users?.full_name || applicationData?.full_name || name;

    return {
      name,
      rollNumber,
      rollSignDate,
      registered,
      ibpCardPath,
      selfiePath,
      status,
      email,
      fullName,
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
      setAuditLogsLoading(true);
      setAuditError(null);
      const response = await lawyerApplicationsService.getApplicationAuditLogs(applicationData.id);
      setAuditLogs(response.data || []);
    } catch (err) {
      setAuditError(err.message);
    } finally {
      setAuditLogsLoading(false);
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

  // PDF export functions can be added here when needed


  // Handle save in edit mode - show confirmation first
  const handleSave = async () => {
    if (!applicationData?.id) return;
    
    // Create updated application data for comparison
    const updatedApplication = {
      ...applicationData,
      status: editStatus.trim(),
      admin_notes: editNotes.trim(),
      notes: editNotes.trim() // For compatibility
    };
    
    if (onSave) {
      // Pass both updated and original data for change comparison
      // The parent component will handle the confirmation modal and actual API call
      onSave(updatedApplication, applicationData);
    }
  };

  if (!application && !loading) return <Modal open={open} onClose={() => {}} title="Lawyer Application Details" showCloseButton={false} />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={() => {}} title="Lawyer Application Details" width="max-w-4xl" showCloseButton={false}>
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
    rollNumber,
    rollSignDate,
    registered,
    ibpCardPath,
    selfiePath,
    status,
    email,
    fullName,
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

  // Note: Status badge and roll match badge components moved to separate files

  return (
    <Modal 
      open={open} 
      onClose={() => {}} 
      title={isEditMode ? `Edit Application - ${fullName || 'Unknown'}` : "Lawyer Application Details"} 
      width="max-w-4xl"
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Informational Note */}
        {!isHistoricalView && !isEditMode && (
          <div className="p-2 mb-3 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <div className="flex items-center justify-center w-3 h-3 bg-blue-500 rounded-sm">
                  <span className="text-white text-[8px] font-bold">!</span>
                </div>
              </div>
              <div className="text-[10px] text-blue-700">
                You are viewing the current application. To view previous versions, 
                use the <span className="font-medium">"View" button</span> in Application History below.
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <div>
            <div className="text-[9px] text-gray-500">Reviewed By</div>
            <div className="text-xs font-medium text-gray-900">{applicationData?.admin?.full_name || applicationData?.admin?.email || '-'}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Reviewed At</div>
            <div className="text-xs font-medium text-gray-900">{applicationData?.reviewed_at ? formatDate(applicationData.reviewed_at) : '-'}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Last Edited At</div>
            <div className="text-xs font-medium text-gray-900">
              {applicationData?.updated_at || applicationData?.edit_timestamp ? 
                formatDate(applicationData.updated_at || applicationData.edit_timestamp) : 
                applicationData?.created_at ? formatDate(applicationData.created_at) : '-'
              }
            </div>
          </div>
          <div className="sm:col-span-3">
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
              <div className="mt-1 text-xs font-medium text-gray-900">
                {applicationData?.admin_notes || applicationData?.notes || 'No notes available'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[9px] font-medium text-gray-700 mb-1">IBP Card</div>
            <SecureImage 
              imagePath={ibpCardPath}
              alt="IBP Card"
              className="object-cover w-full h-40 border border-gray-200 rounded-md"
              primaryBucket="ibp-ids"
            />
          </div>
          <div>
            <div className="text-[9px] font-medium text-gray-700 mb-1">Live Selfie</div>
            <SecureImage 
              imagePath={selfiePath}
              alt="Live Selfie"
              className="object-cover w-full h-40 border border-gray-200 rounded-md"
              primaryBucket="selfie-ids"
            />
          </div>
        </div>

        {/* Save Error Display */}
        {isEditMode && saveError && (
          <div className="p-3 border border-red-200 rounded-md bg-red-50">
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
                  <div className="inline w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
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
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              
              {/* Application History Column */}
              <div>
                <ApplicationHistory 
                  history={history}
                  historyLoading={historyLoading}
                  historyError={historyError}
                  onViewHistoricalApplication={onViewHistoricalApplication}
                  fullName={fullName}
                  email={email}
                  application={applicationData}
                  loadHistory={loadHistory}
                />
              </div>

              {/* Audit Trail Column */}
              <div>
                <AuditTrail 
                  auditLogs={auditLogs}
                  auditLoading={auditLogsLoading}
                  auditError={auditError}
                  fullName={fullName}
                  email={email}
                  loadAuditLogs={loadAuditLogs}
                  applicationId={application?.id || applicationData?.id}
                />
              </div>
            </div>
          </div>
        )}

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

export default ViewLawyerApplicationModal;
