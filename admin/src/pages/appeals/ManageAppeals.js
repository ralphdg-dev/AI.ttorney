import React from "react";
import { Book, Eye, CheckCircle, XCircle } from "lucide-react";
import Tooltip from "../../components/ui/Tooltip";
import ListToolbar from "../../components/ui/ListToolbar";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import Pagination from "../../components/ui/Pagination";
import { useToast } from "../../components/ui/Toast";

const ManageAppeals = () => {
  const { showSuccess, showError, ToastContainer } = useToast();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("Newest");
  const [appeals, setAppeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [selectedAppeal, setSelectedAppeal] = React.useState(null);
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: "",
    appealId: null,
    loading: false,
  });

  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Simulated load data (mock)
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // mock example data
      const mockData = [
        {
          id: 1,
          user_id: "USR-101",
          suspension_id: "SUS-202",
          appeals_reason: "Mistaken suspension",
          additional_context: "I was wrongly flagged for spam.",
          status: "pending",
          reviewed_by: "-",
          reviewed_at: null,
          admin_notes: "-",
          rejections_reason: "-",
          created_at: new Date().toISOString(),
        },
      ];

      setAppeals(mockData);
      setPagination((prev) => ({
        ...prev,
        total: mockData.length,
        pages: 1,
      }));
    } catch (err) {
      console.error("Error loading appeals:", err);
      showError(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleView = (appeal) => {
    setSelectedAppeal(appeal);
    showSuccess(`Viewing appeal ID ${appeal.id}`);
  };

  const handleApprove = (appeal) => {
    setConfirmationModal({ open: true, type: "approve", appealId: appeal.id });
  };

  const handleReject = (appeal) => {
    setConfirmationModal({ open: true, type: "reject", appealId: appeal.id });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({
      open: false,
      type: "",
      appealId: null,
      loading: false,
    });
  };

  const confirmAction = async () => {
    const { type } = confirmationModal;
    try {
      setConfirmationModal((prev) => ({ ...prev, loading: true }));
      await new Promise((resolve) => setTimeout(resolve, 500)); // fake delay

      showSuccess(
        `Appeal ${type === "approve" ? "approved" : "rejected"} successfully.`
      );
      closeConfirmationModal();
    } catch (err) {
      console.error("Failed to update appeal:", err);
      showError(err.message);
      setConfirmationModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    }).format(date);
  };

  const renderStatusBadge = (status) => {
    const classes =
      status === "approved"
        ? "bg-green-50 text-green-700 border-green-200"
        : status === "rejected"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-yellow-50 text-yellow-700 border-yellow-200";
    return (
      <span
        className={`px-2 py-1 rounded text-[10px] font-semibold border ${classes}`}
      >
        {status?.toUpperCase() || "PENDING"}
      </span>
    );
  };

  const columns = [
    { key: "user_id", header: "User ID" },
    { key: "suspension_id", header: "Suspension ID" },
    { key: "appeals_reason", header: "Appeal Reason" },
    { key: "additional_context", header: "Additional Context" },
    {
      key: "status",
      header: "Status",
      render: (row) => renderStatusBadge(row.status),
      align: "center",
    },
    { key: "reviewed_by", header: "Reviewed By" },
    {
      key: "reviewed_at",
      header: "Reviewed At",
      render: (row) => formatDate(row.reviewed_at),
    },
    { key: "admin_notes", header: "Admin Notes" },
    { key: "rejections_reason", header: "Rejection Reason" },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex justify-end space-x-2">
          <Tooltip content="View Appeal">
            <button
              className="p-1 rounded hover:bg-gray-100"
              onClick={() => handleView(row)}
            >
              <Eye size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Approve">
            <button
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              onClick={() => handleApprove(row)}
            >
              <CheckCircle size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Reject">
            <button
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              onClick={() => handleReject(row)}
            >
              <XCircle size={16} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const sortedAppeals = React.useMemo(() => {
    let rows = [...appeals];
    const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    const byDateAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    switch (sortBy) {
      case "Newest":
        rows.sort(byDate);
        break;
      case "Oldest":
        rows.sort(byDateAsc);
        break;
      default:
        break;
    }
    return rows;
  }, [appeals, sortBy]);

  const paginatedData = React.useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return sortedAppeals.slice(start, end);
  }, [sortedAppeals, pagination]);

  return (
    <div>
      <ToastContainer />

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B]">
            <Book size={14} />
          </div>
          <div>
            <h2 className="text-[12px] font-semibold text-gray-900">
              Manage Appeals
            </h2>
            <p className="text-[10px] text-gray-500">
              Review and manage user appeals for suspensions.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      {/* Toolbar */}
      <div className="mb-3">
        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          filter={{
            value: statusFilter,
            onChange: setStatusFilter,
            options: ["All", "Pending", "Approved", "Rejected"],
            label: "Status",
          }}
          sort={{
            value: sortBy,
            onChange: setSortBy,
            options: ["Newest", "Oldest"],
            label: "Sort by",
          }}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2 text-[10px] font-medium text-gray-500 ${
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-[11px] text-gray-500"
                  >
                    Loading appeals...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-[11px] text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-[11px] text-gray-500"
                  >
                    No appeals found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2 text-[11px] text-gray-700 ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {col.render ? col.render(row) : row[col.key] || "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
        onPageChange={handlePageChange}
        itemName="appeals"
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={confirmationModal.open}
        onClose={closeConfirmationModal}
        title={
          confirmationModal.type === "approve"
            ? "Approve Appeal"
            : "Reject Appeal"
        }
        message={`Are you sure you want to ${
          confirmationModal.type === "approve" ? "approve" : "reject"
        } this appeal?`}
        confirmText={
          confirmationModal.type === "approve" ? "Approve" : "Reject"
        }
        onConfirm={confirmAction}
        loading={confirmationModal.loading}
      />
    </div>
  );
};

export default ManageAppeals;
