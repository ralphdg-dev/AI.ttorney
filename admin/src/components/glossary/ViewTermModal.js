import React from 'react';
import Modal from '../ui/Modal';
import { Book, Calendar, User, CheckCircle, XCircle, Clock } from 'lucide-react';

const ViewTermModal = ({ open, onClose, term, loading = false }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format category for display
  const formatCategory = (category) => {
    if (!category) return 'N/A';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Render verification status
  const renderVerificationStatus = (isVerified) => {
    if (isVerified === null) {
      return (
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-500" />
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            Pending Review
          </span>
        </div>
      );
    }
    
    const icon = isVerified ? <CheckCircle size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />;
    const styles = isVerified
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200';
    const label = isVerified ? 'Verified' : 'Unverified';
    
    return (
      <div className="flex items-center gap-2">
        {icon}
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles}`}>
          {label}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="View Glossary Term" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading term details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (!term) {
    return (
      <Modal open={open} onClose={onClose} title="View Glossary Term" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Term not found</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="View Glossary Term"
      width="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Header with Term Names */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-blue-600 font-medium mb-1">English Term</div>
              <div className="text-lg font-semibold text-blue-900">
                {term.term_en || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium mb-1">Filipino Term</div>
              <div className="text-lg font-semibold text-blue-900">
                {term.term_fil || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Definitions Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Book size={16} className="text-gray-600" />
            Definitions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 font-medium mb-2">English Definition</div>
              <div className="text-sm text-gray-900">
                {term.definition_en || 'No definition provided'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 font-medium mb-2">Filipino Definition</div>
              <div className="text-sm text-gray-900">
                {term.definition_fil || 'Walang kahulugang ibinigay'}
              </div>
            </div>
          </div>
        </div>

        {/* Examples Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-700 font-medium mb-2">English Example</div>
              <div className="text-sm text-amber-900 italic">
                "{term.example_en || 'No example provided'}"
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-700 font-medium mb-2">Filipino Example</div>
              <div className="text-sm text-amber-900 italic">
                "{term.example_fil || 'Walang halimbawang ibinigay'}"
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Term Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">Category</div>
              <div className="text-sm text-gray-900 font-medium">
                {formatCategory(term.category)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">Verification Status</div>
              <div>
                {renderVerificationStatus(term.is_verified)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <Calendar size={12} />
                Created At
              </div>
              <div className="text-sm text-gray-900">
                {formatDate(term.created_at)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <Calendar size={12} />
                Updated At
              </div>
              <div className="text-sm text-gray-900">
                {formatDate(term.updated_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Info */}
        {term.verified_by && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-green-600" />
              <div className="text-xs text-green-700 font-medium">Verified By</div>
            </div>
            <div className="text-sm text-green-900 font-medium">
              {term.verified_by}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewTermModal;
