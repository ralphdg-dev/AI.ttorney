import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Search,
  Shield,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Eye,
  History,
} from "lucide-react";
import usersService from "../../services/usersService";
import adminModerationService from "../../services/adminModerationService";
import DataTable from "../ui/DataTable";
import Pagination from "../ui/Pagination";
import Tooltip from "../ui/Tooltip";

const SuspendedAccounts = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [suspensionFilter, setSuspensionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Lift suspension modal
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [liftReason, setLiftReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // User details modal
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userViolations, setUserViolations] = useState([]);
  const [userSuspensions, setUserSuspensions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const suspensionOptions = [
    { value: "all", label: "All Suspended Users" },
    { value: "suspended", label: "Currently Suspended" },
    { value: "banned", label: "Permanently Banned" },
  ];

  useEffect(() => {
    fetchSuspendedUsers();
  }, [searchTerm, suspensionFilter, currentPage]);

  const fetchSuspendedUsers = async () => {
    try {
      setLoading(true);
      const response = await usersService.getLegalSeekers({
        page: currentPage,
        limit: 50,
        search: searchTerm,
        status: suspensionFilter === "all" ? "" : suspensionFilter,
        archived: "active",
      });

      // Filter to only show suspended or banned users
      let filteredUsers = response.data.filter((user) => 
        user.account_status === 'suspended' || user.account_status === 'banned'
      );

      // Apply suspension-specific filtering
      if (suspensionFilter !== "all") {
        filteredUsers = filteredUsers.filter((user) => 
          user.account_status === suspensionFilter
        );
      }


      setUsers(filteredUsers);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching suspended users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLiftSuspension = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);

      await usersService.moderateUser(
        selectedUser.id,
        "unban",
        liftReason,
        "permanent"
      );

      // Refresh the users list
      await fetchSuspendedUsers();

      // Close modal and reset state
      setShowLiftModal(false);
      setSelectedUser(null);
      setLiftReason("");
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error lifting suspension:", err);
    } finally {
      setProcessing(false);
    }
  };

  const openLiftModal = (user) => {
    setSelectedUser(user);
    setShowLiftModal(true);
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

  const getSuspensionStatusBadge = (user) => {
    switch (user.account_status) {
      case 'banned':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Permanently Banned
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Suspended
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

  const getSuspensionDuration = (user) => {
    // This would calculate remaining suspension time
    // For now, we'll show basic info
    const suspensionCount = user.suspension_count || 0;
    const isPermanentlyBanned = user.account_status === 'banned';
    
    if (isPermanentlyBanned) {
      return "Permanent";
    }
    
    if (suspensionCount > 0) {
      return `${suspensionCount} suspension${suspensionCount > 1 ? 's' : ''}`;
    }
    
    return "Unknown";
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
      key: "suspension_status",
      header: "SUSPENSION STATUS",
      render: (user) => getSuspensionStatusBadge(user),
    },
    {
      key: "suspension_info",
      header: "SUSPENSION INFO",
      align: "center",
      render: (user) => {
        const suspensionCount = user.suspension_count || 0;
        const strikes = user.strike_count || 0;
        
        return (
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {getSuspensionDuration(user)}
            </div>
            <div className="text-xs text-gray-500">
              {strikes} strikes • {suspensionCount} suspensions
            </div>
          </div>
        );
      },
    },
    {
      key: "suspension_date",
      header: "SUSPENDED ON",
      align: "center",
      render: (user) => {
        // This would show the actual suspension date from the database
        // For now, using created_at as placeholder
        const suspensionDate = user.ends_at || user.started_at;
        
        return (
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {formatDate(suspensionDate)}
          </div>
        );
      },
    },
    {
      key: "joined",
      header: "JOINED",
      align: "center",
      render: (user) => {
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
          
          {/* Lift Suspension - Only show for suspended/banned users */}
          {(user.account_status === 'suspended' || user.account_status === 'banned') && (
            <Tooltip content="Lift Suspension" placement="top">
              <button
                onClick={() => openLiftModal(user)}
                className="text-green-600 hover:text-green-900 hover:scale-110 transition-all duration-200 p-1 rounded"
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
            Suspended Accounts
          </h1>
          <p className="text-gray-600">
            Manage suspended and banned user accounts
            {pagination.total && (
              <span className="ml-2 text-sm font-medium text-blue-600">
                ({users.length} suspended users)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search suspended users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Suspension Status Filter */}
          <select
            value={suspensionFilter}
            onChange={(e) => setSuspensionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {suspensionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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

      {/* Suspended Users Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading suspended users...</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            keyField="id"
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No suspended users found matching your criteria.</p>
              </div>
            }
          />

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={50}
              onPageChange={setCurrentPage}
              itemName="suspended users"
            />
          )}
        </>
      )}

      {/* Lift Suspension Modal */}
      {showLiftModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Lift Suspension
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">User:</p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium">
                    {selectedUser.full_name || "No name"}
                  </p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Current Status: {getSuspensionStatusBadge(selectedUser)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Lifting Suspension (Optional):
                </label>
                <textarea
                  value={liftReason}
                  onChange={(e) => setLiftReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reason for lifting suspension..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLiftModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>

                <button
                  onClick={handleLiftSuspension}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Lift Suspension"}
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
                  Suspended User Details
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
                        selectedUser.account_status === 'suspended'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : selectedUser.account_status === 'banned'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {(selectedUser.account_status || 'unknown').charAt(0).toUpperCase() + (selectedUser.account_status || 'unknown').slice(1)}
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
                      Total Suspensions
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

export default SuspendedAccounts;
