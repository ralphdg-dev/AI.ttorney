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
} from "lucide-react";
import forumManagementService from "../../services/forumManagementService";
import DataTable from "../ui/DataTable";
import ListToolbar from "../ui/ListToolbar";
import Pagination from "../ui/Pagination";
import Tooltip from "../ui/Tooltip";

const ReportedPosts = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Resolution modal
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionAction, setResolutionAction] = useState("");
  // ✅ REMOVED: resolutionNotes state
  const [resolving, setResolving] = useState(false);

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
      const response = await forumManagementService.getReportedPosts({
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
      console.error("Error fetching reports:", err);
      setError(`Failed to fetch reports: ${err.message}`);
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
      // ✅ REMOVED: resolutionNotes from the service call
      await forumManagementService.resolveReport(
        selectedReport.id,
        resolutionAction
      );
      await fetchReports();
      closeModal();
    } catch (err) {
      setError(`Failed to resolve report: ${err.message}`);
      console.error("Error resolving report:", err);
    } finally {
      setResolving(false);
    }
  };

  const openResolutionModal = (report, action) => {
    setSelectedReport(report);
    setResolutionAction(action);
    // ✅ REMOVED: setResolutionNotes
    setError(null);
    setShowResolutionModal(true);
  };

  const closeModal = () => {
    setShowResolutionModal(false);
    setSelectedReport(null);
    setResolutionAction("");
    // ✅ REMOVED: setResolutionNotes
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
    if (resolutionAction === "view") return "View Report Details";
    if (resolutionAction === "dismiss") return "Dismiss Report";
    if (resolutionAction === "sanctioned")
      return "Mark Action Taken (Sanctioned)";
    return "Resolve Report";
  };

  const columns = [
    {
      key: "report_details",
      header: "REPORT DETAILS",
      render: (report) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">
              {forumManagementService.getReportCategoryDisplayName(
                report.reason
              )}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "reported_post",
      header: "REPORTED POST",
      render: (report) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 truncate">
            {report.post?.body || "Post not found or has been deleted"}
          </p>
          {report.post?.user && (
            <p className="text-xs text-gray-500 mt-1">
              by{" "}
              {forumManagementService.formatUserDisplay(
                report.post.user,
                report.post.is_anonymous
              )}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "reporter",
      header: "REPORTER",
      render: (report) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {forumManagementService.formatUserDisplay(report.reporter)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (report) => getStatusBadge(report.status),
    },
    {
      key: "reported_at",
      header: "REPORTED",
      render: (report) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(report.created_at)}
        </div>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (report) => (
        <div className="flex items-center justify-center space-x-2">
          <Tooltip content="View Details" placement="top">
            <button
              onClick={() => openResolutionModal(report, "view")}
              className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Tooltip>

          {report.status === "pending" && (
            <>
              <Tooltip content="Dismiss Report" placement="top">
                <button
                  onClick={() => openResolutionModal(report, "dismiss")}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Mark Action Taken" placement="top">
                <button
                  onClick={() => openResolutionModal(report, "sanctioned")}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reported Posts</h1>
          <p className="text-gray-600">Review and resolve user reports</p>
        </div>
      </div>

      {/* Toolbar */}
      <ListToolbar
        query={searchTerm}
        onQueryChange={setSearchTerm}
        totalText={pagination.total ? `Total Reports: ${pagination.total}` : null}
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

      {error && !showResolutionModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

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
      {showResolutionModal && selectedReport && ReactDOM.createPortal(
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
                    {formatDate(selectedReport.created_at)}
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

              {/* Reported Post Content */}
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">
                  Reported Post Content
                </label>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  <p className="text-gray-800">
                    {selectedReport.post?.body ||
                      "Post not found or has been deleted."}
                  </p>
                  {selectedReport.post && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      Posted by{" "}
                      {forumManagementService.formatUserDisplay(
                        selectedReport.post.user,
                        selectedReport.post.is_anonymous
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ REMOVED: Resolution Notes textarea block */}
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
                  {resolving ? "Confirming..." : "Confirm Action Taken"}
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

export default ReportedPosts;
