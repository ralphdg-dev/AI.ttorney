import React from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

const ConfirmationModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showFeedbackInput = false,
  feedbackLabel = 'Feedback',
  feedbackPlaceholder = 'Enter your feedback...',
  applicantName = '',
  loading = false,
  changes = null // New prop for structured changes
}) => {
  const [feedback, setFeedback] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setFeedback('');
    }
  }, [open]);

  // Helper function to capitalize status values
  const capitalizeStatus = (value) => {
    if (!value || value === 'Not set') return value;
    
    // Handle specific status values
    const statusMap = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'accepted': 'Accepted',
      'resubmission': 'Resubmission',
      'active': 'Active',
      'inactive': 'Inactive',
      'suspended': 'Suspended',
      'archived': 'Archived'
    };
    
    return statusMap[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
  };

  // Helper function to format display value
  const formatDisplayValue = (fieldName, value) => {
    // Capitalize status-related fields
    if (fieldName.toLowerCase().includes('status')) {
      return capitalizeStatus(value);
    }
    return value;
  };

  if (!open) return null;

  const handleConfirm = () => {
    if (showFeedbackInput) {
      onConfirm(feedback);
    } else {
      onConfirm();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'approve':
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      case 'reject':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'resubmission':
        return <RotateCcw className="w-6 h-6 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'approve':
        return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500';
      case 'reject':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'resubmission':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  const isConfirmDisabled = showFeedbackInput && !feedback.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Main message */}
          <p className="text-sm text-gray-600 mb-4">
            {/* Extract the main message part (before "Changes:") */}
            {message.includes('Changes:') ? message.split('Changes:')[0].trim() : message}
          </p>
          
          {applicantName && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-700">
                <span className="font-medium">Applicant:</span> {applicantName}
              </p>
            </div>
          )}

          {/* Enhanced Changes Display */}
          {changes && Object.keys(changes).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Changes to be Applied
              </h4>
              <div className="space-y-3">
                {Object.entries(changes).map(([field, change]) => (
                  <div key={field} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">{field}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-1">From:</span>
                        <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700 font-mono text-xs break-words">
                          {formatDisplayValue(field, change.from) || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">To:</span>
                        <div className="bg-green-50 border border-green-200 rounded px-2 py-1 text-green-700 font-mono text-xs break-words">
                          {formatDisplayValue(field, change.to) || 'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showFeedbackInput && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                {feedbackLabel}
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={feedbackPlaceholder}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
              {showFeedbackInput && (
                <p className="text-xs text-gray-500 mt-1">
                  This feedback will be shown to the applicant.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled || loading}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonColor()}`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
