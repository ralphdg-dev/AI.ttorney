import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Flag,
  RotateCcw,
  MessageSquare,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  Tag,
} from "lucide-react";
import Tooltip from "../ui/Tooltip";
import ListToolbar from "../ui/ListToolbar";
import forumManagementService from "../../services/forumManagementService";
import Pagination from "../ui/Pagination";

const ManageTopicsThreads = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Moderation modal
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [moderationAction, setModerationAction] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [moderating, setModerating] = useState(false);

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "family", label: "Family Law" },
    { value: "criminal", label: "Criminal Law" },
    { value: "civil", label: "Civil Law" },
    { value: "labor", label: "Labor Law" },
    { value: "other", label: "Other" },
  ];

  const statusOptions = [
    { value: "all", label: "All Posts" },
    { value: "active", label: "Active Posts" },
    { value: "deleted", label: "Deleted Posts" },
    { value: "reported", label: "Reported Posts" },
    { value: "unreported", label: "Unreported Posts" },
  ];

  useEffect(() => {
    // Debounce search term
    const timeoutId = setTimeout(() => {
      fetchPosts();
    }, searchTerm ? 500 : 0); // 500ms delay for search, immediate for other filters

    return () => clearTimeout(timeoutId);
  }, [
    searchTerm,
    categoryFilter,
    statusFilter,
    sortBy,
    sortOrder,
    currentPage,
  ]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Handle combined status filter
      let actualStatus = "all";
      let actualReported = "all";
      
      if (statusFilter === "reported" || statusFilter === "unreported") {
        actualReported = statusFilter;
        actualStatus = "all";
      } else {
        actualStatus = statusFilter;
        actualReported = "all";
      }

      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        category: categoryFilter,
        status: actualStatus,
        reported: actualReported,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await forumManagementService.getForumPosts(params);

      setPosts(response.data || []);

      setPosts(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching posts:", err);
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
      setModerationAction("");
      setModerationReason("");
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error("Error moderating post:", err);
      
      // Check if it's a "post not found" error
      if (err.message.includes("not found") || err.message.includes("404")) {
        setError(`This post no longer exists in the database. The post list will be refreshed.`);
        
        // Refresh the posts list to remove stale entries
        await fetchPosts();
        
        // Close modal since the post doesn't exist
        setShowModerationModal(false);
        setSelectedPost(null);
        setModerationAction("");
        setModerationReason("");
      } else if (err.message.includes("already flagged")) {
        setError(`This post is already flagged by you. Please refresh the page to see the current status.`);
        
        // Refresh the posts list to show current flag status
        await fetchPosts();
        
        // Close modal
        setShowModerationModal(false);
        setSelectedPost(null);
        setModerationAction("");
        setModerationReason("");
      } else {
        setError(`Failed to ${moderationAction} post: ${err.message}`);
      }
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (post) => {
    if (post.is_deleted) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          Deleted
        </span>
      );
    }
    if (post.is_flagged) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Flagged
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Active
      </span>
    );
  };

  const getReportCount = (post) => {
    return post.reports ? post.reports.length : 0;
  };

  // Timeline post component
  const TimelinePost = ({ post }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {forumManagementService.formatUserDisplay(
                post.user,
                post.is_anonymous
              )}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatDate(post.created_at)}</span>
              {post.category_display_name && (
                <>
                  <span>•</span>
                  <Tag className="w-4 h-4" />
                  <span>
                    {post.category_display_name ||
                      forumManagementService.getCategoryDisplayName(
                        post.category_id
                      ) ||
                      "Uncategorized"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {getReportCount(post) > 0 && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {getReportCount(post)}
              </span>
            </div>
          )}
          {getStatusBadge(post)}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-900 leading-relaxed">
          {forumManagementService.formatPostContent(post.content, 300)}
        </p>
      </div>

      {/* Footer with Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <MessageSquare className="w-4 h-4" />
            <span>Post ID: {post.id}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {!post.is_deleted && (
            <>
              <Tooltip content={post.is_flagged ? "Already Flagged" : "Flag Post"} placement="top">
                <button
                  onClick={() => openModerationModal(post, "flag")}
                  disabled={post.is_flagged}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    post.is_flagged
                      ? "text-yellow-600 bg-yellow-50 cursor-not-allowed"
                      : "text-gray-600 hover:text-gray-900 hover:scale-110 hover:bg-gray-50"
                  }`}
                >
                  <Flag className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Delete Post" placement="top">
                <button
                  onClick={() => openModerationModal(post, "delete")}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-gray-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}

          {post.is_deleted && (
            <Tooltip content="Restore Post" placement="top">
              <button
                onClick={() => openModerationModal(post, "restore")}
                className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Community Forum
          </h1>
          <p className="text-gray-600">Monitor and moderate forum posts</p>
        </div>
      </div>

      {/* Toolbar */}
      <ListToolbar
        query={searchTerm}
        onQueryChange={setSearchTerm}
        totalText={pagination.total ? `Total Posts: ${pagination.total}` : null}
        filter={{
          value: categories.find(cat => cat.value === categoryFilter)?.label || "All Categories",
          onChange: (label) => {
            const category = categories.find(cat => cat.label === label);
            setCategoryFilter(category?.value || "all");
          },
          options: categories.map(cat => cat.label),
          label: "Category Filter"
        }}
        secondaryFilter={{
          value: statusOptions.find(status => status.value === statusFilter)?.label || "All Posts",
          onChange: (label) => {
            const status = statusOptions.find(status => status.label === label);
            setStatusFilter(status?.value || "all");
          },
          options: statusOptions.map(status => status.label),
          label: "Status & Reports"
        }}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Posts Timeline */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#023D7B] mx-auto"></div>
          <p className="mt-2 text-[11px] text-gray-500">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No posts found
          </h3>
          <p className="text-gray-500">No posts match your current criteria.</p>
        </div>
      ) : (
        <>
          {/* Timeline Container */}
          <div className="space-y-4">
            {posts.map((post) => (
              <TimelinePost key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={20}
                onPageChange={setCurrentPage}
                itemName="posts"
              />
            </div>
          )}
        </>
      )}

      {/* Moderation Modal */}
      {showModerationModal && selectedPost && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-md shadow-lg border p-5 mx-4 max-h-[90vh] overflow-y-auto" style={{ width: '600px' }}>
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {moderationAction === "view"
                  ? "Post Details"
                  : moderationAction === "delete"
                  ? "Delete Post"
                  : moderationAction === "flag"
                  ? "Flag Post"
                  : "Restore Post"}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Post Content:</p>
                <div className="bg-gray-50 p-3 rounded border text-sm">
                  {selectedPost.content}
                </div>
              </div>

              {moderationAction !== "view" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason{" "}
                    {moderationAction === "restore"
                      ? "(Optional)"
                      : "(Required)"}
                    :
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

                {moderationAction !== "view" && (
                  <button
                    onClick={handleModerationAction}
                    disabled={
                      moderating ||
                      (moderationAction !== "restore" &&
                        !moderationReason.trim())
                    }
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      moderationAction === "delete"
                        ? "bg-red-600 hover:bg-red-700"
                        : moderationAction === "flag"
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {moderating
                      ? "Processing..."
                      : moderationAction === "delete"
                      ? "Delete Post"
                      : moderationAction === "flag"
                      ? "Flag Post"
                      : "Restore Post"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageTopicsThreads;
