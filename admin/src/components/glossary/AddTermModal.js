import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Save, X } from 'lucide-react';

const AddTermModal = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    term_en: '',
    term_fil: '',
    definition_en: '',
    definition_fil: '',
    example_en: '',
    example_fil: '',
    category: '',
    is_verified: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        term_en: '',
        term_fil: '',
        definition_en: '',
        definition_fil: '',
        example_en: '',
        example_fil: '',
        category: '',
        is_verified: false
      });
      setError(null);
      setValidationErrors({});
      setLoading(false);
      setShowConfirmation(false);
      setConfirmationLoading(false);
    }
  }, [open]);

  // Category options matching the database enum
  const categoryOptions = ['Family', 'Criminal', 'Civil', 'Labor', 'Consumer', 'Others'];

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // English term validation (required)
    if (!formData.term_en.trim()) {
      errors.term_en = 'English term is required';
    } else if (formData.term_en.trim().length < 2) {
      errors.term_en = 'English term must be at least 2 characters';
    }

    // Category validation (required)
    if (!formData.category) {
      errors.category = 'Category is required';
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
    
    // Show confirmation modal instead of directly creating term
    setShowConfirmation(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setConfirmationLoading(true);
      setError(null);
      
      // Get current admin user info
      const currentAdmin = JSON.parse(localStorage.getItem('admin_user') || '{}');
      
      // Prepare term data according to database schema
      const termData = {
        term_en: formData.term_en.trim(),
        term_fil: formData.term_fil.trim() || null,
        definition_en: formData.definition_en.trim() || null,
        definition_fil: formData.definition_fil.trim() || null,
        example_en: formData.example_en.trim() || null,
        example_fil: formData.example_fil.trim() || null,
        category: formData.category.toLowerCase(),
        is_verified: formData.is_verified,
        verified_by: formData.is_verified ? (currentAdmin.full_name || currentAdmin.email || 'Admin') : null
      };
      
      // Call the onSave callback
      await onSave(termData);
      
      // Close both modals
      setShowConfirmation(false);
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to create glossary term');
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
      title="Add New Glossary Term"
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        
        {/* Category - First Row, Full Width */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.category}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, category: value }));
              // Clear validation error for this field
              if (validationErrors.category) {
                setValidationErrors(prev => ({ ...prev, category: '' }));
              }
            }}
            options={categoryOptions}
            variant="form"
            error={!!validationErrors.category}
            disabled={loading}
            placeholder="Select legal category"
            ariaLabel="Select legal category"
          />
          {validationErrors.category && (
            <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.category}</p>
          )}
        </div>

        {/* Terms - Two Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* English Term */}
          <div>
            <label htmlFor="term_en" className="block text-xs font-medium text-gray-700 mb-1">
              English Term <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="term_en"
              name="term_en"
              value={formData.term_en}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                validationErrors.term_en ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter English legal term"
              disabled={loading}
            />
            {validationErrors.term_en && (
              <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.term_en}</p>
            )}
          </div>

          {/* Filipino Term */}
          <div>
            <label htmlFor="term_fil" className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Term
            </label>
            <input
              type="text"
              id="term_fil"
              name="term_fil"
              value={formData.term_fil}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs ${
                validationErrors.term_fil ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter Filipino legal term"
              disabled={loading}
            />
            {validationErrors.term_fil && (
              <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.term_fil}</p>
            )}
          </div>
        </div>

        {/* Definitions - Two Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* English Definition */}
          <div>
            <label htmlFor="definition_en" className="block text-xs font-medium text-gray-700 mb-1">
              English Definition
            </label>
            <textarea
              id="definition_en"
              name="definition_en"
              value={formData.definition_en}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs resize-none ${
                validationErrors.definition_en ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter English definition"
              disabled={loading}
            />
            {validationErrors.definition_en && (
              <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.definition_en}</p>
            )}
          </div>

          {/* Filipino Definition */}
          <div>
            <label htmlFor="definition_fil" className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Definition
            </label>
            <textarea
              id="definition_fil"
              name="definition_fil"
              value={formData.definition_fil}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs resize-none ${
                validationErrors.definition_fil ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter Filipino definition"
              disabled={loading}
            />
            {validationErrors.definition_fil && (
              <p className="mt-0.5 text-[10px] text-red-600">{validationErrors.definition_fil}</p>
            )}
          </div>
        </div>

        {/* Example Fields */}
        <div className="grid grid-cols-2 gap-2">
          {/* Example English */}
          <div>
            <label htmlFor="example_en" className="block text-xs font-medium text-gray-700 mb-1">
              Example (English)
            </label>
            <textarea
              id="example_en"
              name="example_en"
              value={formData.example_en}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs resize-none"
              placeholder="English example"
              disabled={loading}
            />
          </div>

          {/* Example Filipino */}
          <div>
            <label htmlFor="example_fil" className="block text-xs font-medium text-gray-700 mb-1">
              Example (Filipino)
            </label>
            <textarea
              id="example_fil"
              name="example_fil"
              value={formData.example_fil}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B] text-xs resize-none"
              placeholder="Filipino example"
              disabled={loading}
            />
          </div>
        </div>

        {/* Mark as Verified */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_verified}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, is_verified: e.target.checked }));
              }}
              className="h-4 w-4 rounded border-gray-300 text-[#023D7B] focus:ring-[#023D7B] focus:ring-offset-0"
              disabled={loading}
            />
            <span className="text-xs font-medium text-gray-700">
              Mark as Verified
            </span>
          </label>
          <p className="text-[10px] text-gray-500 mt-1 ml-6">
            Check this box to mark the term as verified upon creation
          </p>
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
                Create Term
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
        title="Create New Glossary Term"
        message={`Are you sure you want to create the glossary term "${formData.term_en}"? This will add a new English-Filipino legal term to the database.`}
        confirmText="Create Term"
        loading={confirmationLoading}
        type="add"
      />
    </Modal>
  );
};

export default AddTermModal;
