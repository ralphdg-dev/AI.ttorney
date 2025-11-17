import React from "react";
import { MoreVertical } from "lucide-react";
import {
  Eye,
  Pencil,
  Archive,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  X,
  RefreshCw,
  XCircle,
  Users,
} from "lucide-react";
import ListToolbar from "../../components/ui/ListToolbar";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import ViewLawyerApplicationModal from "../../components/lawyers/ViewLawyerApplicationModal";
import DataTable from "../../components/ui/DataTable";
import RollMatchBadge from "../../components/lawyers/RollMatchBadge";
import { useToast } from "../../components/ui/Toast";
import lawyerApplicationsService from "../../services/lawyerApplicationsService";
import rollMatchService from "../../services/rollMatchService"; // Import the new service

const StatusBadge = ({ status, isArchived = false }) => {
  const getStatusStyles = (status) => {
    if (isArchived) {
      return "bg-gray-200 text-gray-600 border border-gray-300";
    }

    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "approved":
      case "accepted":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "rejected":
        return "bg-red-50 text-red-700 border border-red-200";
      case "resubmission":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const displayStatus = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Unknown";
  const styles = getStatusStyles(status);

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}
    >
      {displayStatus}
    </span>
  );
};

const ManageLawyerApplications = () => {
  const { ToastContainer } = useToast();
  const [query, setQuery] = React.useState("");
  const [combinedFilter, setCombinedFilter] = React.useState("Active");
  const [sortBy, setSortBy] = React.useState("Newest");
  const [allData, setAllData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [sortConfig, setSortConfig] = React.useState({
    key: null,
    direction: "asc",
  });
  const [viewOpen, setViewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [historicalViewOpen, setHistoricalViewOpen] = React.useState(false);
  const [historicalApplication, setHistoricalApplication] =
    React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editApplication, setEditApplication] = React.useState(null);
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: "",
    applicationId: null,
    applicantName: "",
    loading: false,
    changes: null,
  });
  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [openMenuPos, setOpenMenuPos] = React.useState({ right: 20, bottom: 20 });


  // Load data from API and check roll numbers
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Parse combined filter to extract status and archived parameters
      let status = "all";
      let archived = "active";

      if (combinedFilter === "Active") {
        status = "all";
        archived = "active";
      } else if (combinedFilter === "Archived") {
        status = "all";
        archived = "archived";
      } else if (combinedFilter === "All") {
        status = "all";
        archived = "all";
      } else if (combinedFilter.includes("Active -")) {
        status = combinedFilter.replace("Active - ", "").toLowerCase();
        archived = "active";
      } else if (combinedFilter.includes("Archived -")) {
        status = combinedFilter.replace("Archived - ", "").toLowerCase();
        archived = "archived";
      }

      const params = {
        page: 1,
        limit: 100,
        search: "",
        status,
        archived,
      };

      const response = await lawyerApplicationsService.getLawyerApplications(
        params
      );

      // Check roll numbers against the lawyers list
      const applicationsWithRollCheck =
        await rollMatchService.checkMultipleRollNumbers(response.data);

      setAllData(applicationsWithRollCheck);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        pages: Math.ceil(response.pagination.total / 10),
      }));

      // Log statistics for debugging
      const stats = rollMatchService.getMatchStatistics(
        applicationsWithRollCheck
      );
      console.log('Roll match statistics:', stats);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load lawyer applications:", err);
    } finally {
      setLoading(false);
    }
  }, [combinedFilter]);

  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openView = async (row) => {
    try {
      setLoadingDetails(true);
      setViewOpen(true);

      const applicationDetails =
        await lawyerApplicationsService.getLawyerApplication(row.id);

      // Check roll number for the detailed view as well
      const rollCheck = await rollMatchService.checkApplicationDetails({
        rollNumber: applicationDetails.roll_number,
        fullName: applicationDetails.full_name,
        rollSignDate: applicationDetails.roll_sign_date,
      }); 
      applicationDetails.pra_status = rollCheck.status;
      applicationDetails.pra_match_details = rollCheck.lawyer || null;

      setSelected(applicationDetails);

      setSelected(applicationDetails);
    } catch (error) {
      console.error("Failed to fetch application details:", error);
      setSelected(row);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewHistoricalApplication = (application) => {
    setHistoricalApplication({ data: application });
    setHistoricalViewOpen(true);
  };

  const handleEdit = async (row) => {
    try {
      const applicationDetails =
        await lawyerApplicationsService.getLawyerApplication(row.id);
      setEditApplication(applicationDetails);
      setEditOpen(true);
    } catch (error) {
      console.error("Failed to fetch application details for editing:", error);
      setEditApplication(row);
      setEditOpen(true);
    }
  };

  const handleEditSave = (updatedApplication, originalApplication) => {
    const changes = {};

    if (originalApplication && updatedApplication) {
      if (originalApplication.status !== updatedApplication.status) {
        changes.Status = {
          from: originalApplication.status || "Not set",
          to: updatedApplication.status || "Not set",
        };
      }

      const originalNotes =
        originalApplication.admin_notes || originalApplication.notes || "";
      const updatedNotes =
        updatedApplication.admin_notes || updatedApplication.notes || "";
      if (originalNotes !== updatedNotes) {
        changes["Admin Notes"] = {
          from: originalNotes || "No notes",
          to: updatedNotes || "No notes",
        };
      }

      if (originalApplication.roll_number !== updatedApplication.roll_number) {
        changes["Roll Number"] = {
          from: originalApplication.roll_number || "Not set",
          to: updatedApplication.roll_number || "Not set",
        };
      }

      if (
        originalApplication.roll_sign_date !== updatedApplication.roll_sign_date
      ) {
        changes["Roll Sign Date"] = {
          from: originalApplication.roll_sign_date || "Not set",
          to: updatedApplication.roll_sign_date || "Not set",
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      setConfirmationModal({
        open: true,
        type: "edit",
        applicationId: updatedApplication.id,
        applicantName: updatedApplication.full_name || "Unknown",
        loading: false,
        changes: changes,
      });
    } else {
      setEditOpen(false);
      loadData();
    }
  };

  const handleArchive = (row) => {
    const isCurrentlyArchived = row.archived === true;
    const modalType = isCurrentlyArchived ? "unarchive" : "archive";

    setConfirmationModal({
      open: true,
      type: modalType,
      applicationId: row.id,
      applicantName: row.users?.full_name || row.full_name || "Unknown",
      loading: false,
    });
  };

  const getModalContent = () => {
    const { type, applicantName, changes } = confirmationModal;

    switch (type) {
      case "approve":
        return {
          title: "Approve Application",
          message: `Are you sure you want to approve this lawyer application? This will grant the applicant verified lawyer status and access to lawyer features.`,
          confirmText: "Approve Application",
          showFeedbackInput: false,
          onConfirm: confirmApprove,
        };
      case "reject":
        return {
          title: "Reject Application",
          message: `Are you sure you want to reject this lawyer application? The applicant will be notified and may be able to reapply later.`,
          confirmText: "Reject Application",
          showFeedbackInput: true,
          feedbackLabel: "Rejection Reason",
          feedbackPlaceholder:
            "Please explain why this application is being rejected...",
          onConfirm: confirmReject,
        };
      case "resubmission":
        return {
          title: "Request Resubmission",
          message: `Are you sure you want to request resubmission for this application? The applicant will be asked to correct and resubmit their documents.`,
          confirmText: "Request Resubmission",
          showFeedbackInput: true,
          feedbackLabel: "Feedback for Resubmission",
          feedbackPlaceholder:
            "Please explain what needs to be corrected or improved...",
          onConfirm: confirmResubmission,
        };
      case "archive":
        return {
          title: "Archive Application",
          message: `Are you sure you want to archive this application? Archived applications will be hidden from the main list but can be accessed through the "Archived" filter.`,
          confirmText: "Archive Application",
          showFeedbackInput: false,
          onConfirm: confirmArchive,
        };
      case "unarchive":
        return {
          title: "Unarchive Application",
          message: `Are you sure you want to unarchive this application? It will be restored to the active applications list.`,
          confirmText: "Unarchive Application",
          showFeedbackInput: false,
          onConfirm: confirmArchive,
        };
      case "edit":
        return {
          title: "Confirm Application Changes",
          message: `Are you sure you want to save these changes to ${applicantName}'s application?`,
          confirmText: "Save Changes",
          showFeedbackInput: false,
          onConfirm: confirmEdit,
          changes: changes,
        };
      default:
        return {};
    }
  };

  const closeModal = () => {
    setConfirmationModal({
      open: false,
      type: "",
      applicationId: null,
      applicantName: "",
      loading: false,
      changes: null,
    });
  };

  const handleApprove = (applicationId, applicantName) => {
    setConfirmationModal({
      open: true,
      type: "approve",
      applicationId,
      applicantName,
      loading: false,
    });
  };

  const confirmApprove = async () => {
    const { applicationId } = confirmationModal;

    try {
      setConfirmationModal((prev) => ({ ...prev, loading: true }));
      await lawyerApplicationsService.updateApplicationStatus(
        applicationId,
        "accepted"
      );
      await loadData();
      setConfirmationModal({
        open: false,
        type: "",
        applicationId: null,
        applicantName: "",
        loading: false,
      });
    } catch (err) {
      console.error("Failed to approve application:", err);
      alert("Failed to approve application: " + err.message);
      setConfirmationModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleReject = (applicationId, applicantName) => {
    setConfirmationModal({
      open: true,
      type: "reject",
      applicationId,
      applicantName,
      loading: false,
    });
  };

  const confirmReject = async (feedback) => {
    const { applicationId } = confirmationModal;

    try {
      setConfirmationModal((prev) => ({ ...prev, loading: true }));
      await lawyerApplicationsService.updateApplicationStatus(
        applicationId,
        "rejected",
        feedback
      );
      await loadData();
      setConfirmationModal({
        open: false,
        type: "",
        applicationId: null,
        applicantName: "",
        loading: false,
      });
    } catch (err) {
      console.error("Failed to reject application:", err);
      alert("Failed to reject application: " + err.message);
      setConfirmationModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleResubmission = (applicationId, applicantName) => {
    setConfirmationModal({
      open: true,
      type: "resubmission",
      applicationId,
      applicantName,
      loading: false,
    });
  };

  const confirmResubmission = async (feedback) => {
    const { applicationId } = confirmationModal;

    try {
      setConfirmationModal((prev) => ({ ...prev, loading: true }));
      await lawyerApplicationsService.updateApplicationStatus(
        applicationId,
        "resubmission",
        feedback
      );
      await loadData();
      setConfirmationModal({
        open: false,
        type: "",
        applicationId: null,
        applicantName: "",
        loading: false,
      });
    } catch (err) {
      console.error("Failed to request resubmission:", err);
      alert("Failed to request resubmission: " + err.message);
      setConfirmationModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const confirmArchive = async () => {
    const { applicationId, type } = confirmationModal;
    const isArchiving = type === "archive";

    try {
      setConfirmationModal((prev) => ({ ...prev, loading: true }));

      await lawyerApplicationsService.archiveApplication(
        applicationId,
        isArchiving
      );
      await loadData();
      setConfirmationModal({
        open: false,
        type: "",
        applicationId: null,
        applicantName: "",
        loading: false,
        changes: null,
      });
    } catch (err) {
      console.error(
        `Failed to ${isArchiving ? "archive" : "unarchive"} application:`,
        err
      );
      alert(
        `Failed to ${isArchiving ? "archive" : "unarchive"} application: ` +
          err.message
      );
      setConfirmationModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const confirmEdit = async () => {
    const { applicationId, changes } = confirmationModal;

    try {
      setConfirmationModal((prev) => ({ ...prev, loading: true }));

      const updateData = {};

      if (changes.Status) {
        updateData.status =
          changes.Status.to === "Not set" ? null : changes.Status.to;
      }

      if (changes["Admin Notes"]) {
        updateData.admin_notes =
          changes["Admin Notes"].to === "No notes"
            ? ""
            : changes["Admin Notes"].to;
      }

      if (changes["Roll Number"]) {
        updateData.roll_number =
          changes["Roll Number"].to === "Not set"
            ? null
            : changes["Roll Number"].to;
      }

      if (changes["Roll Sign Date"]) {
        updateData.roll_sign_date =
          changes["Roll Sign Date"].to === "Not set"
            ? null
            : changes["Roll Sign Date"].to;
      }

      updateData.edit_timestamp = new Date().toISOString();
      updateData.edit_reason = "Manual edit via admin panel";

      await lawyerApplicationsService.updateLawyerApplication(
        applicationId,
        updateData
      );

      setEditOpen(false);
      await loadData();
      setConfirmationModal({
        open: false,
        type: "",
        applicationId: null,
        applicantName: "",
        loading: false,
        changes: null,
      });
    } catch (err) {
      console.error("Failed to edit application:", err);
      alert("Failed to edit application: " + err.message);
      setConfirmationModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSort = (columnKey) => {
    let direction = "asc";
    if (sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
    setSortBy("Newest");
  };

  const handleSortByChange = (newSortBy) => {
    setSortBy(newSortBy);
    setSortConfig({ key: null, direction: "asc" });
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
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

  // Client-side filtering and sorting
  const filteredAndSortedData = React.useMemo(() => {
    let filteredArray = [...allData];

    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredArray = filteredArray.filter((item) => {
        return (
          (item.full_name || "").toLowerCase().includes(searchTerm) ||
          (item.email || "").toLowerCase().includes(searchTerm) ||
          (item.username || "").toLowerCase().includes(searchTerm) ||
          (item.roll_number || "").toLowerCase().includes(searchTerm)
        );
      });
    }

    if (sortConfig.key) {
      filteredArray = filteredArray.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        let comparison = 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (
          sortConfig.key === "application_date" ||
          sortConfig.key === "roll_sign_date"
        ) {
          comparison = new Date(aValue) - new Date(bValue);
        } else if (typeof aValue === "string") {
          comparison = aValue.localeCompare(bValue);
        } else {
          comparison = aValue - bValue;
        }

        return sortConfig.direction === "desc" ? -comparison : comparison;
      });
    } else if (sortBy !== "Newest") {
      filteredArray = filteredArray.sort((a, b) => {
        switch (sortBy) {
          case "Oldest":
            return new Date(a.application_date) - new Date(b.application_date);
          case "Name A-Z":
            return (a.full_name || "").localeCompare(b.full_name || "");
          case "Name Z-A":
            return (b.full_name || "").localeCompare(a.full_name || "");
          case "Newest":
          default:
            return new Date(b.application_date) - new Date(a.application_date);
        }
      });
    } else {
      filteredArray = filteredArray.sort(
        (a, b) => new Date(b.application_date) - new Date(a.application_date)
      );
    }

    return filteredArray;
  }, [allData, query, sortConfig, sortBy]);

  const paginatedData = React.useMemo(() => {
    const startIndex = (pagination.page - 1) * 10;
    const endIndex = startIndex + 10;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, pagination.page]);

  React.useEffect(() => {
    const totalFiltered = filteredAndSortedData.length;
    const totalPages = Math.ceil(totalFiltered / 10);
    setPagination((prev) => ({
      ...prev,
      total: totalFiltered,
      pages: totalPages,
      page: prev.page > totalPages && totalPages > 0 ? 1 : prev.page,
    }));
  }, [filteredAndSortedData]);

  const columns = [
    {
      key: "full_name",
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort("full_name")}
        >
          <span>Full Name</span>
          {sortConfig.key === "full_name" ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
    },
    {
      key: "email",
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort("email")}
        >
          <span>Email</span>
          {sortConfig.key === "email" ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
    },
    {
      key: "username",
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort("username")}
        >
          <span>Username</span>
          {sortConfig.key === "username" ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
    },
    {
      key: "roll_number",
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort("roll_number")}
        >
          <span>Roll Number</span>
          {sortConfig.key === "roll_number" ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
      render: (row) => (
        <div className="flex items-center gap-2">
          <span>{row.roll_number || "N/A"}</span>
          <RollMatchBadge
            status={row.pra_status}
            isArchived={row.archived === true}
          />
        </div>
      ),
    },
    {
      key: "roll_sign_date",
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort("roll_sign_date")}
        >
          <span>Roll Sign Date</span>
          {sortConfig.key === "roll_sign_date" ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
      render: (row) => {
        if (!row.roll_sign_date) return "N/A";
        const date = new Date(row.roll_sign_date);
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "Asia/Manila",
        }).format(date);
      },
    },
    {
      key: "application_type",
      header: "Application",
      render: (row) => {
        const isNew = row.application_type === "New Application";
        const isArchived = row.archived === true;

        if (isNew) {
          const styles = isArchived
            ? "bg-gray-200 text-gray-600 border border-gray-300"
            : "bg-green-50 text-green-700 border border-green-200";
          return (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}
            >
              1st Application
            </span>
          );
        }

        const attemptMatch = row.application_type.match(
          /(\d+)(st|nd|rd|th) attempt/
        );
        const attemptNumber = attemptMatch ? attemptMatch[1] : "2";
        const suffix = attemptMatch ? attemptMatch[2] : "nd";

        const styles = isArchived
          ? "bg-gray-200 text-gray-600 border border-gray-300"
          : "bg-orange-50 text-orange-700 border border-orange-200";

        return (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}
          >
            {attemptNumber}
            {suffix} Attempt
          </span>
        );
      },
    },
    {
      key: "prior_status",
      header: "Prior Status",
      render: (row) => {
        if (!row.prior_status) {
          return <span className="text-xs text-gray-400">-</span>;
        }
        return (
          <StatusBadge
            status={row.prior_status}
            isArchived={row.archived === true}
          />
        );
      },
    },
    {
      key: "status",
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort("status")}
        >
          <span>Current Status</span>
          {sortConfig.key === "status" ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
      render: (row) => (
        <StatusBadge status={row.status} isArchived={row.archived === true} />
      ),
    },
    
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => {
        const isArchived = row.archived === true;
        const disabledResub = row.status === "resubmission";
        const disabledReject = row.status === "rejected";
        return (
          <div className="relative" style={{ position: 'static' }}>
            <button
              onClick={(e) => {
                if (openMenuId === row.id) {
                  setOpenMenuId(null);
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                const right = Math.max(8, window.innerWidth - rect.right);
                const bottom = Math.max(8, window.innerHeight - rect.top + 10); // 10px above trigger
                setOpenMenuPos({ right, bottom });
                setOpenMenuId(row.id);
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {openMenuId === row.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenMenuId(null)}
                />
                <div
                  className="fixed w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[9999]"
                  style={{ right: `${openMenuPos.right}px`, bottom: `${openMenuPos.bottom}px` }}
                >
                  {row.status !== "accepted" && (
                    <>
                      <button
                        onClick={() => { handleApprove(row.id, row.full_name); setOpenMenuId(null); }}
                        className="w-full px-3 py-1.5 text-left text-xs text-emerald-700 hover:bg-emerald-50 flex items-center"
                      >
                        <Check size={14} className="mr-2" />
                        Approve Application
                      </button>
                      <button
                        onClick={() => { if (!disabledResub) handleResubmission(row.id, row.full_name); setOpenMenuId(null); }}
                        disabled={disabledResub}
                        className={`w-full px-3 py-1.5 text-left text-xs flex items-center ${disabledResub ? 'text-gray-400 cursor-not-allowed' : 'text-yellow-700 hover:bg-yellow-50'}`}
                      >
                        <RotateCcw size={14} className="mr-2" />
                        Request Resubmission
                      </button>
                      <button
                        onClick={() => { if (!disabledReject) handleReject(row.id, row.full_name); setOpenMenuId(null); }}
                        disabled={disabledReject}
                        className={`w-full px-3 py-1.5 text-left text-xs flex items-center ${disabledReject ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                      >
                        <X size={14} className="mr-2" />
                        Reject Application
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                    </>
                  )}
                  <button
                    onClick={() => { openView(row); setOpenMenuId(null); }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2 text-gray-600" />
                    View Details
                  </button>
                  <button
                    onClick={() => { handleEdit(row); setOpenMenuId(null); }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Pencil className="w-4 h-4 mr-2 text-gray-600" />
                    Edit
                  </button>
                  {!isArchived ? (
                    <button
                      onClick={() => { handleArchive(row); setOpenMenuId(null); }}
                      className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Archive className="w-4 h-4 mr-2 text-red-600" />
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => { handleArchive(row); setOpenMenuId(null); }}
                      className="w-full px-3 py-1.5 text-left text-xs text-emerald-700 hover:bg-emerald-50 flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 text-emerald-700" />
                      Unarchive
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // Loading handled by DataTable's built-in loading row

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-2">
            Failed to load lawyer applications
          </p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-[#023D7B] text-white text-xs px-3 py-1.5 rounded-md hover:bg-[#013462]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer />
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch">
            <Users size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">
              Manage Lawyer Applications
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Review and approve or reject lawyer applications.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      <div className="w-full mb-3">
        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          filter={{
            value: combinedFilter,
            onChange: setCombinedFilter,
            options: [
              "Active",
              "Active - Pending",
              "Active - Accepted",
              "Active - Rejected",
              "Active - Resubmission",
              "Archived",
              "Archived - Pending",
              "Archived - Accepted",
              "Archived - Rejected",
              "Archived - Resubmission",
              "All",
            ],
            label: "Filter applications",
          }}
          sort={{
            value: sortBy,
            onChange: handleSortByChange,
            options: ["Newest", "Oldest", "Name A-Z", "Name Z-A"],
            label: "Sort by",
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={paginatedData}
        rowKey={(row) => row.id}
        dense
        loading={loading}
        loadingMessage="Loading lawyer applications..."
      />

      {pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} applications
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.page <= 1}
              className="flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
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
                    key={i}
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
              })}
            </div>

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

      <ViewLawyerApplicationModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelected(null);
          setLoadingDetails(false);
        }}
        application={selected}
        loading={loadingDetails}
        onViewHistoricalApplication={handleViewHistoricalApplication}
      />

      <ViewLawyerApplicationModal
        open={historicalViewOpen}
        onClose={() => {
          setHistoricalViewOpen(false);
          setHistoricalApplication(null);
        }}
        application={historicalApplication}
        loading={false}
        isHistoricalView={true}
      />

      <ViewLawyerApplicationModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditApplication(null);
        }}
        application={editApplication}
        loading={false}
        isEditMode={true}
        onSave={handleEditSave}
      />

      <ConfirmationModal
        open={confirmationModal.open}
        onClose={closeModal}
        type={confirmationModal.type}
        applicantName={confirmationModal.applicantName}
        loading={confirmationModal.loading}
        {...getModalContent()}
      />
    </div>
  );
};

export default ManageLawyerApplications;
