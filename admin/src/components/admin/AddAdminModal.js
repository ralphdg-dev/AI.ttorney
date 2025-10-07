import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Save, X, Eye, EyeOff } from 'lucide-react';
import adminManagementService from '../../services/adminManagementService';

const AddAdminModal = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    surname: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: '',
        first_name: '',
        surname: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
        status: 'active'
      });
      setError(null);
      setValidationErrors({});
      setLoading(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowConfirmation(false);
      setConfirmationLoading(false);
    }
  }, [open]);

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // First name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    } else if (formData.first_name.trim().length < 2) {
      errors.first_name = 'First name must be at least 2 characters';
    }

    // Surname validation
    if (!formData.surname.trim()) {
      errors.surname = 'Surname is required';
    } else if (formData.surname.trim().length < 2) {
      errors.surname = 'Surname must be at least 2 characters';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Role validation
    if (!formData.role) {
      errors.role = 'Role is required';
    }

    // Status validation
    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Show confirmation modal instead of directly creating admin
    setShowConfirmation(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setConfirmationLoading(true);
      setError(null);
      
      // Prepare admin data (exclude confirmPassword, combine names)
      const adminData = {
        email: formData.email.trim(),
        full_name: `${formData.first_name.trim()} ${formData.surname.trim()}`,
        password: formData.password,
        role: formData.role,
        status: formData.status
      };
      
      // Call the API to create the admin
      const response = await adminManagementService.createAdmin(adminData);
      
      // Call the onSave callback to refresh the parent component
      if (onSave) {
        onSave(response.data);
      }
      
      // Close both modals
      setShowConfirmation(false);
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to create admin');
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

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Add New Admin"
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
            onChange={handleInputChange}
            className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
              validationErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="admin@example.com"
            disabled={loading}
          />
          {validationErrors.email && (
            <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.email}</p>
          )}
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
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                validationErrors.first_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John"
              disabled={loading}
            />
            {validationErrors.first_name && (
              <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.first_name}</p>
            )}
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
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                validationErrors.surname ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Doe"
              disabled={loading}
            />
            {validationErrors.surname && (
              <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.surname}</p>
            )}
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.role === 'admin' ? 'Admin' : formData.role === 'superadmin' ? 'Superadmin' : ''}
            onChange={(value) => {
              const roleValue = value === 'Admin' ? 'admin' : value === 'Superadmin' ? 'superadmin' : value;
              setFormData(prev => ({ ...prev, role: roleValue }));
              // Clear validation error for this field
              if (validationErrors.role) {
                setValidationErrors(prev => ({ ...prev, role: '' }));
              }
            }}
            options={['Admin', 'Superadmin']}
            variant="form"
            error={!!validationErrors.role}
            disabled={loading}
            placeholder="Select role"
            ariaLabel="Select admin role"
          />
          {validationErrors.role && (
            <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.role}</p>
          )}
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

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 pr-8 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                validationErrors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter secure password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {validationErrors.password && (
            <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.password}</p>
          )}
          <p className="mt-0.5 text-[10px] text-gray-500">
            Must be at least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 pr-8 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Confirm password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.confirmPassword}</p>
          )}
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
                Creating...
              </>
            ) : (
              <>
                <Save size={14} />
                Create Admin
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={showConfirmation}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmCreate}
        title="Create New Admin"
        message={`Are you sure you want to create a new admin account for ${formData.email}? This will send login credentials to the specified email address.`}
        confirmText="Create Admin"
        loading={confirmationLoading}
        type="add"
      />
    </Modal>
  );
};

export default AddAdminModal;
