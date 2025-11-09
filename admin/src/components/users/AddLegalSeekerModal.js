import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Save, X, Eye, EyeOff } from 'lucide-react';
import legalSeekerService from '../../services/legalSeekerService';

const AddLegalSeekerModal = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    username: '',
    password: '',
    confirmPassword: '',
    birthdate: '',
    is_verified: false,
    phone_number: '',
    address: ''
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
        full_name: '',
        username: '',
        password: '',
        confirmPassword: '',
        birthdate: '',
        is_verified: false,
        phone_number: '',
        address: ''
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

    // Full name validation
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
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

    // Birthdate validation
    if (!formData.birthdate) {
      errors.birthdate = 'Birthdate is required';
    } else {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 13) {
        errors.birthdate = 'User must be at least 13 years old';
      } else if (age > 120) {
        errors.birthdate = 'Please enter a valid birthdate';
      }
    }

    // Phone number validation (optional but if provided, must be valid)
    if (formData.phone_number && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone_number)) {
      errors.phone_number = 'Please enter a valid phone number';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Show confirmation modal instead of directly creating user
    setShowConfirmation(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setConfirmationLoading(true);
      setError(null);
      
      // Prepare user data (exclude confirmPassword)
      const userData = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        password: formData.password,
        birthdate: formData.birthdate,
        is_verified: formData.is_verified,
        phone_number: formData.phone_number.trim() || null,
        address: formData.address.trim() || null
      };
      
      // Call the API to create the legal seeker
      const response = await legalSeekerService.createLegalSeeker(userData);
      
      // Call the onSave callback to refresh the parent component
      if (onSave) {
        onSave(response.data);
      }
      
      // Close both modals
      setShowConfirmation(false);
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to create legal seeker');
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
      title="Add New Legal Seeker"
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                placeholder="user@example.com"
                disabled={loading}
              />
              {validationErrors.email && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-xs font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.full_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John Doe"
                disabled={loading}
              />
              {validationErrors.full_name && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.full_name}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.username ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="johndoe"
                disabled={loading}
              />
              {validationErrors.username && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.username}</p>
              )}
            </div>

            {/* Birthdate */}
            <div>
              <label htmlFor="birthdate" className="block text-xs font-medium text-gray-700 mb-1">
                Birthdate <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="birthdate"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleInputChange}
                className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.birthdate ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {validationErrors.birthdate && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.birthdate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Phone Number */}
            <div>
              <label htmlFor="phone_number" className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                  validationErrors.phone_number ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
              {validationErrors.phone_number && (
                <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.phone_number}</p>
              )}
            </div>

            {/* Verification Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Verification Status
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_verified"
                  name="is_verified"
                  checked={formData.is_verified}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#023D7B] focus:ring-[#023D7B] border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="is_verified" className="ml-2 text-xs text-gray-700">
                  Mark as verified
                </label>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mt-3">
            <label htmlFor="address" className="block text-xs font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs"
              placeholder="Enter full address"
              disabled={loading}
            />
          </div>
        </div>

        {/* Account Security */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Account Security</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
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
                Create Legal Seeker
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
        title="Create New Legal Seeker"
        message={`Are you sure you want to create a new legal seeker account for ${formData.email}? This will create a new user account with the specified information.`}
        confirmText="Create Legal Seeker"
        loading={confirmationLoading}
        type="add"
      />
    </Modal>
  );
};

export default AddLegalSeekerModal;
