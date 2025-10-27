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
} from "lucide-react";
import usersService from "../../services/usersService";
import adminModerationService from "../../services/adminModerationService";
import DataTable from "../ui/DataTable";
import Pagination from "../ui/Pagination";
import Tooltip from "../ui/Tooltip";

const BanRestrictUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Ban/Restrict modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(""); // 'ban', 'restrict', 'unban', 'add_strike', 'remove_strike'
  const [actionReason, setActionReason] = useState("");
  const [actionDuration, setActionDuration] = useState("permanent");
  const [processing, setProcessing] = useState(false);

  // User details modal
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userViolations, setUserViolations] = useState([]);
  const [userSuspensions, setUserSuspensions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const statusOptions = [
    { value: "all", label: "All Users" },
    { value: "active", label: "Active Users" },
    { value: "banned", label: "Banned Users" },
    { value: "restricted", label: "Restricted Users" },
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
  }, [searchTerm, statusFilter, riskFilter, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersService.getLegalSeekers({
        page: currentPage,
        limit: 50, // Increased from 20 to 50 to show more users per page
        search: searchTerm,
        status: statusFilter === "all" ? "" : statusFilter, // Use empty string instead of "all"
        archived: "active",
      });

      let filteredUsers = response.data;

      // Apply risk-based filtering
      if (riskFilter !== "all") {
        filteredUsers = response.data.filter((user) => {
          const riskLevel = getUserRiskLevel(user);
          return riskLevel.level.toLowerCase() === riskFilter;
        });
      }

      console.log("Users API response:", response);
      console.log("Total users fetched:", filteredUsers.length);
      console.log("Pagination info:", response.pagination);

      setUsers(filteredUsers);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
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
      if (actionType === 'add_strike' || actionType === 'remove_strike') {
        const strikeAction = actionType === 'add_strike' ? 'add' : 'remove';
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
        adminModerationService.getUserSuspensions(user.id)
      ]);

      setUserViolations(violationsResponse.data || []);
      setUserSuspensions(suspensionsResponse.data || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to load user details');
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
      case 'banned':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Banned
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Suspended
          </span>
        );
      case 'active':
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
        const isPermanentlyBanned = user.account_status === 'banned';

        // Get strike description
        const getStrikeDescription = (strikeCount) => {
          switch (strikeCount) {
            case 0:
              return `${strikeCount}/3 Strikes — No violations. User is in good standing.`;
            case 1:
              return `${strikeCount}/3 Strikes — Warning issued for guideline violation.`;
            case 2:
              return `${strikeCount}/3 Strikes — Second warning. Next violation leads to suspension.`;
            case 3:
              return `${strikeCount}/3 Strikes — User is suspended for repeated violations.`;
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
        const isPermanentlyBanned = user.account_status === 'banned';

        return (
          <div className="text-center">
            <span
              className={`text-sm font-medium ${
                isPermanentlyBanned
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
                  ? "Permanently banned"
                  : `${suspensionCount} suspension${
                      suspensionCount > 1 ? "s" : ""
                    }`}
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
        <div className="flex space-x-1 justify-center">
          {/* View User Details */}
          <Tooltip content="View Details" placement="top">
            <button
              onClick={() => openUserDetailsModal(user)}
              className="text-blue-600 hover:text-blue-900 hover:scale-110 transition-all duration-200 p-1 rounded"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Tooltip>
          
          {/* Strike Management */}
          <Tooltip content="Add Strike" placement="top">
            <button
              onClick={() => openActionModal(user, "add_strike")}
              className="text-orange-600 hover:text-orange-900 hover:scale-110 transition-all duration-200 p-1 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
          
          {/* Only show remove strike if user has strikes */}
          {(user.strike_count || 0) > 0 && (
            <Tooltip content="Remove Strike" placement="top">
              <button
                onClick={() => openActionModal(user, "remove_strike")}
                className="text-green-600 hover:text-green-900 hover:scale-110 transition-all duration-200 p-1 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {user.account_status === 'active' && (
            <>
              <Tooltip content="Restrict User" placement="top">
                <button
                  onClick={() => openActionModal(user, "restrict")}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Ban User" placement="top">
                <button
                  onClick={() => openActionModal(user, "ban")}
                  className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
                >
                  <Ban className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}

          {(user.account_status === 'banned' || user.account_status === 'suspended') && (
            <Tooltip content="Restore User" placement="top">
              <button
                onClick={() => openActionModal(user, "unban")}
                className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 p-1 rounded"
              >
                <Shield className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ban/Restrict Users
          </h1>
          <p className="text-gray-600">
            Manage user access and restrictions
            {pagination.total && (
              <span className="ml-2 text-sm font-medium text-blue-600">
                ({pagination.total} total users)
              </span>
            )}
          </p>
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
              placeholder="Search users..."
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

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {riskOptions.map((risk) => (
              <option key={risk.value} value={risk.value}>
                {risk.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            keyField="id"
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No users found matching your criteria.</p>
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
              itemName="users"
            />
          )}
        </>
      )}

      {/* Action Modal */}
      {showActionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === "ban"
                  ? "Ban User"
                  : actionType === "restrict"
                  ? "Restrict User"
                  : actionType === "add_strike"
                  ? "Add Strike"
                  : actionType === "remove_strike"
                  ? "Remove Strike"
                  : "Restore User Access"}
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

              {actionType !== "unban" && actionType !== "add_strike" && actionType !== "remove_strike" && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration:
                    </label>
                    <select
                      value={actionDuration}
                      onChange={(e) => setActionDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {durationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                      placeholder={`Enter reason for ${actionType}...`}
                    />
                  </div>
                </>
              )}

              {(actionType === "add_strike" || actionType === "remove_strike") && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Required):
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter reason for ${actionType === "add_strike" ? "adding" : "removing"} strike...`}
                  />
                </div>
              )}

              {actionType === "unban" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restoration Notes (Optional):
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter notes about restoring access..."
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
                    (actionType !== "unban" && !actionReason.trim())
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
                    ? "Ban User"
                    : actionType === "restrict"
                    ? "Restrict User"
                    : actionType === "add_strike"
                    ? "Add Strike"
                    : actionType === "remove_strike"
                    ? "Remove Strike"
                    : "Restore Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-md shadow-lg border p-5 mx-4 max-h-[90vh] overflow-y-auto" style={{ width: '600px' }}>
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
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="text-xs text-gray-900">
                      {selectedUser.full_name || 'N/A'}
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
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${
                        selectedUser.account_status === 'active' 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : selectedUser.account_status === 'suspended'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : selectedUser.account_status === 'banned'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {(selectedUser.account_status || 'active').charAt(0).toUpperCase() + (selectedUser.account_status || 'active').slice(1)}
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
                      {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin History & Audit Trail Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Violations History Column */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-gray-600" />
                          <h4 className="text-xs font-medium text-gray-900">Violations History</h4>
                          <span className="text-[10px] text-gray-500">({userViolations.length} entries)</span>
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
                                  <tr key={violation.id} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5">
                                      <div className="text-[9px] font-medium text-gray-900">
                                        {violation.action_taken.replace('_', ' ')}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                                      {formatDate(violation.created_at)}
                                    </td>
                                    <td className="px-2 py-1.5 max-w-32">
                                      <div className="text-[9px] text-gray-700 truncate" title={violation.violation_summary}>
                                        {violation.violation_summary || violation.violation_type.replace('_', ' ')}
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
                          <p className="text-[10px] text-gray-500">No violations found</p>
                        </div>
                      )}
                    </div>

                    {/* Suspensions History Column */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <History className="h-3 w-3 text-gray-600" />
                          <h4 className="text-xs font-medium text-gray-900">Suspensions History</h4>
                          <span className="text-[10px] text-gray-500">({userSuspensions.length} entries)</span>
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
                                  <tr key={suspension.id} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5">
                                      <div className="text-[9px] font-medium text-gray-900">
                                        {suspension.suspension_type} #{suspension.suspension_number}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="text-[9px]">
                                        <div className={`font-medium ${
                                          suspension.status === 'active' ? 'text-red-600' :
                                          suspension.status === 'lifted' ? 'text-green-600' : 'text-gray-600'
                                        }`}>
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
                          <p className="text-[10px] text-gray-500">No suspensions found</p>
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
