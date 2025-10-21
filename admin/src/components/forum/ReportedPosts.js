import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, CheckCircle, XCircle, Calendar, User, MessageSquare, Search } from 'lucide-react';
import forumManagementService from '../../services/forumManagementService';
import DataTable from '../ui/DataTable';
import Pagination from '../ui/Pagination';
import Tooltip from '../ui/Tooltip';

const ReportedPosts = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Resolution modal
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending Reports' },
    { value: 'resolved', label: 'Resolved Reports' },
    { value: 'all', label: 'All Reports' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchReports();
  }, [searchTerm, statusFilter, categoryFilter, sortBy, sortOrder, currentPage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching reports with params:', {
        page: currentPage,
        limit: 20,
        status: statusFilter,
        category: categoryFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const response = await forumManagementService.getReportedPosts({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        category: categoryFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      console.log('Reports response:', response);
      setReports(response.data || []);
      setPagination(response.pagination || {});
      setError(null);
    } catch (err) {
      console.error('Detailed error fetching reports:', err);
      setError(`Failed to fetch reports: ${err.message}`);
      setReports([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport || !resolutionAction) return;

    try {
      setResolving(true);
      await forumManagementService.resolveReport(
        selectedReport.id,
        resolutionAction,
        resolutionNotes
      );
      
      // Refresh the reports list
      await fetchReports();
      
      // Close modal and reset state
      setShowResolutionModal(false);
      setSelectedReport(null);
      setResolutionAction('');
      setResolutionNotes('');
    } catch (err) {
      setError(err.message);
      console.error('Error resolving report:', err);
    } finally {
      setResolving(false);
    }
  };

  const openResolutionModal = (report, action) => {
    setSelectedReport(report);
    setResolutionAction(action);
    setShowResolutionModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityColor = (category) => {
    const priorityColors = {
      harassment: 'text-red-600',
      inappropriate: 'text-red-500',
      spam: 'text-orange-500',
      misinformation: 'text-purple-600',
      off_topic: 'text-blue-500',
      other: 'text-gray-500'
    };
    return priorityColors[category] || 'text-gray-500';
  };

  // DataTable columns configuration
  const columns = [
    {
      key: 'report_details',
      header: 'REPORT DETAILS',
      render: (report) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <AlertTriangle className={`w-4 h-4 mr-2 ${getPriorityColor(report.category)}`} />
            <span className="text-sm font-medium text-gray-900">
              {forumManagementService.getReportCategoryDisplayName(report.category)}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {report.reason}
          </p>
          {report.reason_context && (
            <p className="text-xs text-gray-500 italic">
              "{report.reason_context}"
            </p>
          )}
        </div>
      )
    },
    {
      key: 'reported_post',
      header: 'REPORTED POST',
      render: (report) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 truncate">
            {report.post ? 
              forumManagementService.formatPostContent(report.post.content, 60) :
              'Post not available'
            }
          </p>
          {report.post && (
            <p className="text-xs text-gray-500 mt-1">
              by {forumManagementService.formatUserDisplay(report.post.user, report.post.is_anonymous)}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'reporter',
      header: 'REPORTER',
      render: (report) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {report.reporter ? 
              (report.reporter.full_name || report.reporter.email) :
              'Unknown'
            }
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (report) => getStatusBadge(report.status)
    },
    {
      key: 'reported_at',
      header: 'REPORTED',
      render: (report) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(report.created_at)}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'center',
      render: (report) => (
        <div className="flex space-x-2 justify-center">
          <Tooltip content="View Details" placement="top">
            <button
              onClick={() => openResolutionModal(report, 'view')}
              className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Tooltip>
          
          {report.status === 'pending' && (
            <>
              <Tooltip content="Dismiss Report" placement="top">
                <button
                  onClick={() => openResolutionModal(report, 'dismiss')}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Mark Action Taken" placement="top">
                <button
                  onClick={() => openResolutionModal(report, 'action_taken')}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reported Posts</h1>
          <p className="text-gray-600">Review and resolve user reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="submitted_at">Report Date</option>
            <option value="reason">Report Reason</option>
          </select>
          
          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Reports Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={reports}
            keyField="id"
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No reports found matching your criteria.</p>
              </div>
            }
          />
          
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={20}
              onPageChange={setCurrentPage}
              itemName="reports"
            />
          )}
        </>
      )}

      {/* Resolution Modal */}
      {showResolutionModal && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {resolutionAction === 'view' ? 'Report Details' : 
                 resolutionAction === 'dismiss' ? 'Dismiss Report' : 'Mark Action Taken'}
              </h3>
              
              <div className="mb-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Report Category:</p>
                  <p className="text-sm font-medium">
                    {forumManagementService.getReportCategoryDisplayName(selectedReport.category)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reason:</p>
                  <p className="text-sm">{selectedReport.reason}</p>
                </div>

                {selectedReport.reason_context && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Additional Context:</p>
                    <p className="text-sm italic">"{selectedReport.reason_context}"</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Reported Post:</p>
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    {selectedReport.post ? selectedReport.post.content : 'Post not available'}
                  </div>
                </div>
              </div>

              {resolutionAction !== 'view' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Notes:
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter notes about your decision..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowResolutionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                
                {resolutionAction !== 'view' && (
                  <button
                    onClick={handleResolveReport}
                    disabled={resolving}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      resolutionAction === 'dismiss' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {resolving ? 'Processing...' : 
                     resolutionAction === 'dismiss' ? 'Dismiss Report' : 'Mark Action Taken'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportedPosts;
