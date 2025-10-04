import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { Save, X } from 'lucide-react';
import adminManagementService from '../../services/adminManagementService';

const EditAdminModal = ({ open, onClose, onSave, admin }) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    surname: '',
    role: 'admin',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Reset form when modal opens or admin changes
  useEffect(() => {
    if (open && admin) {
      // Parse full_name into first_name and surname
      const nameParts = (admin.full_name || '').split(' ');
      const first_name = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        email: admin.email || '',
        first_name: first_name,
        surname: surname,
        role: admin.role || 'admin',
        status: admin.status || 'active'
      });
      setError(null);
      setValidationErrors({});
      setLoading(false);
    } else if (!open) {
      setFormData({
        email: '',
        first_name: '',
        surname: '',
        role: 'admin',
        status: 'active'
      });
      setError(null);
      setValidationErrors({});
      setLoading(false);
    }
  }, [open, admin]);

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // Status validation
    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Create updated admin data for comparison
    const updatedAdmin = {
      ...admin,
      status: formData.status
    };
    
    // Call the onSave callback with both updated and original data for change comparison
    // The parent component will handle the confirmation modal and actual API call
    if (onSave) {
      onSave(updatedAdmin, admin);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Don't render if no admin is selected
  if (!admin) {
    return null;
  }

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Edit Admin"
      width="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 text-xs cursor-not-allowed"
            placeholder="admin@example.com"
          />
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-2">
          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-xs font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              readOnly
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 text-xs cursor-not-allowed"
              placeholder="John"
            />
          </div>

          {/* Surname */}
          <div>
            <label htmlFor="surname" className="block text-xs font-medium text-gray-700 mb-1">
              Surname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="surname"
              name="surname"
              value={formData.surname}
              readOnly
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 text-xs cursor-not-allowed"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.role === 'admin' ? 'Admin' : formData.role === 'superadmin' ? 'Superadmin' : ''}
            onChange={() => {}} // No-op since it's read-only
            options={['Admin', 'Superadmin']}
            variant="form"
            disabled={true}
            placeholder="Select role"
            ariaLabel="Select admin role"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.status === 'active' ? 'Active' : formData.status === 'disabled' ? 'Disabled' : formData.status === 'archived' ? 'Archived' : ''}
            onChange={(value) => {
              const statusValue = value === 'Active' ? 'active' : value === 'Disabled' ? 'disabled' : value === 'Archived' ? 'archived' : value;
              setFormData(prev => ({ ...prev, status: statusValue }));
              // Clear validation error for this field
              if (validationErrors.status) {
                setValidationErrors(prev => ({ ...prev, status: '' }));
              }
            }}
            options={['Active', 'Disabled', 'Archived']}
            variant="form"
            error={!!validationErrors.status}
            disabled={loading}
            placeholder="Select status"
            ariaLabel="Select admin status"
          />
          {validationErrors.status && (
            <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.status}</p>
          )}
        </div>

        {/* Password Fields (Read-only placeholders) */}
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value="••••••••••••"
            readOnly
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 text-xs cursor-not-allowed"
            placeholder="Password is hidden"
          />
          <p className="mt-0.5 text-[10px] text-gray-500">
            Password cannot be changed in edit mode
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value="••••••••••••"
            readOnly
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 text-xs cursor-not-allowed"
            placeholder="Password is hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#023D7B] border border-transparent rounded-md hover:bg-[#013462] focus:outline-none focus:ring-1 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save size={14} />
                Update Admin
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditAdminModal;
