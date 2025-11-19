import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Save, X, FileText, Calendar, Shield, User } from 'lucide-react';
import lawyersService from '../../services/lawyersService';

const StatusBadge = ({ status, isEditable = false, onStatusChange, disabled = false }) => {
  if (isEditable) {
    const statusOptions = ['Active', 'Suspended', 'Inactive'];
    
    return (
      <Select
        value={status || 'Active'}
        onChange={onStatusChange}
        options={statusOptions}
        variant="form"
        disabled={disabled}
        placeholder="Select status"
      />
    );
  }

  const getStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-green-100 text-green-800 border border-green-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStyles(status)}`}>
      {status || 'Active'}
    </span>
  );
};

const ConsultationBadge = ({ accepting, isEditable = false, onAcceptingChange, disabled = false }) => {
  if (isEditable) {
    const options = ['Yes', 'No'];
    
    return (
      <Select
        value={accepting ? 'Yes' : 'No'}
        onChange={(value) => onAcceptingChange && onAcceptingChange(value === 'Yes')}
        options={options}
        variant="form"
        disabled={disabled}
        placeholder="Select option"
      />
    );
  }

  const styles = accepting 
    ? 'bg-green-50 text-green-700 border border-green-200' 
    : 'bg-gray-50 text-gray-700 border border-gray-200';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {accepting ? 'Yes' : 'No'}
    </span>
  );
};

const EditLawyerModal = ({ open, onClose, lawyer, onSave, loading = false }) => {
  const [formData, setFormData] = useState({
    status: 'active',
    accepting_consultations: true,
    specializations: '',
    bio: '',
    years_of_experience: ''
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  // Extract the actual lawyer data from the API response
  const lawyerData = lawyer?.data || lawyer;

  // Initialize form data when modal opens or lawyer changes
  useEffect(() => {
    if (lawyerData && open) {
      setFormData({
        status: lawyerData.status || 'active',
        accepting_consultations: lawyerData.accepting_consultations !== false,
        specializations: Array.isArray(lawyerData.specializations) 
          ? lawyerData.specializations.join(', ') 
          : lawyerData.specializations || '',
        bio: lawyerData.bio || '',
        years_of_experience: lawyerData.years_of_experience || ''
      });
      setError('');
      setValidationErrors({});
    }
  }, [lawyerData, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        status: 'active',
        accepting_consultations: true,
        specializations: '',
        bio: '',
        years_of_experience: ''
      });
      setError('');
      setValidationErrors({});
      setIsSubmitting(false);
      setShowConfirmation(false);
      setConfirmationLoading(false);
    }
  }, [open]);

  // Validate form data
  const validateForm = () => {
    const errors = {};


    // Years of experience validation
    if (formData.years_of_experience && isNaN(parseInt(formData.years_of_experience))) {
      errors.years_of_experience = 'Years of experience must be a valid number';
    } else if (formData.years_of_experience && parseInt(formData.years_of_experience) < 0) {
      errors.years_of_experience = 'Years of experience cannot be negative';
    } else if (formData.years_of_experience && parseInt(formData.years_of_experience) > 70) {
      errors.years_of_experience = 'Years of experience seems unrealistic';
    }

    // Bio length validation
    if (formData.bio && formData.bio.length > 1000) {
      errors.bio = 'Bio must be less than 1000 characters';
    }

    // Specializations validation
    if (formData.specializations && formData.specializations.length > 500) {
      errors.specializations = 'Specializations must be less than 500 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleStatusChange = (newStatus) => {
    setFormData(prev => ({
      ...prev,
      status: newStatus.toLowerCase()
    }));
  };

  const handleAcceptingChange = (accepting) => {
    setFormData(prev => ({
      ...prev,
      accepting_consultations: accepting
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Show confirmation modal instead of directly updating
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    try {
      setConfirmationLoading(true);
      setError('');
      
      // Prepare update data
      const updateData = {
        status: formData.status,
        accepting_consultations: formData.accepting_consultations,
        specializations: formData.specializations ? 
          formData.specializations.split(',').map(s => s.trim()).filter(s => s) : [],
        bio: formData.bio.trim() || null,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null
      };
      
      // Create updated lawyer object for comparison
      const updatedLawyer = {
        ...lawyerData,
        ...updateData
      };
      
      // Call the onSave callback with both updated and original data for change comparison
      if (onSave) {
        await onSave(updatedLawyer, lawyerData);
      }
      
      // Close both modals
      setShowConfirmation(false);
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to update lawyer');
      setShowConfirmation(false);
    } finally {
      setConfirmationLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleCancel = () => {
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

  // Generate changes summary for confirmation
  const getChangesSummary = () => {
    if (!lawyerData) return '';
    
    const changes = [];
    
    if (formData.status !== lawyerData.status) {
      changes.push(`Status: "${lawyerData.status || 'active'}" → "${formData.status}"`);
    }
    
    if (formData.accepting_consultations !== (lawyerData.accepting_consultations !== false)) {
      changes.push(`Accepting Consultations: "${lawyerData.accepting_consultations !== false ? 'Yes' : 'No'}" → "${formData.accepting_consultations ? 'Yes' : 'No'}"`);
    }
    
    
    const currentExp = lawyerData.years_of_experience || '';
    if (formData.years_of_experience !== currentExp.toString()) {
      changes.push(`Years of Experience: "${currentExp}" → "${formData.years_of_experience}"`);
    }
    
    return changes.join('\n');
  };

  if (!lawyerData && !loading) return <Modal open={open} onClose={onClose} title="Edit Lawyer" />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Edit Lawyer" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading lawyer details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={open} 
      onClose={handleCancel} 
      title="Edit Lawyer"
      width="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        
        {/* Basic Information (Read-only) */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] text-gray-500">Full Name</div>
              <div className="text-xs font-medium text-gray-900">{lawyerData.full_name || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Email</div>
              <div className="text-xs font-medium text-gray-900">{lawyerData.email || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Username</div>
              <div className="text-xs font-medium text-gray-900">{lawyerData.username || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Roll Number</div>
              <div className="text-xs font-medium text-gray-900">{lawyerData.roll_number || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Roll Sign Date</div>
              <div className="text-xs text-gray-700">{formatDate(lawyerData.roll_sign_date, false)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500">Registration Date</div>
              <div className="text-xs text-gray-700">{formatDate(lawyerData.registration_date)}</div>
            </div>
          </div>
        </div>

        {/* Status and Consultation Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Status & Consultation Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] text-gray-500 mb-1">Status</div>
              <StatusBadge 
                status={formData.status} 
                isEditable={true}
                onStatusChange={handleStatusChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <div className="text-[9px] text-gray-500 mb-1">Accepting Consultations</div>
              <ConsultationBadge 
                accepting={formData.accepting_consultations} 
                isEditable={true}
                onAcceptingChange={handleAcceptingChange}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Professional Information</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="years_of_experience" className="block text-[9px] text-gray-500 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                id="years_of_experience"
                name="years_of_experience"
                value={formData.years_of_experience}
                onChange={handleInputChange}
                min="0"
                max="70"
                className={`w-full px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.years_of_experience ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter years of experience"
                disabled={isSubmitting}
              />
              {validationErrors.years_of_experience && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.years_of_experience}</p>
              )}
            </div>

            <div>
              <label htmlFor="specializations" className="block text-[9px] text-gray-500 mb-1">
                Specializations (comma-separated)
              </label>
              <input
                type="text"
                id="specializations"
                name="specializations"
                value={formData.specializations}
                onChange={handleInputChange}
                className={`w-full px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.specializations ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Criminal Law, Corporate Law, Family Law"
                disabled={isSubmitting}
              />
              {validationErrors.specializations && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.specializations}</p>
              )}
            </div>

            <div>
              <label htmlFor="bio" className="block text-[9px] text-gray-500 mb-1">
                Professional Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                maxLength={1000}
                className={`w-full px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.bio ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter professional bio and background..."
                disabled={isSubmitting}
              />
              <div className="flex justify-between mt-1">
                {validationErrors.bio && (
                  <p className="text-[10px] text-red-600">{validationErrors.bio}</p>
                )}
                <p className="text-[10px] text-gray-500 ml-auto">
                  {formData.bio.length}/1000 characters
                </p>
              </div>
            </div>
          </div>
        </div>

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
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={showConfirmation}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmSave}
        title="Confirm Lawyer Changes"
        message={`Are you sure you want to save these changes to ${lawyerData.full_name}?\n\nChanges:\n${getChangesSummary()}`}
        confirmText="Save Changes"
        loading={confirmationLoading}
        type="edit"
      />
    </Modal>
  );
};

export default EditLawyerModal;
