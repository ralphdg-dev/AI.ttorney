import React from "react";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Archive,
  Upload,
  MoreVertical,
  History,
  Activity,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Tooltip from "../../components/ui/Tooltip";
import ListToolbar from "../../components/ui/ListToolbar";
import Pagination from "../../components/ui/Pagination";
import ViewAppealModal from "../../components/appeals/ViewAppealModal";
import ActionAppealModal from "../../components/appeals/ActionAppealModal";
import SuccessModal from "../../components/appeals/SuccessModal";
import { format } from "date-fns";

const ManageAppeals = () => {
  const [appeals, setAppeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [actionModalOpen, setActionModalOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("Newest");
  const [filteredData, setFilteredData] = React.useState([]);
  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [dropdownPosition, setDropdownPosition] = React.useState(null);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedAppeal, setSelectedAppeal] = React.useState(null);
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [successType, setSuccessType] = React.useState("success");
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [auditError, setAuditError] = React.useState(null);
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [activityError, setActivityError] = React.useState(null);

  // Get current admin info for audit logging
  const getCurrentAdmin = () => {
    try {
      return JSON.parse(localStorage.getItem("admin_user") || "{}");
    } catch {
      return { full_name: "Admin", role: "admin" };
    }
  };

  // Helper function to create audit log
  const createAuditLog = async (action, appealId, metadata = {}) => {
    try {
      const currentAdmin = getCurrentAdmin();
      const response = await fetch(
        "http://localhost:5001/api/appeals-management/audit-log",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({
            action,
            target_id: appealId,
            metadata: {
              ...metadata,
              admin_name: currentAdmin.full_name || "Admin",
              admin_role: currentAdmin.role || "admin",
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw error - audit logging failure shouldn't break the main action
    }
  };

  // Load appeal audit logs
  const loadAuditLogs = async (appealId) => {
    try {
      setAuditLoading(true);
      setAuditError(null);

      const response = await fetch(
        `http://localhost:5001/api/appeals-management/${appealId}/audit-logs`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }

      const json = await response.json();

      if (json.success) {
        setAuditLogs(json.data || []);
      } else {
        throw new Error(json.message || "Failed to load audit logs");
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setAuditError(error.message);
    } finally {
      setAuditLoading(false);
    }
  };

  // Load recent activity
  const loadRecentActivity = async (appealId) => {
    try {
      setActivityLoading(true);
      setActivityError(null);

      const response = await fetch(
        `http://localhost:5001/api/appeals-management/${appealId}/recent-activity`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }

      const json = await response.json();

      if (json.success) {
        setRecentActivity(json.data || []);
      } else {
        throw new Error(json.message || "Failed to load recent activity");
      }
    } catch (error) {
      console.error("Failed to load recent activity:", error);
      setActivityError(error.message);
    } finally {
      setActivityLoading(false);
    }
  };

  // 🔹 Fetch data from Supabase API
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/appeals-management");
        const json = await res.json();
        if (json.success) {
          setAppeals(json.data || []);
          setFilteredData(json.data || []);
        } else {
          console.error("Error fetching appeals:", json.error);
        }
      } catch (err) {
        console.error("Error fetching appeals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔹 Filtering and sorting logic
  React.useEffect(() => {
    let data = [...appeals];
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((item) =>
        Object.values(item).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sortBy === "Newest")
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "Oldest")
      data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    setFilteredData(data);
  }, [query, sortBy, appeals]);

  const toggleMenu = (id, event) => {
    event.stopPropagation();
    if (openMenuId === id) return setOpenMenuId(null);
    const rect = event.currentTarget.getBoundingClientRect();
    // Place menu above the trigger by 10px, aligned to the right similar to ReportedReplies
    const right = Math.max(8, window.innerWidth - rect.right);
    const bottom = Math.max(8, window.innerHeight - rect.top + 10);
    setDropdownPosition({ right, bottom });
    setOpenMenuId(id);
  };

  const handleUpdateStatus = async (id, newStatus, extraData) => {
    try {
      setActionLoading(true);

      const res = await fetch(
        `http://localhost:5001/api/appeals-management/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            ...extraData,
          }),
        }
      );

      const json = await res.json();

      if (json.success) {
        setAppeals((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...json.data } : a))
        );
        setActionModalOpen(false);

        // Log the action for audit trail
        const appeal = appeals.find((a) => a.id === id);
        const userName = appeal?.user_full_name || "Unknown User";

        if (newStatus === "approved") {
          await createAuditLog(`Approved appeal for user "${userName}"`, id, {
            user_name: userName,
            appeal_id: id,
            admin_notes: extraData.admin_notes || null,
            action_type: "appeal_approved",
          });
        } else if (newStatus === "rejected") {
          await createAuditLog(`Rejected appeal for user "${userName}"`, id, {
            user_name: userName,
            appeal_id: id,
            admin_notes: extraData.admin_notes || null,
            rejection_reason: extraData.rejection_reason || null,
            action_type: "appeal_rejected",
          });
        }

        setSuccessType("success");
        setSuccessMessage(`Appeal ${newStatus} successfully.`);
        setSuccessModalOpen(true);
      } else {
        setSuccessType("error");
        setSuccessMessage("Failed to update appeal.");
        setSuccessModalOpen(true);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setSuccessType("error");
      setSuccessMessage("Error updating appeal status.");
      setSuccessModalOpen(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAppeal = (appeal) => {
    setSelectedAppeal(appeal);
    setViewModalOpen(true);

    // Log view action
    createAuditLog(
      `Viewed appeal from user "${appeal.user_full_name}"`,
      appeal.id,
      {
        user_name: appeal.user_full_name,
        appeal_id: appeal.id,
        action_type: "appeal_viewed",
      }
    );

    // Load audit data for the modal
    loadAuditLogs(appeal.id);
    loadRecentActivity(appeal.id);
  };

  const renderDropdown = (row) => {
    if (openMenuId !== row.id) return null;

    // ✅ Only show Approve/Reject if status is NOT approved/rejected
    const isFinalized =
      row.status?.toLowerCase() === "approved" ||
      row.status?.toLowerCase() === "rejected";

    return (
      <div
        className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-md w-36 text-[11px]"
        style={{
          position: "fixed",
          right: dropdownPosition?.right ?? 20,
          bottom: dropdownPosition?.bottom ?? 20,
        }}
      >
        <button
          onClick={() => {
            handleViewAppeal(row);
            setOpenMenuId(null);
          }}
          className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50"
        >
          <Eye size={12} className="mr-2 text-gray-500" /> View
        </button>

        {/* ✅ Only render if status is pending */}
        {!isFinalized && (
          <>
            <button
              onClick={() => {
                setSelectedAppeal(row);
                setActionType("approved");
                setActionModalOpen(true);
                setOpenMenuId(null);
              }}
              className="flex items-center w-full px-3 py-1.5 text-emerald-600 hover:bg-emerald-50"
            >
              <CheckCircle size={12} className="mr-2 text-emerald-500" />{" "}
              Approve
            </button>

            <button
              onClick={() => {
                setSelectedAppeal(row);
                setActionType("rejected");
                setActionModalOpen(true);
                setOpenMenuId(null);
              }}
              className="flex items-center w-full px-3 py-1.5 text-red-600 hover:bg-red-50"
            >
              <XCircle size={12} className="mr-2 text-red-500" /> Reject
            </button>
          </>
        )}
      </div>
    );
  };

  // 🔹 Helper to safely display data or fallback
  const displayValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return value;
  };

  const columns = [
    { key: "user_full_name", header: "User Name" },
    { key: "suspension_id", header: "Suspension ID" },
    { key: "suspension_reason", header: "Suspension Reason" },
    { key: "appeal_reason", header: "Appeal Reason" },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const statusRaw = r.status || "pending";
        const status =
          statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();

        let badgeStyle = "bg-yellow-50 border-yellow-200 text-yellow-700"; // default pending

        if (status === "Approved")
          badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-700";
        else if (status === "Rejected")
          badgeStyle = "bg-red-50 border-red-200 text-red-600";

        return (
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border ${badgeStyle}`}
          >
            {status}
          </span>
        );
      },
    },
    { key: "reviewed_by", header: "Reviewed By" },
    {
      key: "reviewed_at",
      header: "Reviewed At",
      render: (row) => {
        if (!row.reviewed_at) return "N/A";
        try {
          return format(new Date(row.reviewed_at), "MMM d, yyyy");
        } catch (err) {
          return row.reviewed_at;
        }
      },
    },
    { key: "admin_notes", header: "Admin Notes" },
    { key: "rejection_reason", header: "Rejection Reason" },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="relative flex justify-end">
          <Tooltip content="Actions">
            <button
              onClick={(e) => toggleMenu(r.id, e)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical size={16} />
            </button>
          </Tooltip>
          {renderDropdown(r)}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B]">
            <FileText size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">
              Manage Appeals
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              View and manage user suspension appeals.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      <div className="w-full mb-3 flex items-center gap-2">
        <div className="flex-1">
          <ListToolbar
            query={query}
            onQueryChange={setQuery}
            sort={{
              value: sortBy,
              onChange: setSortBy,
              options: ["Newest", "Oldest"],
              label: "Sort by",
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2 text-[10px] font-medium text-gray-500 ${col.align === "center"
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
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[11px] text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#023D7B] mr-2"></div>
                      Loading appeals...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-[11px] text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <p>No appeals found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                !loading && filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 relative">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2 text-[11px] text-gray-700 ${col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                              ? "text-right"
                              : ""
                          }`}
                      >
                        {col.render
                          ? col.render(row)
                          : displayValue(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ViewAppealModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        appeal={selectedAppeal}
        auditLogs={auditLogs}
        auditLoading={auditLoading}
        auditError={auditError}
        recentActivity={recentActivity}
        activityLoading={activityLoading}
        activityError={activityError}
      />

      <ActionAppealModal
        open={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        type={actionType}
        appeal={selectedAppeal}
        loading={actionLoading}
        onSubmit={(formData) =>
          handleUpdateStatus(selectedAppeal.id, actionType, formData)
        }
      />

      <SuccessModal
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        message={successMessage}
        type={successType}
      />

      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={filteredData.length}
        itemsPerPage={10}
        onPageChange={() => { }}
        itemName="appeals"
      />
    </div>
  );
};

export default ManageAppeals;
