import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Trash2, Flag, RotateCcw, MessageSquare, Calendar, User } from 'lucide-react';
import forumManagementService from '../../services/forumManagementService';
import DataTable from '../ui/DataTable';
import Pagination from '../ui/Pagination';

const ManageTopicsThreads = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportedFilter, setReportedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Moderation modal
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [moderationAction, setModerationAction] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [moderating, setModerating] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'family', label: 'Family Law' },
    { value: 'criminal', label: 'Criminal Law' },
    { value: 'civil', label: 'Civil Law' },
    { value: 'labor', label: 'Labor Law' },
    { value: 'corporate', label: 'Corporate Law' },
    { value: 'property', label: 'Property Law' },
    { value: 'tax', label: 'Tax Law' },
    { value: 'constitutional', label: 'Constitutional Law' },
    { value: 'administrative', label: 'Administrative Law' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Posts' },
    { value: 'active', label: 'Active Posts' },
    { value: 'deleted', label: 'Deleted Posts' }
  ];

  const reportedOptions = [
    { value: 'all', label: 'All Posts' },
    { value: 'reported', label: 'Reported Posts' },
    { value: 'unreported', label: 'Unreported Posts' }
  ];

  useEffect(() => {
    fetchPosts();
  }, [searchTerm, categoryFilter, statusFilter, reportedFilter, sortBy, sortOrder, currentPage]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await forumManagementService.getForumPosts({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        category: categoryFilter,
        status: statusFilter,
        reported: reportedFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      setPosts(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async () => {
    if (!selectedPost || !moderationAction) return;

    try {
      setModerating(true);
      await forumManagementService.moderatePost(
        selectedPost.id, 
        moderationAction, 
        moderationReason
      );
      
      // Refresh the posts list
      await fetchPosts();
      
      // Close modal and reset state
      setShowModerationModal(false);
      setSelectedPost(null);
      setModerationAction('');
      setModerationReason('');
    } catch (err) {
      setError(err.message);
      console.error('Error moderating post:', err);
    } finally {
      setModerating(false);
    }
  };

  const openModerationModal = (post, action) => {
    setSelectedPost(post);
    setModerationAction(action);
    setShowModerationModal(true);
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

  const getStatusBadge = (post) => {
    if (post.is_deleted) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Deleted</span>;
    }
    if (post.is_flagged) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Flagged</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
  };

  const getReportCount = (post) => {
    return post.reports ? post.reports.length : 0;
  };

  // DataTable columns configuration
  const columns = [
    {
      key: 'content',
      header: 'POST CONTENT',
      render: (post) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 truncate">
            {forumManagementService.formatPostContent(post.content, 80)}
          </p>
        </div>
      )
    },
    {
      key: 'author',
      header: 'AUTHOR',
      render: (post) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {forumManagementService.formatUserDisplay(post.user, post.is_anonymous)}
          </span>
        </div>
      )
    },
    {
      key: 'category',
      header: 'CATEGORY',
      render: (post) => (
        <span className="text-sm text-gray-900">
          {forumManagementService.getCategoryDisplayName(post.category_id)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (post) => getStatusBadge(post)
    },
    {
      key: 'reports',
      header: 'REPORTS',
      align: 'center',
      render: (post) => (
        <span className={`text-sm font-medium ${getReportCount(post) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {getReportCount(post)}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'CREATED',
      render: (post) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(post.created_at)}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'center',
      render: (post) => (
        <div className="flex space-x-2 justify-center">
          <button
            onClick={() => openModerationModal(post, 'view')}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {!post.is_deleted && (
            <>
              <button
                onClick={() => openModerationModal(post, 'flag')}
                className="text-yellow-600 hover:text-yellow-900"
                title="Flag Post"
              >
                <Flag className="w-4 h-4" />
              </button>
              <button
                onClick={() => openModerationModal(post, 'delete')}
                className="text-red-600 hover:text-red-900"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          
          {post.is_deleted && (
            <button
              onClick={() => openModerationModal(post, 'restore')}
              className="text-green-600 hover:text-green-900"
              title="Restore Post"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Topics & Threads</h1>
          <p className="text-gray-600">Monitor and moderate forum posts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Reported Filter */}
          <select
            value={reportedFilter}
            onChange={(e) => setReportedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {reportedOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div className="flex gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="created_at">Created Date</option>
            <option value="updated_at">Updated Date</option>
          </select>
          
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

      {/* Posts Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading posts...</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={posts}
            keyField="id"
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No posts found matching your criteria.</p>
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
              itemName="posts"
            />
          )}
        </>
      )}

      {/* Moderation Modal */}
      {showModerationModal && selectedPost && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {moderationAction === 'view' ? 'Post Details' : 
                 moderationAction === 'delete' ? 'Delete Post' :
                 moderationAction === 'flag' ? 'Flag Post' : 'Restore Post'}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Post Content:</p>
                <div className="bg-gray-50 p-3 rounded border text-sm">
                  {selectedPost.content}
                </div>
              </div>

              {moderationAction !== 'view' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason {moderationAction === 'restore' ? '(Optional)' : '(Required)'}:
                  </label>
                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter reason for ${moderationAction}...`}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModerationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                
                {moderationAction !== 'view' && (
                  <button
                    onClick={handleModerationAction}
                    disabled={moderating || (moderationAction !== 'restore' && !moderationReason.trim())}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      moderationAction === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                      moderationAction === 'flag' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {moderating ? 'Processing...' : 
                     moderationAction === 'delete' ? 'Delete Post' :
                     moderationAction === 'flag' ? 'Flag Post' : 'Restore Post'}
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

export default ManageTopicsThreads;
