import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { Save, X } from 'lucide-react';

const EditTermModal = ({ open, onClose, onSave, term }) => {
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
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [translating, setTranslating] = useState(false);

  // Initialize form with term data when modal opens
  useEffect(() => {
    if (open && term) {
      const initialData = {
        term_en: term.term_en || '',
        term_fil: term.term_fil || '',
        definition_en: term.definition_en || '',
        definition_fil: term.definition_fil || '',
        example_en: term.example_en || '',
        example_fil: term.example_fil || '',
        category: term.category || '',
        is_verified: term.is_verified || false
      };
      setFormData(initialData);
      setOriginalData(initialData);
      setError(null);
      setValidationErrors({});
      setLoading(false);
    }
  }, [open, term]);

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
      setOriginalData({});
      setError(null);
      setValidationErrors({});
      setLoading(false);
    }
  }, [open]);

  const translateText = async (text, targetLang) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    const data = await res.json();
    return data.translation;
  };

  const handleAutoTranslate = async () => {
    setTranslating(true);
    try {
      const next = { ...formData };
      // Terms
      if (formData.term_en && !formData.term_fil) {
        next.term_fil = await translateText(formData.term_en, 'fil');
      } else if (!formData.term_en && formData.term_fil) {
        next.term_en = await translateText(formData.term_fil, 'en');
      }
      // Definitions
      if (formData.definition_en && !formData.definition_fil) {
        next.definition_fil = await translateText(formData.definition_en, 'fil');
      } else if (!formData.definition_en && formData.definition_fil) {
        next.definition_en = await translateText(formData.definition_fil, 'en');
      }
      // Examples
      if (formData.example_en && !formData.example_fil) {
        next.example_fil = await translateText(formData.example_en, 'fil');
      } else if (!formData.example_en && formData.example_fil) {
        next.example_en = await translateText(formData.example_fil, 'en');
      }
      setFormData(next);
    } catch (e) {
      setError(e.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  // Category options matching the database enum
  const categoryOptions = ['Family', 'Criminal', 'Civil', 'Labor', 'Consumer'];

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // English term validation (required)
    if (!formData.term_en.trim()) {
      errors.term_en = 'English term is required';
    } else if (formData.term_en.trim().length < 2) {
      errors.term_en = 'English term must be at least 2 characters';
    }

    // Filipino term validation (required)
    if (!formData.term_fil.trim()) {
      errors.term_fil = 'Filipino term is required';
    } else if (formData.term_fil.trim().length < 2) {
      errors.term_fil = 'Filipino term must be at least 2 characters';
    }

    // English definition validation (required)
    if (!formData.definition_en.trim()) {
      errors.definition_en = 'English definition is required';
    } else if (formData.definition_en.trim().length < 2) {
      errors.definition_en = 'English definition must be at least 2 characters';
    }

    // Filipino definition validation (required)
    if (!formData.definition_fil.trim()) {
      errors.definition_fil = 'Filipino definition is required';
    } else if (formData.definition_fil.trim().length < 2) {
      errors.definition_fil = 'Filipino definition must be at least 2 characters';
    }

    // English example validation (required)
    if (!formData.example_en.trim()) {
      errors.example_en = 'English example is required';
    } else if (formData.example_en.trim().length < 2) {
      errors.example_en = 'English example must be at least 2 characters';
    }

    // Filipino example validation (required)
    if (!formData.example_fil.trim()) {
      errors.example_fil = 'Filipino example is required';
    } else if (formData.example_fil.trim().length < 2) {
      errors.example_fil = 'Filipino example must be at least 2 characters';
    }

    // Category validation (required)
    if (!formData.category) {
      errors.category = 'Category is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Detect changes between original and current form data
  const detectChanges = () => {
    const changes = {};
    
    Object.keys(formData).forEach(key => {
      const originalValue = originalData[key] || '';
      const currentValue = formData[key] || '';
      
      // Handle different field types
      if (key === 'is_verified') {
        if (originalData[key] !== formData[key]) {
          changes['Verification Status'] = {
            from: originalData[key] ? 'Verified' : 'Unverified',
            to: formData[key] ? 'Verified' : 'Unverified'
          };
        }
      } else if (key === 'category') {
        if (originalValue !== currentValue) {
          changes['Category'] = {
            from: originalValue ? originalValue.charAt(0).toUpperCase() + originalValue.slice(1) : 'Not set',
            to: currentValue ? currentValue.charAt(0).toUpperCase() + currentValue.slice(1) : 'Not set'
          };
        }
      } else {
        // Handle text fields
        const fieldNames = {
          term_en: 'English Term',
          term_fil: 'Filipino Term',
          definition_en: 'Definition (English)',
          definition_fil: 'Definition (Filipino)',
          example_en: 'Example (English)',
          example_fil: 'Example (Filipino)'
        };
        
        if (originalValue !== currentValue) {
          changes[fieldNames[key]] = {
            from: originalValue || 'Not set',
            to: currentValue || 'Not set'
          };
        }
      }
    });
    
    return changes;
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
    
    // Detect changes
    const changes = detectChanges();
    
    // If no changes, show warning
    if (Object.keys(changes).length === 0) {
      setError('No changes detected');
      return;
    }
    
    // Get current admin user info
    const currentAdmin = JSON.parse(localStorage.getItem('admin_user') || '{}');
    
    // Prepare updated term data
    const updatedTermData = {
      ...formData,
      term_en: formData.term_en.trim(),
      term_fil: formData.term_fil.trim() || null,
      definition_en: formData.definition_en.trim() || null,
      definition_fil: formData.definition_fil.trim() || null,
      example_en: formData.example_en.trim() || null,
      example_fil: formData.example_fil.trim() || null,
      category: formData.category.toLowerCase(),
      verified_by: formData.is_verified ? (currentAdmin.full_name || currentAdmin.email || 'Admin') : null
    };
    
    // Call the onSave callback with both updated and original data for change comparison
    onSave(updatedTermData, originalData, term);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={`Edit Glossary Term: ${term?.term_en || ''}`}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Auto Translate Button */}
        <div>
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={translating}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-60"
          >
            {translating ? 'Translating...' : 'Auto Translate'}
          </button>
        </div>
        
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
            Check this box to mark the term as verified
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
    </Modal>
  );
};

export default EditTermModal;
