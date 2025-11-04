import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal"; // Fixed path
import Tooltip from "../../components/ui/Tooltip"; // Fixed path
import {
  User,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";

import DataTable from "../../components/ui/DataTable";
import Pagination from "../../components/ui/Pagination";
import ListToolbar from "../../components/ui/ListToolbar";

const ManageAppeals = () => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Appeals");
  const [sortBy, setSortBy] = useState("Newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Appeal review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [reviewAction, setReviewAction] = useState(""); // 'approve', 'reject'
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Appeal details modal
  const [showAppealDetailsModal, setShowAppealDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest(".dropdown-container")) {
        setOpenDropdown(null);
        setDropdownPosition({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  useEffect(() => {
    fetchAppeals();
  }, [searchTerm, statusFilter, sortBy, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, sortBy]);

  // Mock data for appeals - replace this with actual API call
  const fetchAppeals = async () => {
    try {
      setLoading(true);

      // Mock data - replace with actual API call
      const mockAppeals = [
        {
          id: 1,
          user_id: 12345,
          suspension_id: 1001,
          appeal_reason:
            "I believe my suspension was a misunderstanding. I was not aware of the community guidelines violation.",
          additional_context:
            "This is my first offense and I have been a loyal user for 2 years.",
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
          admin_notes: null,
          rejection_reason: null,
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          user_id: 12346,
          suspension_id: 1002,
          appeal_reason:
            "The content was posted by someone who had access to my account.",
          additional_context:
            "I have since changed my password and enabled 2FA.",
          status: "approved",
          reviewed_by: "Admin User",
          reviewed_at: "2024-01-16T14:20:00Z",
          admin_notes:
            "User provided sufficient evidence of account compromise.",
          rejection_reason: null,
          created_at: "2024-01-14T09:15:00Z",
        },
        {
          id: 3,
          user_id: 12347,
          suspension_id: 1003,
          appeal_reason:
            "I apologize for my behavior and promise to follow guidelines in the future.",
          additional_context: "I was having a bad day and reacted poorly.",
          status: "rejected",
          reviewed_by: "Admin User",
          reviewed_at: "2024-01-16T16:45:00Z",
          admin_notes: "User has multiple previous violations.",
          rejection_reason:
            "Previous violations indicate pattern of behavior. Suspension stands.",
          created_at: "2024-01-13T11:20:00Z",
        },
      ];

      // Filter based on status
      let filteredAppeals = mockAppeals;
      if (statusFilter !== "All Appeals") {
        filteredAppeals = mockAppeals.filter(
          (appeal) =>
            appeal.status === statusFilter.toLowerCase().replace(" ", "_")
        );
      }

      // Search filter
      if (searchTerm) {
        filteredAppeals = filteredAppeals.filter(
          (appeal) =>
            appeal.appeal_reason
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            appeal.additional_context
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            appeal.user_id.toString().includes(searchTerm)
        );
      }

      // Sort
      const sortedAppeals = [...filteredAppeals].sort((a, b) => {
        switch (sortBy) {
          case "Oldest":
            return new Date(a.created_at) - new Date(b.created_at);
          case "User A-Z":
            return a.user_id - b.user_id;
          case "User Z-A":
            return b.user_id - a.user_id;
          case "Newest":
          default:
            return new Date(b.created_at) - new Date(a.created_at);
        }
      });

      // Pagination
      const startIndex = (currentPage - 1) * 10;
      const paginatedAppeals = sortedAppeals.slice(startIndex, startIndex + 10);

      setAppeals(paginatedAppeals);
      setPagination({
        page: currentPage,
        limit: 10,
        total: filteredAppeals.length,
        pages: Math.ceil(filteredAppeals.length / 10),
      });
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch appeals");
      console.error("Error fetching appeals:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      handlePageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      handlePageChange(pagination.page + 1);
    }
  };

  const handleAppealReview = async () => {
    if (!selectedAppeal || !reviewAction) return;

    try {
      setProcessing(true);

      console.log("Appeal review:", {
        appealId: selectedAppeal.id,
        action: reviewAction,
        adminNotes,
        rejectionReason,
      });

      // Simulate API call - replace with actual appealsService calls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state for demo purposes
      setAppeals((prevAppeals) =>
        prevAppeals.map((appeal) =>
          appeal.id === selectedAppeal.id
            ? {
                ...appeal,
                status:
                  reviewAction === "approve"
                    ? "approved"
                    : reviewAction === "reject"
                    ? "rejected"
                    : "pending",
                reviewed_by: "Current Admin",
                reviewed_at: new Date().toISOString(),
                admin_notes: adminNotes,
                rejection_reason:
                  reviewAction === "reject"
                    ? rejectionReason
                    : appeal.rejection_reason,
              }
            : appeal
        )
      );

      // Close modal and reset state
      setShowReviewModal(false);
      setSelectedAppeal(null);
      setReviewAction("");
      setAdminNotes("");
      setRejectionReason("");

      setError(null);
    } catch (err) {
      setError(err.message || "Failed to process appeal");
      console.error("Error reviewing appeal:", err);
    } finally {
      setProcessing(false);
    }
  };

  const openReviewModal = (appeal, action) => {
    setSelectedAppeal(appeal);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  // Smart dropdown positioning to prevent off-screen dropdowns
  const handleDropdownToggle = (appealId, event) => {
    if (openDropdown === appealId) {
      setOpenDropdown(null);
      setDropdownPosition({});
      return;
    }

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const dropdownHeight = 200;
    const dropdownWidth = 192;

    const tableRow = button.closest("tr");
    const tableBody = tableRow?.closest("tbody");
    const allRows = tableBody?.querySelectorAll("tr") || [];
    const rowIndex = Array.from(allRows).indexOf(tableRow);
    const totalRows = allRows.length;

    const isBottomTwoRows = rowIndex >= totalRows - 2;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    let position = {};
    const useLeftSide = spaceLeft > dropdownWidth + 8;
    const useTopPosition = !isBottomTwoRows;

    if (useLeftSide) {
      if (useTopPosition) {
        position = {
          top: "0",
          right: "100%",
          marginRight: "4px",
        };
      } else {
        position = {
          bottom: "0",
          right: "100%",
          marginRight: "4px",
        };
      }
    } else {
      if (useTopPosition) {
        position = {
          top: "0",
          left: "100%",
          marginLeft: "4px",
        };
      } else {
        position = {
          bottom: "0",
          left: "100%",
          marginLeft: "4px",
        };
      }
    }

    setDropdownPosition(position);
    setOpenDropdown(appealId);
  };

  const openAppealDetailsModal = async (appeal) => {
    setSelectedAppeal(appeal);
    setShowAppealDetailsModal(true);
    setLoadingDetails(true);

    try {
      // Simulate loading additional details
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error fetching appeal details:", error);
      setError("Failed to load appeal details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "No date available";
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Pending Review
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            Unknown
          </span>
        );
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "No content";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // DataTable columns configuration
  const columns = [
    {
      key: "user_id",
      header: "USER ID",
      render: (appeal) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              User #{appeal.user_id}
            </div>
            <div className="text-xs text-gray-500">
              Suspension #{appeal.suspension_id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "appeal_reason",
      header: "APPEAL REASON",
      render: (appeal) => (
        <Tooltip
          content={appeal.appeal_reason || "No reason provided"}
          placement="top"
        >
          <div className="max-w-xs">
            <div className="text-sm text-gray-900 truncate">
              {truncateText(appeal.appeal_reason, 60)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      key: "additional_context",
      header: "ADDITIONAL CONTEXT",
      render: (appeal) => (
        <Tooltip
          content={appeal.additional_context || "No additional context"}
          placement="top"
        >
          <div className="max-w-xs">
            <div className="text-sm text-gray-600 truncate">
              {truncateText(appeal.additional_context, 40)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (appeal) => getStatusBadge(appeal.status),
    },
    {
      key: "reviewed_by",
      header: "REVIEWED BY",
      render: (appeal) => (
        <div className="text-sm text-gray-900">
          {appeal.reviewed_by || "Not reviewed"}
        </div>
      ),
    },
    {
      key: "reviewed_at",
      header: "REVIEWED AT",
      render: (appeal) => (
        <div className="text-sm text-gray-900">
          {appeal.reviewed_at ? formatDate(appeal.reviewed_at) : "Not reviewed"}
        </div>
      ),
    },
    {
      key: "admin_notes",
      header: "ADMIN NOTES",
      render: (appeal) => (
        <Tooltip
          content={appeal.admin_notes || "No admin notes"}
          placement="top"
        >
          <div className="max-w-xs">
            <div className="text-sm text-gray-600 truncate">
              {truncateText(appeal.admin_notes, 40)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      key: "rejection_reason",
      header: "REJECTION REASON",
      render: (appeal) => (
        <Tooltip
          content={appeal.rejection_reason || "Not rejected"}
          placement="top"
        >
          <div className="max-w-xs">
            <div className="text-sm text-gray-600 truncate">
              {truncateText(appeal.rejection_reason, 40)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (appeal) => (
        <div className="flex justify-center">
          <div className="relative dropdown-container">
            <button
              onClick={(e) => handleDropdownToggle(appeal.id, e)}
              className={`flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 rounded-full transition-all duration-200 ${
                openDropdown === appeal.id ? "bg-gray-200" : "hover:bg-gray-100"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {openDropdown === appeal.id && (
              <div
                className="absolute w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]"
                style={dropdownPosition}
              >
                <div className="py-2">
                  {/* View Details - Always available */}
                  <button
                    onClick={() => {
                      openAppealDetailsModal(appeal);
                      setOpenDropdown(null);
                      setDropdownPosition({});
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-3 text-gray-500" />
                      <span>View Details</span>
                    </div>
                  </button>

                  {/* Status-specific actions */}
                  {appeal.status?.toLowerCase() === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          openReviewModal(appeal, "approve");
                          setOpenDropdown(null);
                          setDropdownPosition({});
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-3 text-green-500" />
                          <span>Approve Appeal</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          openReviewModal(appeal, "reject");
                          setOpenDropdown(null);
                          setDropdownPosition({});
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <XCircle className="w-4 h-4 mr-3 text-red-500" />
                          <span>Reject Appeal</span>
                        </div>
                      </button>
                    </>
                  )}

                  {(appeal.status?.toLowerCase() === "approved" ||
                    appeal.status?.toLowerCase() === "rejected") && (
                    <button
                      onClick={() => {
                        openReviewModal(appeal, "reopen");
                        setOpenDropdown(null);
                        setDropdownPosition({});
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-3 text-blue-500" />
                        <span>Reopen Appeal</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
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
            <h2 className="text-[12px] font-semibold text-gray-900">
              Manage Appeals
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Review and manage user suspension appeals.
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
          filter={{
            value: statusFilter,
            onChange: (value) => {
              console.log("Filter changed to:", value);
              setStatusFilter(value);
            },
            options: ["All Appeals", "Pending Review", "Approved", "Rejected"],
            label: "Filter appeals",
          }}
          sort={{
            value: sortBy,
            onChange: (value) => {
              console.log("Sort changed to:", value);
              setSortBy(value);
            },
            options: ["Newest", "Oldest", "User A-Z", "User Z-A"],
            label: "Sort by",
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Appeals Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading appeals...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={appeals}
            rowKey={(row) => row.id}
            dense
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No appeals found matching your criteria.</p>
              </div>
            }
          />

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              {/* Pagination Info */}
              <div className="text-xs text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} appeals
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={handlePrevPage}
                  disabled={pagination.page <= 1}
                  className="flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(pagination.pages, 5) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1.5 text-xs border rounded-md ${
                            pagination.page === pageNum
                              ? "bg-[#023D7B] text-white border-[#023D7B]"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNextPage}
                  disabled={pagination.page >= pagination.pages}
                  className="flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Next
                  <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedAppeal && (
        <Modal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title={
            reviewAction === "approve"
              ? "Approve Appeal"
              : reviewAction === "reject"
              ? "Reject Appeal"
              : "Reopen Appeal"
          }
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Appeal Details:</p>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="font-medium text-sm">
                  User #{selectedAppeal.user_id} - Suspension #
                  {selectedAppeal.suspension_id}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>Reason:</strong>{" "}
                  {truncateText(selectedAppeal.appeal_reason, 100)}
                </p>
              </div>
            </div>

            {reviewAction === "approve" && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">
                        Approve Appeal
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        User's suspension will be lifted and they will regain
                        access to the platform.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional):
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter any additional notes about this approval..."
                  />
                </div>
              </>
            )}

            {reviewAction === "reject" && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">
                        Reject Appeal
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        User's suspension will remain in effect. The rejection
                        reason will be visible to the user.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (Required):
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter reason for rejecting this appeal..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Notes (Optional):
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter any internal notes..."
                  />
                </div>
              </>
            )}

            {reviewAction === "reopen" && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">
                        Reopen Appeal
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        This appeal will be reopened for review and moved back
                        to pending status.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reopening Reason (Required):
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter reason for reopening this appeal..."
                    required
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleAppealReview}
                disabled={
                  processing ||
                  (reviewAction === "reject" && !rejectionReason.trim()) ||
                  (reviewAction === "reopen" && !adminNotes.trim())
                }
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  reviewAction === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : reviewAction === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {processing
                  ? "Processing..."
                  : reviewAction === "approve"
                  ? "Approve Appeal"
                  : reviewAction === "reject"
                  ? "Reject Appeal"
                  : "Reopen Appeal"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Appeal Details Modal */}
      <Modal
        open={showAppealDetailsModal}
        onClose={() => setShowAppealDetailsModal(false)}
        title="Appeal Details"
        width="max-w-4xl"
      >
        {selectedAppeal && (
          <div className="space-y-4">
            {/* Appeal Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Appeal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] text-gray-500">User ID</div>
                  <div className="text-xs font-medium text-gray-900">
                    #{selectedAppeal.user_id}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Suspension ID</div>
                  <div className="text-xs font-medium text-gray-900">
                    #{selectedAppeal.suspension_id}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Status</div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedAppeal.status)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Submitted</div>
                  <div className="text-xs text-gray-700">
                    {formatDate(selectedAppeal.created_at)}
                  </div>
                </div>
                {selectedAppeal.reviewed_by && (
                  <div>
                    <div className="text-[9px] text-gray-500">Reviewed By</div>
                    <div className="text-xs font-medium text-gray-900">
                      {selectedAppeal.reviewed_by}
                    </div>
                  </div>
                )}
                {selectedAppeal.reviewed_at && (
                  <div>
                    <div className="text-[9px] text-gray-500">Reviewed At</div>
                    <div className="text-xs text-gray-700">
                      {formatDate(selectedAppeal.reviewed_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Appeal Content */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-900 mb-2">
                    Appeal Reason
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-md border">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedAppeal.appeal_reason || "No reason provided"}
                    </p>
                  </div>
                </div>

                {selectedAppeal.additional_context && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-2">
                      Additional Context
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedAppeal.additional_context}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAppeal.admin_notes && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-2">
                      Admin Notes
                    </h4>
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedAppeal.admin_notes}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAppeal.rejection_reason && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-2">
                      Rejection Reason
                    </h4>
                    <div className="bg-red-50 p-3 rounded-md border border-red-200">
                      <p className="text-sm text-red-700 whitespace-pre-wrap">
                        {selectedAppeal.rejection_reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageAppeals;
