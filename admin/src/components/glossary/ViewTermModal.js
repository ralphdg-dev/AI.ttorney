import React from 'react';
import Modal from '../ui/Modal';
import { CheckCircle, XCircle } from 'lucide-react';

const VerificationStatus = ({ isVerified, verifiedBy }) => {
  if (isVerified === null || isVerified === undefined) {
    return (
      <div className="flex items-center gap-2">
        <XCircle size={14} className="text-gray-400" />
        <span className="text-xs text-gray-700">Not Set</span>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="text-emerald-600" />
        <span className="text-xs text-gray-900">Verified by {verifiedBy || 'Admin'}</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-2">
        <XCircle size={14} className="text-red-600" />
        <span className="text-xs text-gray-900">Not Verified</span>
      </div>
    );
  }
};

const ViewTermModal = ({ open, onClose, term, loading = false }) => {
  // Format category for display
  const formatCategory = (category) => {
    if (!category) return '-';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Get category badge classes
  const getCategoryClasses = (category) => {
    switch ((category || '').toLowerCase()) {
      case 'family':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'civil':
        return 'bg-violet-50 border-violet-200 text-violet-700';
      case 'criminal':
        return 'bg-red-50 border-red-200 text-red-600';
      case 'labor':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'consumer':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'others':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!term && !loading) {
    return (
      <Modal open={open} onClose={() => {}} title="Glossary Term Details" width="max-w-4xl" showCloseButton={false}>
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">Term not found</p>
        </div>
      </Modal>
    );
  }

  if (loading) {
    return (
      <Modal open={open} onClose={() => {}} title="Glossary Term Details" width="max-w-4xl" showCloseButton={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading term details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={open} 
      onClose={() => {}} 
      title="Glossary Term Details"
      width="max-w-4xl"
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Terms and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-[9px] text-gray-500">English Term</div>
            <div className="text-xs font-medium text-gray-900 mt-1">{term.term_en || '-'}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Filipino Term</div>
            <div className="text-xs font-medium text-gray-900 mt-1">{term.term_fil || '-'}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Category</div>
            <div className="mt-1">
              {term.category && (
                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border ${getCategoryClasses(term.category)}`}>
                  {formatCategory(term.category)}
                </span>
              )}
              {!term.category && (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border bg-gray-50 border-gray-200 text-gray-700">
                  -
                </span>
              )}
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Definitions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] text-gray-500 mb-1">English Definition</div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border min-h-[60px]">
              {term.definition_en || 'No definition provided'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 mb-1">Filipino Definition</div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border min-h-[60px]">
              {term.definition_fil || 'Walang kahulugang ibinigay'}
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Examples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] text-gray-500 mb-1">English Example</div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border min-h-[60px]">
              {term.example_en || 'No example provided'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 mb-1">Filipino Example</div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border min-h-[60px]">
              {term.example_fil || 'Walang halimbawang ibinigay'}
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Verification & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[9px] text-gray-500">Verification Status</div>
            <div className="text-xs font-medium text-gray-900">
              <VerificationStatus isVerified={term.is_verified} verifiedBy={term.verified_by} />
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Created Date</div>
            <div className="text-xs text-gray-700">{formatDate(term.created_at)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Last Updated</div>
            <div className="text-xs text-gray-700">{formatDate(term.updated_at)}</div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewTermModal;
