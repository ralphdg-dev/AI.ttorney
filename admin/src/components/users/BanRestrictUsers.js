import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Search,
  Shield,
  Ban,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Plus,
  Minus,
  Eye,
  History,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import usersService from "../../services/usersService";
import adminModerationService from "../../services/adminModerationService";
import DataTable from "../ui/DataTable";
import Pagination from "../ui/Pagination";
import Tooltip from "../ui/Tooltip";
import ListToolbar from "../ui/ListToolbar";

const BanRestrictUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Users");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("Newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Ban/Restrict modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(""); // 'ban', 'restrict', 'unban', 'unrestrict', 'add_strike', 'remove_strike'
  const [actionReason, setActionReason] = useState("");
  const [actionDuration, setActionDuration] = useState("permanent");
  const [processing, setProcessing] = useState(false);

  // User details modal
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userViolations, setUserViolations] = useState([]);
  const [userSuspensions, setUserSuspensions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState(null);

  const statusOptions = [
    { value: "all", label: "All Users" },
    { value: "active", label: "Active Users" },
    { value: "suspended", label: "Suspended Users" },
    { value: "banned", label: "Permanently Banned" },
  ];

  const riskOptions = [
    { value: "all", label: "All Risk Levels" },
    { value: "low", label: "Low Risk" },
    { value: "medium", label: "Medium Risk" },
    { value: "high", label: "High Risk" },
  ];

  const durationOptions = [
    { value: "permanent", label: "Permanent" },
    { value: "1_day", label: "1 Day" },
    { value: "3_days", label: "3 Days" },
    { value: "1_week", label: "1 Week" },
    { value: "2_weeks", label: "2 Weeks" },
    { value: "1_month", label: "1 Month" },
    { value: "3_months", label: "3 Months" },
    { value: "6_months", label: "6 Months" },
    { value: "1_year", label: "1 Year" },
  ];

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, statusFilter, riskFilter, sortBy, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, riskFilter, sortBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Map status filter values
      let apiStatusFilter = "";
      if (statusFilter === "Active" || statusFilter === "Active Users") {
        apiStatusFilter = ""; // Empty string for all active users
      } else if (statusFilter === "Suspended Users") {
        apiStatusFilter = "suspended";
      } else if (statusFilter === "Permanently Banned") {
        apiStatusFilter = "banned";
      }
      
      console.log("Filter mapping:", { statusFilter, apiStatusFilter });
      
      const response = await usersService.getLegalSeekers({
        page: 1, // Always fetch from page 1 for client-side filtering
        limit: 100, // Fetch more records for better filtering
        search: searchTerm,
        status: "", // Don't filter on server, do it client-side
        archived: "active",
      });

      let filteredUsers = response.data;

      // Apply client-side status filtering to ensure accuracy
      if (statusFilter === "Active Users") {
        filteredUsers = filteredUsers.filter((user) => 
          user.account_status === "active" || !user.account_status
        );
      } else if (statusFilter === "Suspended Users") {
        filteredUsers = filteredUsers.filter((user) => 
          user.account_status === "suspended"
        );
      } else if (statusFilter === "Permanently Banned") {
        filteredUsers = filteredUsers.filter((user) => 
          user.account_status === "banned"
        );
      }
      // "All Users" shows all users - no filtering needed

      // Apply risk-based filtering
      if (riskFilter !== "all") {
        filteredUsers = filteredUsers.filter((user) => {
          const riskLevel = getUserRiskLevel(user);
          return riskLevel.level.toLowerCase() === riskFilter;
        });
      }

      // Apply sorting
      filteredUsers = filteredUsers.sort((a, b) => {
        switch (sortBy) {
          case "Oldest":
            const dateA = new Date(a.created_at || a.createdAt || a.date_joined || a.registration_date);
            const dateB = new Date(b.created_at || b.createdAt || b.date_joined || b.registration_date);
            
            // Handle invalid dates
            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            
            return dateA - dateB; // Oldest first (ascending)
            
          case "Name A-Z":
            return (a.full_name || "").localeCompare(b.full_name || "");
          case "Name Z-A":
            return (b.full_name || "").localeCompare(a.full_name || "");
          case "Most Strikes":
            return (b.strike_count || 0) - (a.strike_count || 0);
          case "Least Strikes":
            return (a.strike_count || 0) - (b.strike_count || 0);
          case "Newest":
          default:
            const dateNewestA = new Date(a.created_at || a.createdAt || a.date_joined || a.registration_date);
            const dateNewestB = new Date(b.created_at || b.createdAt || b.date_joined || b.registration_date);
            
            // Handle invalid dates
            if (isNaN(dateNewestA.getTime()) && isNaN(dateNewestB.getTime())) return 0;
            if (isNaN(dateNewestA.getTime())) return 1;
            if (isNaN(dateNewestB.getTime())) return -1;
            
            return dateNewestB - dateNewestA; // Newest first (descending)
        }
      });
      
      console.log("Applied sorting:", sortBy, "- Result count:", filteredUsers.length);
      
      if (sortBy === "Oldest" && filteredUsers.length > 1) {
        console.log("Oldest sorting debug - First 3 users after sort:");
        filteredUsers.slice(0, 3).forEach((user, index) => {
          const userDate = new Date(user.created_at || user.createdAt || user.date_joined || user.registration_date);
          console.log(`User ${index + 1}:`, {
            id: user.id,
            name: user.full_name,
            date: userDate.toISOString(),
            raw_dates: {
              created_at: user.created_at,
              createdAt: user.createdAt,
              date_joined: user.date_joined,
              registration_date: user.registration_date
            }
          });
        });
      }
      
      console.log("Sample user data for sorting:", filteredUsers[0] ? {
        id: filteredUsers[0].id,
        full_name: filteredUsers[0].full_name,
        created_at: filteredUsers[0].created_at,
        createdAt: filteredUsers[0].createdAt,
        date_joined: filteredUsers[0].date_joined,
        registration_date: filteredUsers[0].registration_date,
        strike_count: filteredUsers[0].strike_count
      } : "No users");

      console.log("Users API response:", response);
      console.log("Raw users from API:", response.data?.length || 0);
      console.log("User statuses in response:", response.data?.map(u => ({ id: u.id, status: u.account_status })) || []);
      console.log("After filtering:", filteredUsers.length);
      console.log("Filter applied:", statusFilter);
      console.log("Pagination info:", response.pagination);
      console.log("Current page:", currentPage);
      console.log("Calculated total pages:", Math.ceil((response.pagination?.total || 0) / 10));

      // Apply client-side pagination
      const totalFiltered = filteredUsers.length;
      const startIndex = (currentPage - 1) * 10;
      const endIndex = startIndex + 10;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
      
      setUsers(paginatedUsers);
      
      // Calculate proper pagination based on filtered results
      const totalPages = Math.ceil(totalFiltered / 10);
      setPagination({
        page: currentPage,
        limit: 10,
        total: totalFiltered,
        pages: totalPages
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching users:", err);
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

  const handleUserAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      setProcessing(true);

      console.log("User action:", {
        userId: selectedUser.id,
        action: actionType,
        reason: actionReason,
        duration: actionDuration,
      });

      // Call the appropriate API endpoint
      if (actionType === "add_strike" || actionType === "remove_strike") {
        const strikeAction = actionType === "add_strike" ? "add" : "remove";
        await usersService.updateUserStrikes(
          selectedUser.id,
          strikeAction,
          actionReason
        );
      } else {
        await usersService.moderateUser(
          selectedUser.id,
          actionType,
          actionReason,
          actionDuration
        );
      }

      // Refresh the users list
      await fetchUsers();

      // Close modal and reset state
      setShowActionModal(false);
      setSelectedUser(null);
      setActionType("");
      setActionReason("");
      setActionDuration("permanent");

      // Clear any previous errors
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error performing user action:", err);
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
  };

  const openUserDetailsModal = async (user) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
    setLoadingDetails(true);
    setUserViolations([]);
    setUserSuspensions([]);

    try {
      // Fetch user violations and suspensions
      const [violationsResponse, suspensionsResponse] = await Promise.all([
        adminModerationService.getUserViolations(user.id),
        adminModerationService.getUserSuspensions(user.id),
      ]);

      setUserViolations(violationsResponse.data || []);
      setUserSuspensions(suspensionsResponse.data || []);
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "No date available";
    }

    const date = new Date(dateString);

    // Check if the date is valid
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

  const getUserStatusBadge = (user) => {
    // Use account_status from the database
    switch (user.account_status) {
      case "banned":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Permanently Banned
          </span>
        );
      case "suspended":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Suspended
          </span>
        );
      case "active":
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Active
          </span>
        );
    }
  };

  const getUserRiskLevel = (user) => {
    // This would be calculated based on user behavior, reports, etc.
    // For now, we'll simulate based on reject_count
    if (user.reject_count >= 3) {
      return { level: "High", color: "text-red-600" };
    }
    if (user.reject_count >= 1) {
      return { level: "Medium", color: "text-yellow-600" };
    }
    return { level: "Low", color: "text-green-600" };
  };

  // DataTable columns configuration
  const columns = [
    {
      key: "user",
      header: "USER",
      render: (user) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {user.full_name || "No name"}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
            {user.username && (
              <div className="text-xs text-gray-400">@{user.username}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (user) => getUserStatusBadge(user),
    },
    {
      key: "risk_level",
      header: "RISK LEVEL",
      align: "center",
      render: (user) => {
        const riskLevel = getUserRiskLevel(user);
        return (
          <div className="text-center">
            <span className={`text-sm font-medium ${riskLevel.color}`}>
              {riskLevel.level}
            </span>
          </div>
        );
      },
    },
    {
      key: "strikes",
      header: "STRIKES",
      align: "center",
      render: (user) => {
        // Use only strike_count from database (rejections are separate)
        const strikes = user.strike_count || 0;
        const maxStrikes = 3;

        // Use suspension count from database
        const suspensionCount = user.suspension_count || 0;
        const isPermanentlyBanned = user.account_status === "banned";

        // Get strike description
        const getStrikeDescription = (strikeCount) => {
          switch (strikeCount) {
            case 0:
              return `${strikeCount}/3 Strikes — No violations. User is in good standing.`;
            case 1:
              return `${strikeCount}/3 Strikes — Warning issued for guideline violation.`;
            case 2:
              return `${strikeCount}/3 Strikes — Second warning. Next violation leads to 7-day suspension.`;
            case 3:
              return `${strikeCount}/3 Strikes — User receives 7-day suspension for repeated violations.`;
            default:
              return `${strikeCount}/3 Strikes — User has multiple violations and may face escalated disciplinary action.`;
          }
        };

        const tooltipContent = getStrikeDescription(strikes);

        return (
          <Tooltip
            content={tooltipContent}
            placement="top"
            className="whitespace-normal"
          >
            <div className="flex items-center justify-center cursor-help hover:scale-105 transition-transform duration-200">
              <div className="flex space-x-1.5 p-1">
                {Array.from({ length: maxStrikes }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                      i < strikes
                        ? strikes >= maxStrikes
                          ? "bg-red-500 border-red-600 shadow-md shadow-red-200"
                          : strikes >= 2
                          ? "bg-yellow-500 border-yellow-600 shadow-md shadow-yellow-200"
                          : "bg-orange-500 border-orange-600 shadow-md shadow-orange-200"
                        : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      key: "suspension_count",
      header: "SUSPENSION",
      align: "center",
      render: (user) => {
        const strikes = user.strike_count || 0;
        const suspensionCount = user.suspension_count || 0;
        const isPermanentlyBanned = user.account_status === "banned";

        return (
          <div className="text-center">
            <span
              className={`text-sm font-medium ${
                isPermanentlyBanned
                  ? "text-red-600"
                  : suspensionCount >= 3
                  ? "text-red-600"
                  : suspensionCount > 0
                  ? "text-orange-600"
                  : "text-gray-900"
              }`}
            >
              {suspensionCount}
            </span>
            {suspensionCount > 0 && (
              <div className="text-xs text-gray-500">
                {isPermanentlyBanned
                  ? "Permanently banned from app"
                  : suspensionCount >= 3
                  ? "3 suspensions - eligible for permanent ban"
                  : `${suspensionCount} suspension${
                      suspensionCount > 1 ? "s" : ""
                    } (7 days each)`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "joined",
      header: "JOINED",
      align: "center",
      render: (user) => {
        // Try different possible date field names
        const joinDate =
          user.created_at ||
          user.createdAt ||
          user.date_joined ||
          user.registration_date;

        return (
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDate(joinDate)}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (user) => (
        <div className="flex justify-center">
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
              className={`flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 rounded-full transition-all duration-200 ${
                openDropdown === user.id ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

          {/* Dropdown Menu */}
          {openDropdown === user.id && (
            <div className="absolute right-full mr-2 top-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-2">
                {/* View Details - Always available */}
                <button
                  onClick={() => {
                    openUserDetailsModal(user);
                    setOpenDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-3 text-gray-500" />
                    <span>View Details</span>
                  </div>
                </button>

                {/* Add Strike - Always available */}
                <button
                  onClick={() => {
                    openActionModal(user, "add_strike");
                    setOpenDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Plus className="w-4 h-4 mr-3 text-gray-500" />
                    <span>Add Strike</span>
                  </div>
                </button>

                {/* Remove Strike - Only if user has strikes */}
                {(user.strike_count || 0) > 0 && (
                  <button
                    onClick={() => {
                      openActionModal(user, "remove_strike");
                      setOpenDropdown(null);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Minus className="w-4 h-4 mr-3 text-gray-500" />
                      <span>Remove Strike</span>
                    </div>
                  </button>
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 my-1"></div>

                {/* Status-specific actions */}
                {user.account_status === "active" && (
                  <>
                    <button
                      onClick={() => {
                        openActionModal(user, "restrict");
                        setOpenDropdown(null);
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-3 text-gray-500" />
                        <span>Suspend User</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        openActionModal(user, "ban");
                        setOpenDropdown(null);
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Ban className="w-4 h-4 mr-3 text-red-500" />
                        <span>Permanently Ban</span>
                      </div>
                    </button>
                  </>
                )}

                {user.account_status === "banned" && (
                  <button
                    onClick={() => {
                      openActionModal(user, "unban");
                      setOpenDropdown(null);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-3 text-green-500" />
                      <span>Restore Access</span>
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
            <Shield size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Ban/Restrict Users</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Manage app bans, forum restrictions and user strikes.</p>
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
            options: [
              'All Users',
              'Active Users', 
              'Suspended Users', 
              'Permanently Banned'
            ], 
            label: 'Filter users' 
          }}
          sort={{ 
            value: sortBy, 
            onChange: (value) => {
              console.log("Sort changed to:", value);
              setSortBy(value);
            }, 
            options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A', 'Most Strikes', 'Least Strikes'], 
            label: 'Sort by' 
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading users...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            rowKey={(row) => row.id}
            dense
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No users found matching your criteria.</p>
              </div>
            }
          />

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              {/* Pagination Info */}
              <div className="text-xs text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1.5 text-xs border rounded-md ${
                          pagination.page === pageNum
                            ? 'bg-[#023D7B] text-white border-[#023D7B]'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
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

      {/* Action Modal */}
      {showActionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 border shadow-lg rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === "ban"
                  ? "Permanently Ban User from App"
                  : actionType === "restrict"
                  ? "Restrict User (View Only)"
                  : actionType === "add_strike"
                  ? "Add Strike"
                  : actionType === "remove_strike"
                  ? "Remove Strike"
                  : actionType === "unban"
                  ? "Restore App Access"
                  : "Remove Restrictions"}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">User:</p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium">
                    {selectedUser.full_name || "No name"}
                  </p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>

              {(actionType === "ban" || actionType === "restrict") && (
                <>
                  <div className="mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">
                            {actionType === "ban"
                              ? "Permanent App Ban"
                              : "Forum Restriction"}
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            {actionType === "ban"
                              ? "User will be permanently banned from the entire application and cannot access any features."
                              : "User can view forum content but cannot create posts or replies (applies to both user and lawyer accounts)."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason (Required):
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter reason for ${
                        actionType === "ban" ? "permanent app ban" : "forum restriction"
                      }...`}
                    />
                  </div>
                </>
              )}

              {(actionType === "add_strike" ||
                actionType === "remove_strike") && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Required):
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter reason for ${
                      actionType === "add_strike" ? "adding" : "removing"
                    } strike...`}
                  />
                </div>
              )}

              {(actionType === "unban" || actionType === "unrestrict") && (
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800">
                          {actionType === "unban"
                            ? "Restore App Access"
                            : "Remove Forum Restrictions"}
                        </h4>
                        <p className="text-sm text-green-700 mt-1">
                          {actionType === "unban"
                            ? "User will regain full access to the entire application."
                            : "User will regain ability to create posts and replies on the forum."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restoration Notes (Optional):
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter notes about ${
                      actionType === "unban"
                        ? "restoring app access"
                        : "removing restrictions"
                    }...`}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUserAction}
                  disabled={
                    processing ||
                    (actionType !== "unban" &&
                      actionType !== "unrestrict" &&
                      !actionReason.trim())
                  }
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    actionType === "ban"
                      ? "bg-red-600 hover:bg-red-700"
                      : actionType === "restrict"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : actionType === "add_strike"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : actionType === "remove_strike"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {processing
                    ? "Processing..."
                    : actionType === "ban"
                    ? "Permanently Ban from App"
                    : actionType === "restrict"
                    ? "Restrict User"
                    : actionType === "add_strike"
                    ? "Add Strike"
                    : actionType === "remove_strike"
                    ? "Remove Strike"
                    : actionType === "unban"
                    ? "Restore App Access"
                    : "Remove Restrictions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal &&
        selectedUser &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div
              className="bg-white rounded-md shadow-lg border p-5 mx-4 max-h-[90vh] overflow-y-auto"
              style={{ width: "600px" }}
            >
              <div className="mt-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    User Details
                  </h3>
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* User Basic Info - Two Column Layout */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <div className="text-xs text-gray-900">
                        {selectedUser.full_name || "N/A"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-medium text-gray-700 mb-1">
                        Current Strikes
                      </label>
                      <div className="text-xs text-gray-900">
                        {selectedUser.strike_count || 0}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${
                            selectedUser.account_status === "active"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : selectedUser.account_status === "suspended"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : selectedUser.account_status === "banned"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-green-100 text-green-800 border border-green-200"
                          }`}
                        >
                          {(selectedUser.account_status || "active")
                            .charAt(0)
                            .toUpperCase() +
                            (selectedUser.account_status || "active").slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="text-xs text-gray-900">
                        {selectedUser.email}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-medium text-gray-700 mb-1">
                        Suspensions
                      </label>
                      <div className="text-xs text-gray-900">
                        {selectedUser.suspension_count || 0}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-medium text-gray-700 mb-1">
                        Last Login
                      </label>
                      <div className="text-xs text-gray-900">
                        {selectedUser.last_login
                          ? formatDate(selectedUser.last_login)
                          : "Never"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin History & Audit Trail Section */}
                <div className="border-t border-gray-200 pt-6 mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Violations History Column */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-gray-600" />
                          <h4 className="text-xs font-medium text-gray-900">
                            Violations History
                          </h4>
                          <span className="text-[10px] text-gray-500">
                            ({userViolations.length} entries)
                          </span>
                        </div>
                      </div>

                      {userViolations.length > 0 ? (
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <div className="max-h-32 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                  </th>
                                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                                    Details
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {userViolations.map((violation) => (
                                  <tr
                                    key={violation.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-2 py-1.5">
                                      <div className="text-[9px] font-medium text-gray-900">
                                        {violation.action_taken.replace(
                                          "_",
                                          " "
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                                      {formatDate(violation.created_at)}
                                    </td>
                                    <td className="px-2 py-1.5 max-w-32">
                                      <div
                                        className="text-[9px] text-gray-700 truncate"
                                        title={violation.violation_summary}
                                      >
                                        {violation.violation_summary ||
                                          violation.violation_type.replace(
                                            "_",
                                            " "
                                          )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <AlertTriangle className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500">
                            No violations found
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Suspensions History Column */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <History className="h-3 w-3 text-gray-600" />
                          <h4 className="text-xs font-medium text-gray-900">
                            Suspensions History
                          </h4>
                          <span className="text-[10px] text-gray-500">
                            ({userSuspensions.length} entries)
                          </span>
                        </div>
                      </div>

                      {userSuspensions.length > 0 ? (
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <div className="max-h-32 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                  </th>
                                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {userSuspensions.map((suspension) => (
                                  <tr
                                    key={suspension.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-2 py-1.5">
                                      <div className="text-[9px] font-medium text-gray-900">
                                        {suspension.suspension_type} #
                                        {suspension.suspension_number}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="text-[9px]">
                                        <div
                                          className={`font-medium ${
                                            suspension.status === "active"
                                              ? "text-red-600"
                                              : suspension.status === "lifted"
                                              ? "text-green-600"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          {suspension.status}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                                      {formatDate(suspension.started_at)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <History className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500">
                            No suspensions found
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default BanRestrictUsers;
