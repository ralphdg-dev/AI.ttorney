import React, { useState, useEffect } from 'react';
import { appealAdminService } from '../../services/appealAdminService';
import { Clock, CheckCircle, XCircle, Eye, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import ReviewAppealModal from '../../components/moderation/ReviewAppealModal';

export default function ManageAppeals() {
  const [appeals, setAppeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadAppeals();
    loadStats();
  }, [statusFilter]);

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const response = await appealAdminService.getAppeals(statusFilter);
      setAppeals(response.data || []);
    } catch (error) {
      console.error('Failed to load appeals:', error);
      alert('Failed to load appeals: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await appealAdminService.getStats();
      setStats(response.data || {});
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleReview = (appeal) => {
    setSelectedAppeal(appeal);
    setShowReviewModal(true);
  };

  const handleReviewComplete = async () => {
    setShowReviewModal(false);
    setSelectedAppeal(null);
    await loadAppeals();
    await loadStats();
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

  const getSuspensionTypeBadge = (type) => {
    return type === 'permanent' ? (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
        Permanent
      </span>
    ) : (
      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
        Temporary
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Suspension Appeals</h1>
        <p className="text-sm text-gray-600">Review and manage user appeals for suspensions</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
              </div>
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Under Review</p>
                <p className="text-2xl font-bold text-blue-600">{stats.under_review || 0}</p>
              </div>
              <Clock className="text-blue-600" size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved || 0}</p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
              </div>
              <XCircle className="text-red-600" size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
              <MessageSquare className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({stats?.pending || 0})
          </button>
          <button
            onClick={() => setStatusFilter('under_review')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === 'under_review'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Under Review ({stats?.under_review || 0})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === 'approved'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({stats?.approved || 0})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === 'rejected'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({stats?.rejected || 0})
          </button>
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === null
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({stats?.total || 0})
          </button>
        </div>
      </div>

      {/* Appeals Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : appeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertCircle size={48} className="mb-3 text-gray-400" />
            <p className="text-sm">No appeals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Suspension
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Appeal Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appeals.map((appeal) => (
                  <tr key={appeal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appeal.user_username || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{appeal.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getSuspensionTypeBadge(appeal.suspension_type)}
                        <span className="text-xs text-gray-600">
                          #{appeal.suspension_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {appeal.appeal_reason}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(appeal.status)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">
                        {formatDate(appeal.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReview(appeal)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedAppeal && (
        <ReviewAppealModal
          appeal={selectedAppeal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAppeal(null);
          }}
          onReviewComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}
