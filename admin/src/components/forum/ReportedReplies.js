import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Search,
  X,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import forumManagementService from "../../services/forumManagementService";
import DataTable from "../ui/DataTable";
import ListToolbar from "../ui/ListToolbar";
import Pagination from "../ui/Pagination";
import Tooltip from "../ui/Tooltip";
import ViewReportedReplyModal from "./ViewReportedReplyModal";

// Updated to match reported_replies database schema:
// - Uses submitted_at field for reporting timestamp
// - References forum_replies via reply_id
// - Maintains status: pending, dismissed, sanctioned
const ReportedReplies = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submitted_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Resolution modal
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionAction, setResolutionAction] = useState("");
  const [resolving, setResolving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const statusOptions = [
    { value: "all", label: "All Reports" },
    { value: "pending", label: "Pending Reports" },
    { value: "dismissed", label: "Dismissed Reports" },
    { value: "sanctioned", label: "Sanctioned Reports" },
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "spam", label: "Spam" },
    { value: "harassment", label: "Harassment" },
    { value: "hate_speech", label: "Hate Speech" },
    { value: "misinformation", label: "Misinformation" },
    { value: "inappropriate", label: "Inappropriate Content" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    fetchReports();
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    sortBy,
    sortOrder,
    currentPage,
  ]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await forumManagementService.getReportedReplies({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        category: categoryFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setReports(response.data || []);
      setPagination(response.pagination || {});
      setError(null);
    } catch (err) {
      console.error("Error fetching reply reports:", err);
      setError(`Failed to fetch reply reports: ${err.message}`);
      setReports([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport || !resolutionAction || resolutionAction === "view")
      return;
    try {
      setResolving(true);
      setError(null);
      await forumManagementService.resolveReplyReport(
        selectedReport.id,
        resolutionAction
      );
      await fetchReports();
      closeModal();
    } catch (err) {
      setError(`Failed to resolve reply report: ${err.message}`);
      console.error("Error resolving reply report:", err);
    } finally {
      setResolving(false);
    }
  };

  const openResolutionModal = (report, action) => {
    setSelectedReport(report);
    setResolutionAction(action);
    setError(null);
    
    // If action is 'view', open the ViewReportedReplyModal instead
    if (action === 'view') {
      setShowResolutionModal(true);
    } else {
      setShowResolutionModal(true);
    }
  };

  const closeModal = () => {
    setShowResolutionModal(false);
    setSelectedReport(null);
    setResolutionAction("");
    setError(null);
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      dismissed: { color: "bg-red-100 text-red-800", label: "Dismissed" },
      sanctioned: { color: "bg-green-100 text-green-800", label: "Sanctioned" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status || "Unknown",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getModalTitle = () => {
    if (resolutionAction === "view") return "View Reply Report Details";
    if (resolutionAction === "dismiss") return "Dismiss Reply Report";
    if (resolutionAction === "sanctioned")
      return "Approve Report";
    return "Resolve Reply Report";
  };

  const columns = [
    {
      key: "reply_content",
      header: "Reply Content",
      render: (report) => (
        <div className="max-w-sm">
          <p className="text-xs text-gray-900 line-clamp-2">
            {report.reply?.reply_body || "Reply not found or has been deleted"}
          </p>
        </div>
      ),
    },
    {
      key: "reply_author",
      header: "Reply Author",
      render: (report) => (
        <div>
          {report.reply?.user ? (
            <span className="text-xs text-gray-900">
              {forumManagementService.formatUserDisplay(
                report.reply.user,
                false
              )}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Unknown</span>
          )}
        </div>
      ),
    },
    {
      key: "original_post",
      header: "Original Post",
      render: (report) => (
        <div className="max-w-xs">
          {report.reply?.post ? (
            <p className="text-xs text-gray-600 line-clamp-2">
              {report.reply.post.body}
            </p>
          ) : (
            <span className="text-xs text-gray-400">Not available</span>
          )}
        </div>
      ),
    },
    {
      key: "report_reason",
      header: "Reason",
      render: (report) => (
        <div>
          <span className="text-xs font-medium text-gray-900">
            {forumManagementService.getReportCategoryDisplayName(
              report.reason
            )}
          </span>
        </div>
      ),
    },
    {
      key: "reporter",
      header: "Reported By",
      render: (report) => (
        <div>
          <div className="text-xs text-gray-900 mb-1">
            {forumManagementService.formatUserDisplay(report.reporter)}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(report.submitted_at)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (report) => getStatusBadge(report.status),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (report) => (
        <div className="relative" style={{ position: 'static' }}>
          <button
            onClick={() => setOpenMenuId(openMenuId === report.id ? null : report.id)}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {openMenuId === report.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenMenuId(null)}
              />
              <div className="fixed mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[9999]" style={{ right: '20px' }}>
                <button
                  onClick={() => {
                    openResolutionModal(report, "view");
                    setOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <Eye className="w-4 h-4 mr-3 text-gray-600" />
                  View Details
                </button>

                {report.status === "pending" && (
                  <>
                    <button
                      onClick={() => {
                        openResolutionModal(report, "dismiss");
                        setOpenMenuId(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-3 text-gray-600" />
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => {
                        openResolutionModal(report, "sanctioned");
                        setOpenMenuId(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-3 text-gray-600" />
                      Approve Report
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch">
            <MessageSquare size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Reported Replies</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Review, filter and resolve user reports on forum replies.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      {/* Toolbar */}
      <div className="w-full mb-3">
        <ListToolbar
        query={searchTerm}
        onQueryChange={setSearchTerm}
        totalText={pagination.total ? `Total Reply Reports: ${pagination.total}` : null}
        filter={{
          value: statusOptions.find(s => s.value === statusFilter)?.label || "All Reports",
          onChange: (label) => {
            const status = statusOptions.find(s => s.label === label);
            setStatusFilter(status?.value || "all");
          },
          options: statusOptions.map(s => s.label),
          label: "Status Filter"
        }}
        secondaryFilter={{
          value: categoryOptions.find(c => c.value === categoryFilter)?.label || "All Categories",
          onChange: (label) => {
            const category = categoryOptions.find(c => c.label === label);
            setCategoryFilter(category?.value || "all");
          },
          options: categoryOptions.map(c => c.label),
          label: "Category Filter"
        }}
        />
      </div>

      {error && !showResolutionModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reply reports...</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={reports}
            keyField="id"
            dense
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No reply reports found matching your criteria.</p>
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
              itemName="reply reports"
            />
          )}
        </>
      )}

      {/* View Report Modal */}
      {showResolutionModal && selectedReport && resolutionAction === 'view' && (
        <ViewReportedReplyModal
          open={showResolutionModal}
          onClose={closeModal}
          report={selectedReport}
          loading={false}
        />
      )}

      {/* Resolution Modal */}
      {showResolutionModal && selectedReport && resolutionAction !== 'view' && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {getModalTitle()}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Report Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-600">
                    Reporter
                  </label>
                  <p className="text-gray-800">
                    {forumManagementService.formatUserDisplay(
                      selectedReport.reporter
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-600">
                    Reported On
                  </label>
                  <p className="text-gray-800">
                    {formatDate(selectedReport.submitted_at)}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-gray-600">Reason</label>
                  <p className="text-gray-800 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <strong className="text-yellow-800">
                      {forumManagementService.getReportCategoryDisplayName(
                        selectedReport.reason
                      )}
                    </strong>
                    {selectedReport.reason_context && (
                      <span className="italic">
                        : "{selectedReport.reason_context}"
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Reported Reply Content */}
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">
                  Reported Reply Content
                </label>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  <div className="flex items-center mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Reply</span>
                  </div>
                  <p className="text-gray-800">
                    {selectedReport.reply?.reply_body ||
                      "Reply not found or has been deleted."}
                  </p>
                  {selectedReport.reply && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      Reply by{" "}
                      {forumManagementService.formatUserDisplay(
                        selectedReport.reply.user,
                        false
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Original Post Context */}
              {selectedReport.reply?.post && (
                <div className="space-y-1">
                  <label className="font-semibold text-gray-600">
                    Original Post Context
                  </label>
                  <div className="border rounded-lg p-4 bg-blue-50 max-h-32 overflow-y-auto">
                    <p className="text-gray-800 text-sm">
                      {selectedReport.reply.post.body}
                    </p>
                    {selectedReport.reply.post.user && (
                      <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                        Original post by{" "}
                        {forumManagementService.formatUserDisplay(
                          selectedReport.reply.post.user,
                          selectedReport.reply.post.is_anonymous
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t bg-gray-50 space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {resolutionAction === "view" ? "Close" : "Cancel"}
              </button>

              {resolutionAction === "dismiss" && (
                <button
                  onClick={handleResolveReport}
                  disabled={resolving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
                >
                  {resolving ? "Dismissing..." : "Confirm Dismissal"}
                </button>
              )}

              {resolutionAction === "sanctioned" && (
                <button
                  onClick={handleResolveReport}
                  disabled={resolving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300"
                >
                  {resolving ? "Approving..." : "Approve Report"}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReportedReplies;
