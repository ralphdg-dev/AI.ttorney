import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { Loader2 } from 'lucide-react';

const VerificationBadge = ({ isVerified, isEditable = false, onStatusChange, disabled = false }) => {
  if (isEditable) {
    const statusOptions = ['Verified', 'Unverified'];
    const currentStatus = isVerified ? 'Verified' : 'Unverified';
    
    return (
      <Select
        value={currentStatus}
        onChange={(newStatus) => onStatusChange && onStatusChange(newStatus === 'Verified')}
        options={statusOptions}
        variant="form"
        disabled={disabled}
        placeholder="Select status"
      />
    );
  }

  if (isVerified === null || isVerified === undefined) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
        Not Set
      </span>
    );
  }

  const styles = isVerified
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-red-50 text-red-700 border border-red-200';
  const label = isVerified ? 'Verified' : 'Unverified';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {label}
    </span>
  );
};

const EditLegalSeekerModal = ({ open, onClose, user, onSave, loading = false }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract the actual user data from the API response
  const userData = user?.data || user;

  // Initialize status when modal opens or user changes
  useEffect(() => {
    if (userData && open) {
      setIsVerified(userData.is_verified || false);
      setError('');
    }
  }, [userData, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError('');

    try {
      // Create updated user data
      const updatedUser = {
        ...userData,
        is_verified: isVerified
      };

      if (onSave) {
        await onSave(updatedUser, userData); // Pass both updated and original for change comparison
      }
    } catch (err) {
      setError(err.message || 'Failed to update legal seeker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

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

  if (!userData && !loading) return <Modal open={open} onClose={onClose} title="Edit Legal Seeker" />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Edit Legal Seeker" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading user details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={open} 
      onClose={handleCancel} 
      title="Edit Legal Seeker"
      width="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Account Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] text-gray-500">Full Name</div>
              <div className="text-xs font-medium text-gray-900">{userData.full_name || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Email</div>
              <div className="text-xs font-medium text-gray-900">{userData.email || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Username</div>
              <div className="text-xs font-medium text-gray-900">{userData.username || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Verification Status</div>
              <div className="flex items-center gap-2">
                <VerificationBadge 
                  isVerified={isVerified} 
                  isEditable={true}
                  onStatusChange={setIsVerified}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Created At</div>
              <div className="text-xs text-gray-700">{formatDate(userData.created_at)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Last Edited At</div>
              <div className="text-xs text-gray-700">
                {userData.updated_at ? formatDate(userData.updated_at) : 
                 userData.created_at ? formatDate(userData.created_at) : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Birthdate</div>
              <div className="text-xs text-gray-700">{formatDate(userData.birthdate, false)}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditLegalSeekerModal;
