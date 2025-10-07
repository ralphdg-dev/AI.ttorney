import React from 'react';
import Modal from '../ui/Modal';
import { CheckCircle, XCircle } from 'lucide-react';

const ViewTermModal = ({ open, onClose, term, loading = false }) => {
  // Format category for display
  const formatCategory = (category) => {
    if (!category) return 'N/A';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (!term) {
    return (
      <Modal open={open} onClose={onClose} title="View Glossary Term" width="max-w-2xl">
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">Term not found</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="View Glossary Term"
      width="max-w-2xl"
    >
      <div className="space-y-3">
        {/* Category - First Row, Full Width */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900">
            {formatCategory(term.category)}
          </div>
        </div>

        {/* Terms - Two Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* English Term */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              English Term
            </label>
            <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900">
              {term.term_en || 'N/A'}
            </div>
          </div>

          {/* Filipino Term */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Term
            </label>
            <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900">
              {term.term_fil || 'N/A'}
            </div>
          </div>
        </div>

        {/* Definitions - Two Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* English Definition */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              English Definition
            </label>
            <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900 min-h-[60px]">
              {term.definition_en || 'No definition provided'}
            </div>
          </div>

          {/* Filipino Definition */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Definition
            </label>
            <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900 min-h-[60px]">
              {term.definition_fil || 'Walang kahulugang ibinigay'}
            </div>
          </div>
        </div>

        {/* Examples - Two Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* English Example */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              English Example
            </label>
            <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900 min-h-[60px]">
              {term.example_en || 'No example provided'}
            </div>
          </div>

          {/* Filipino Example */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Example
            </label>
            <div className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-900 min-h-[60px]">
              {term.example_fil || 'Walang halimbawang ibinigay'}
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Verification Status
          </label>
          <div className="flex items-center gap-2">
            {term.is_verified ? (
              <>
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified
                </span>
              </>
            ) : (
              <>
                <XCircle size={16} className="text-red-600" />
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  Unverified
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewTermModal;
