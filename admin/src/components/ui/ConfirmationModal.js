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
  loading = false
}) => {
  const [feedback, setFeedback] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setFeedback('');
    }
  }, [open]);

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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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
          <p className="text-gray-600 mb-4">{message}</p>
          
          {applicantName && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Applicant:</span> {applicantName}
              </p>
            </div>
          )}

          {showFeedbackInput && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {feedbackLabel}
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={feedbackPlaceholder}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled || loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonColor()}`}
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
