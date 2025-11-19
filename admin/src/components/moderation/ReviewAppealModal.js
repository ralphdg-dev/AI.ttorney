import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { appealAdminService } from '../../services/appealAdminService';

export default function ReviewAppealModal({ appeal, onClose, onReviewComplete }) {
  const [decision, setDecision] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!decision) {
      setError('Please select a decision (Approve or Reject)');
      return;
    }

    if (decision === 'reject' && !rejectionReason.trim()) {
      setError('Rejection reason is required when rejecting an appeal');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const reviewData = {
        decision,
        admin_notes: adminNotes.trim() || undefined,
        rejection_reason: decision === 'reject' ? rejectionReason.trim() : undefined
      };

      await appealAdminService.reviewAppeal(appeal.id, reviewData);

      alert(`Appeal ${decision === 'approve' ? 'approved' : 'rejected'} successfully!`);
      onReviewComplete();
    } catch (err) {
      console.error('Failed to review appeal:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to review appeal');
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      under_review: { icon: Clock, color: 'bg-blue-100 text-blue-800', text: 'Under Review' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const canReview = appeal.status === 'pending' || appeal.status === 'under_review';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Review Appeal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} />
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Username:</p>
                <p className="font-medium text-gray-900">{appeal.user_username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Email:</p>
                <p className="font-medium text-gray-900">{appeal.user_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Suspension Type:</p>
                <p className="font-medium text-gray-900 capitalize">{appeal.suspension_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Suspension Number:</p>
                <p className="font-medium text-gray-900">#{appeal.suspension_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Appeal Details */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare size={16} />
              Appeal Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Status:</p>
                {getStatusBadge(appeal.status)}
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Submitted:</p>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(appeal.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Appeal Reason:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{appeal.appeal_reason}</p>
              </div>
              {appeal.additional_context && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Additional Context:</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{appeal.additional_context}</p>
                </div>
              )}
            </div>
          </div>

          {/* Existing Review (if already reviewed) */}
          {!canReview && (
            <div className={`rounded-lg p-4 ${appeal.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Review Decision</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Decision:</p>
                  <p className="font-medium text-gray-900 capitalize">{appeal.status}</p>
                </div>
                {appeal.reviewed_at && (
                  <div>
                    <p className="text-gray-600">Reviewed At:</p>
                    <p className="font-medium text-gray-900">{formatDate(appeal.reviewed_at)}</p>
                  </div>
                )}
                {appeal.rejection_reason && (
                  <div>
                    <p className="text-gray-600">Rejection Reason:</p>
                    <p className="font-medium text-gray-900">{appeal.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Form (only if pending/under_review) */}
          {canReview && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Decision</h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Decision Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decision *
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDecision('approve')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        decision === 'approve'
                          ? 'border-green-600 bg-green-50 text-green-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                      }`}
                      disabled={submitting}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle size={20} />
                        <span className="font-semibold">Approve</span>
                      </div>
                      <p className="text-xs mt-1">Lift suspension immediately</p>
                    </button>

                    <button
                      onClick={() => setDecision('reject')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        decision === 'reject'
                          ? 'border-red-600 bg-red-50 text-red-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                      }`}
                      disabled={submitting}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <XCircle size={20} />
                        <span className="font-semibold">Reject</span>
                      </div>
                      <p className="text-xs mt-1">Keep suspension active</p>
                    </button>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows="3"
                    placeholder="Internal notes for other admins (not shown to user)..."
                    disabled={submitting}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{adminNotes.length}/1000 characters</p>
                </div>

                {/* Rejection Reason (only if rejecting) */}
                {decision === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason * <span className="text-xs text-gray-500">(Shown to user)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      rows="3"
                      placeholder="Explain why the appeal is being rejected..."
                      disabled={submitting}
                      maxLength={500}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{rejectionReason.length}/500 characters</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            {canReview ? 'Cancel' : 'Close'}
          </button>
          
          {canReview && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={submitting || !decision}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
