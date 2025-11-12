import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { 
  User, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Eye, 
  Clock, 
  Ban, 
  AlertTriangle, 
  History,
  Minus,
  Shield
} from "lucide-react";
import usersService from "../../services/usersService";
import adminModerationService from "../../services/adminModerationService";
import DataTable from "../ui/DataTable";
import ListToolbar from "../ui/ListToolbar";

const BanRestrictUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Users");
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
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);

  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
        setDropdownPosition({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Constants
  const STATUS_FILTERS = ['All Users', 'Active Users', 'Suspended Users', 'Permanently Banned'];
  const SORT_OPTIONS = ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A', 'Most Strikes', 'Least Strikes'];
  const ITEMS_PER_PAGE = 10;
  const FETCH_LIMIT = 100;

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, sortBy, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, sortBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
        setDropdownPosition({});
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
      
      // Map status filter values to database account_status enum
      let apiStatusFilter = "";
      if (statusFilter === "Active" || statusFilter === "Active Users") {
        apiStatusFilter = "active";
      } else if (statusFilter === "Suspended Users") {
        apiStatusFilter = "suspended";
      } else if (statusFilter === "Permanently Banned") {
        apiStatusFilter = "banned";
      }
      
      console.log("Filter mapping:", { statusFilter, apiStatusFilter });
      
      const response = await usersService.getLegalSeekers({
        page: 1,
        limit: FETCH_LIMIT,
        search: searchTerm,
        status: apiStatusFilter,
        archived: "active",
      });

      let filteredUsers = response.data;

      // Apply client-side status filtering based on account_status enum
      if (statusFilter !== "All Users") {
        const statusMap = {
          "Active Users": "active",
          "Suspended Users": "suspended",
          "Permanently Banned": "banned"
        };
        filteredUsers = filteredUsers.filter(user => 
          user.account_status === statusMap[statusFilter]
        );
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
      console.log("Suspension data:", response.data?.map(u => ({ id: u.id, status: u.account_status, suspension_end: u.suspension_end })) || []);
      console.log("After filtering:", filteredUsers.length);
      console.log("Filter applied:", statusFilter);
      console.log("Pagination info:", response.pagination);
      console.log("Current page:", currentPage);
      console.log("Calculated total pages:", Math.ceil((response.pagination?.total || 0) / 10));

      // Apply client-side pagination
      const totalFiltered = filteredUsers.length;
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
      
      setUsers(paginatedUsers);
      setPagination({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        total: totalFiltered,
        pages: Math.ceil(totalFiltered / ITEMS_PER_PAGE)
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

      let successMessage = "";

      // Call the appropriate API endpoint
      if (actionType === "add_strike" || actionType === "remove_strike") {
        const strikeAction = actionType === "add_strike" ? "add" : "remove";
        await usersService.updateUserStrikes(
          selectedUser.id,
          strikeAction,
          actionReason
        );
        successMessage = actionType === "add_strike" ? "Strike added successfully" : "Strike removed successfully";
      } else if (actionType === "lift_suspension") {
        const response = await adminModerationService.liftSuspension(
          selectedUser.id,
          actionReason
        );
        successMessage = response.message || "Suspension lifted. Strikes reset to 0.";
      } else if (actionType === "lift_ban") {
        const response = await adminModerationService.liftBan(
          selectedUser.id,
          actionReason
        );
        successMessage = response.message || "Ban lifted. Strikes reset to 0. Suspension history preserved.";
      } else {
        await usersService.moderateUser(
          selectedUser.id,
          actionType,
          actionReason,
          actionDuration
        );
        successMessage = "Action completed successfully";
      }

      // Refresh the users list to show updated risk level and strikes
      await fetchUsers();

      // Log the action and risk level update
      console.log("✅", successMessage);
      console.log("🔄 User list refreshed - risk levels recalculated based on new strikes/suspensions");

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

  const handleDropdownToggle = (userId, event) => {
    if (openDropdown === userId) {
      setOpenDropdown(null);
      setDropdownPosition({});
      setDropdownAnchor(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    const bottom = Math.max(8, window.innerHeight - rect.top + 10);
    setDropdownPosition({ right, bottom });
    setDropdownAnchor(event.currentTarget);
    setOpenDropdown(userId);
  };

  const [dropdownAnchor, setDropdownAnchor] = useState(null);

  useEffect(() => {
    if (!openDropdown || !dropdownAnchor) return;

    const updatePosition = () => {
      const rect = dropdownAnchor.getBoundingClientRect();
      const right = Math.max(8, window.innerWidth - rect.right);
      const bottom = Math.max(8, window.innerHeight - rect.top + 10);
      setDropdownPosition({ right, bottom });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [openDropdown, dropdownAnchor]);

  const openUserDetailsModal = async (user) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
    setUserViolations([]);
    setUserSuspensions([]);

    try {
      const [violationsResponse, suspensionsResponse] = await Promise.all([
        adminModerationService.getUserViolations(user.id),
        adminModerationService.getUserSuspensions(user.id),
      ]);

      setUserViolations(violationsResponse.data || []);
      setUserSuspensions(suspensionsResponse.data || []);
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to load user details");
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
    // Calculate risk based on strike_count, suspension_count, and account_status
    // This function is called on every render, so risk level updates automatically
    const strikes = user.strike_count || 0;
    const suspensions = user.suspension_count || 0;
    const status = user.account_status;
    
    // High risk: Banned users or users with 3 strikes or 2+ suspensions
    if (status === "banned" || strikes >= 3 || suspensions >= 2) {
      return { level: "High", color: "text-red-600" };
    }
    
    // Medium risk: Suspended users or users with 1-2 strikes or 1 suspension
    if (status === "suspended" || strikes >= 1 || suspensions >= 1) {
      return { level: "Medium", color: "text-yellow-600" };
    }
    
    // Low risk: Active users with no violations
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
            {user.profile_photo ? (
              <img 
                src={user.profile_photo} 
                alt={user.full_name || 'User'}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center ${user.profile_photo ? 'hidden' : ''}`}>
              <User className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900">
                {user.full_name || "No name"}
              </div>
              {user.role === 'verified_lawyer' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Lawyer
                </span>
              )}
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
        // Risk level recalculates on every render based on current user data
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
        const strikes = user.strike_count || 0;
        const maxStrikes = 3;

        // Get strike description with suspension logic
        const getStrikeDescription = (strikeCount, suspensionCount) => {
          const suspensions = suspensionCount || 0;
          
          switch (strikeCount) {
            case 0:
              return `${strikeCount}/3 Strikes — No violations. User is in good standing.`;
            case 1:
              return `${strikeCount}/3 Strikes — First warning. 2 more strikes = suspension ${suspensions + 1}.`;
            case 2:
              if (suspensions >= 2) {
                return `${strikeCount}/3 Strikes — CRITICAL: Next strike = PERMANENT BAN (already had ${suspensions} suspensions).`;
              }
              return `${strikeCount}/3 Strikes — Final warning. Next strike = 7-day suspension ${suspensions + 1}.`;
            case 3:
              return `${strikeCount}/3 Strikes — User received suspension. Strikes reset after suspension.`;
            default:
              return `${strikeCount}/3 Strikes — Multiple violations detected.`;
          }
        };

        const tooltipContent = getStrikeDescription(strikes, user.suspension_count);


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
      key: "suspension_starts",
      header: "SUSPENSION STARTS",
      align: "center",
      render: (user) => {
        // Check if user is currently suspended
        if (user.account_status !== "suspended") {
          return (
            <div className="text-center text-sm text-gray-400">
              N/A
            </div>
          );
        }

        // Get suspension start date from last_violation_at (when the violation that caused suspension occurred)
        // Or calculate from suspension_end (7 days before end date)
        const suspensionStartDate = user.last_violation_at;
        
        if (!suspensionStartDate) {
          // If no start date available, calculate from suspension_end (7-day suspension)
          if (user.suspension_end) {
            const endDate = new Date(user.suspension_end);
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7);
            
            return (
              <div className="text-center">
                <div className="text-sm font-medium text-orange-600">
                  ~{formatDate(startDate.toISOString())}
                </div>
                <div className="text-xs text-gray-500">
                  (estimated)
                </div>
              </div>
            );
          }
          
          return (
            <div className="text-center text-sm text-gray-500">
              Unknown
            </div>
          );
        }

        return (
          <div className="text-center">
            <div className="text-sm font-medium text-orange-600">
              {formatDate(suspensionStartDate)}
            </div>
          </div>
        );
      },
    },
    {
      key: "suspension_ends",
      header: "SUSPENSION ENDS",
      align: "center",
      render: (user) => {
        // Check if user is currently suspended
        if (user.account_status !== "suspended") {
          return (
            <div className="text-center text-sm text-gray-400">
              N/A
            </div>
          );
        }

        // Get suspension end date from user data
        const suspensionEndDate = user.suspension_end;
        
        if (!suspensionEndDate) {
          return (
            <div className="text-center text-sm text-gray-500">
              Unknown
            </div>
          );
        }

        const endDate = new Date(suspensionEndDate);
        const now = new Date();
        const isExpired = endDate <= now;

        return (
          <div className="text-center">
            <div className={`text-sm font-medium ${
              isExpired ? "text-green-600" : "text-orange-600"
            }`}>
              {formatDate(suspensionEndDate)}
            </div>
            {isExpired && (
              <div className="text-xs text-green-500 mt-1">
                Expired
              </div>
            )}
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
          <div className="relative dropdown-container">
            <button
              onClick={(e) => handleDropdownToggle(user.id, e)}
              className={`flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 rounded-full transition-all duration-200 ${
                openDropdown === user.id ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

          {/* Dropdown Menu (Portal, fixed outside table) */}
          {openDropdown === user.id && ReactDOM.createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => { setOpenDropdown(null); setDropdownPosition({}); }}
              />
              <div
                className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]"
                style={{ right: dropdownPosition.right ?? 20, bottom: dropdownPosition.bottom ?? 20 }}
              >
                <div className="py-2">
                {/* View Details - Always available */}
                <button
                  onClick={() => {
                    openUserDetailsModal(user);
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

                {/* Add Strike - Always available */}
                <button
                  onClick={() => {
                    openActionModal(user, "add_strike");
                    setOpenDropdown(null);
                    setDropdownPosition({});
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
                      setDropdownPosition({});
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
                        openActionModal(user, "suspend_7days");
                        setOpenDropdown(null);
                        setDropdownPosition({});
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
                        setDropdownPosition({});
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

                {user.account_status === "suspended" && (
                  <button
                    onClick={() => {
                      openActionModal(user, "lift_suspension");
                      setOpenDropdown(null);
                      setDropdownPosition({});
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-3 text-green-500" />
                      <span>Lift Suspension</span>
                    </div>
                  </button>
                )}

                {user.account_status === "banned" && (
                  <button
                    onClick={() => {
                      openActionModal(user, "lift_ban");
                      setOpenDropdown(null);
                      setDropdownPosition({});
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-3 text-green-500" />
                      <span>Lift Ban</span>
                    </div>
                  </button>
                )}
                </div>
              </div>
            </>,
            document.body
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
            <h2 className="text-[12px] font-semibold text-gray-900">User Sanctions</h2>
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
            onChange: setStatusFilter, 
            options: STATUS_FILTERS, 
            label: 'Filter users' 
          }}
          sort={{ 
            value: sortBy, 
            onChange: setSortBy, 
            options: SORT_OPTIONS, 
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
      <>
        <DataTable
          columns={columns}
          data={users}
          rowKey={(row) => row.id}
          dense
          loading={loading}
          loadingMessage="Loading users..."
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

      {/* Action Modal */}
      {showActionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 border shadow-lg rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === "ban"
                  ? "Permanently Ban User from App"
                  : actionType === "suspend_7days"
                  ? "Suspend User (7 Days)"
                  : actionType === "add_strike"
                  ? "Add Strike"
                  : actionType === "remove_strike"
                  ? "Remove Strike"
                  : actionType === "unban"
                  ? "Restore App Access"
                  : actionType === "lift_suspension"
                  ? "Lift Suspension"
                  : actionType === "lift_ban"
                  ? "Lift Ban"
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

              {(actionType === "ban" || actionType === "suspend_7days") && (
                <>
                  <div className="mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">
                            {actionType === "ban"
                              ? "Permanent App Ban"
                              : "7-Day Suspension"}
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            {actionType === "ban"
                              ? "User will be permanently banned from the entire application and cannot access any features."
                              : "User will be suspended for 7 days and cannot access the application during this period."}
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
                        actionType === "ban" ? "permanent app ban" : "7-day suspension"
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

              {(actionType === "lift_suspension" || actionType === "lift_ban") && (
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800">
                          {actionType === "lift_suspension"
                            ? "Lift User Suspension"
                            : "Lift User Ban"}
                        </h4>
                        <p className="text-sm text-green-700 mt-1">
                          {actionType === "lift_suspension"
                            ? "User will be restored to active status. Strikes will be reset to 0."
                            : "User will be restored to active status. Strikes reset to 0. Suspension history is preserved for audit purposes."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Lifting {actionType === "lift_suspension" ? "Suspension" : "Ban"} (Required):
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter reason for lifting ${
                      actionType === "lift_suspension" ? "suspension" : "ban"
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
                      actionType !== "lift_suspension" &&
                      actionType !== "lift_ban" &&
                      !actionReason.trim()) ||
                    ((actionType === "lift_suspension" || actionType === "lift_ban") &&
                      !actionReason.trim())
                  }
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    actionType === "ban"
                      ? "bg-red-600 hover:bg-red-700"
                      : actionType === "suspend_7days"
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
                    : actionType === "suspend_7days"
                    ? "Suspend User (7 Days)"
                    : actionType === "add_strike"
                    ? "Add Strike"
                    : actionType === "remove_strike"
                    ? "Remove Strike"
                    : actionType === "unban"
                    ? "Restore App Access"
                    : actionType === "lift_suspension"
                    ? "Lift Suspension"
                    : actionType === "lift_ban"
                    ? "Lift Ban"
                    : "Remove Restrictions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      <Modal 
        open={showUserDetailsModal} 
        onClose={() => {}} 
        title="User Details" 
        width="max-w-4xl"
        showCloseButton={false}
      >
          {selectedUser && (
            <div className="space-y-4">
              {/* Account Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Account Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[9px] text-gray-500">Full Name</div>
                    <div className="text-xs font-medium text-gray-900">{selectedUser.full_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Email</div>
                    <div className="text-xs font-medium text-gray-900">{selectedUser.email || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Username</div>
                    <div className="text-xs font-medium text-gray-900">{selectedUser.username || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Current Strikes</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        (selectedUser.strike_count || 0) === 0 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : (selectedUser.strike_count || 0) < 3
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {selectedUser.strike_count || 0} strikes
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Total Suspensions</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        (selectedUser.suspension_count || 0) === 0 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : (selectedUser.suspension_count || 0) < 2
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : (selectedUser.suspension_count || 0) === 2
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {selectedUser.suspension_count || 0} suspension{(selectedUser.suspension_count || 0) !== 1 ? 's' : ''}
                      </span>
                      {(selectedUser.suspension_count || 0) >= 2 && selectedUser.account_status !== 'banned' && (
                        <span className="text-[9px] text-red-600 font-medium">
                          ⚠️ Next = Ban
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Account Status</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        selectedUser.account_status === 'active'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : selectedUser.account_status === 'suspended'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : selectedUser.account_status === 'banned'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {(selectedUser.account_status || 'unknown').charAt(0).toUpperCase() + (selectedUser.account_status || 'unknown').slice(1)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">User Role</div>
                    <div className="text-xs font-medium text-gray-900">
                      {selectedUser.role ? selectedUser.role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Account Created</div>
                    <div className="text-xs text-gray-700">{selectedUser.created_at ? formatDate(selectedUser.created_at) : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Last Updated</div>
                    <div className="text-xs text-gray-700">{selectedUser.updated_at ? formatDate(selectedUser.updated_at) : 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Suspension Logic Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <h4 className="text-xs font-medium text-blue-900 mb-2">📋 Suspension System Logic</h4>
                  <div className="space-y-1 text-[10px] text-blue-800">
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[60px]">Rule 1:</span>
                      <span>3 strikes = 1 suspension (strikes reset after suspension)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[60px]">Rule 2:</span>
                      <span>First 2 suspensions = 7-day temporary ban</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[60px]">Rule 3:</span>
                      <span className="text-red-700 font-medium">3rd suspension = PERMANENT BAN</span>
                    </div>
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-blue-300">
                      <span className="font-medium min-w-[60px]">Admin:</span>
                      <span className="text-green-700 font-medium">Lift Suspension = strikes→0 | Lift Ban = strikes→0 (suspension history preserved)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Moderation Details */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Moderation Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[9px] text-gray-500">Last Violation</div>
                    <div className="text-xs text-gray-700">{selectedUser.last_violation_at ? formatDate(selectedUser.last_violation_at) : 'No violations'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Banned At</div>
                    <div className="text-xs text-gray-700">{selectedUser.banned_at ? formatDate(selectedUser.banned_at) : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Ban Reason</div>
                    <div className="text-xs text-gray-700 truncate" title={selectedUser.banned_reason || 'N/A'}>
                      {selectedUser.banned_reason || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Suspension Ends</div>
                    <div className="text-xs text-gray-700">{selectedUser.suspension_end ? formatDate(selectedUser.suspension_end) : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Auth Provider</div>
                    <div className="text-xs text-gray-700">{selectedUser.auth_provider || 'email'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">Verified Status</div>
                    <div className="text-xs">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        selectedUser.is_verified 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {selectedUser.is_verified ? 'Verified' : 'Not Verified'}
                      </span>
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
                                    <tr key={violation.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                                      setSelectedViolation(violation);
                                      setShowViolationModal(true);
                                    }}>
                                      <td className="px-2 py-1.5">
                                        <div className="text-[9px] font-medium text-gray-900">
                                          {violation.action_taken.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                                        {formatDate(violation.created_at)}
                                      </td>
                                      <td className="px-2 py-1.5 max-w-32">
                                        <div className="text-[9px] text-gray-700 truncate" title={violation.violation_summary || violation.violation_type.replace('_', ' ')}>
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
                            <div className="max-h-40 overflow-y-auto">
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
                                      Dates
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {userSuspensions.map((suspension) => (
                                    <tr key={suspension.id} className="hover:bg-gray-50">
                                      <td className="px-2 py-1.5">
                                        <div className="text-[9px] font-medium text-gray-900">
                                          {suspension.suspension_type ? suspension.suspension_type.charAt(0).toUpperCase() + suspension.suspension_type.slice(1) : 'Unknown'} #{suspension.suspension_number}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 align-middle">
                                        <div className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-medium rounded-full ${
                                          suspension.status === 'active' ? 'bg-red-100 text-red-700' :
                                          suspension.status === 'lifted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          {suspension.status === 'temporary' ? 'Temporary' : 
                                           suspension.status === 'active' ? 'Active' :
                                           suspension.status === 'lifted' ? 'Lifted' :
                                           suspension.status ? suspension.status.charAt(0).toUpperCase() + suspension.status.slice(1) : 'Unknown'}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 text-[9px] text-gray-500">
                                        <div className="space-y-0.5">
                                          <div>Start: {formatDate(suspension.started_at).split(',')[0]}</div>
                                          {suspension.ends_at && (
                                            <div>End: {formatDate(suspension.ends_at).split(',')[0]}</div>
                                          )}
                                          {suspension.lifted_at && (
                                            <div className="text-green-600">Lifted: {formatDate(suspension.lifted_at).split(',')[0]}</div>
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
                            <History className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-[10px] text-gray-500">No suspensions found</p>
                          </div>
                        )}
                      </div>
                    </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B]"
                  >
                    Close
                  </button>
                </div>
            </div>
          )}
      </Modal>

      {/* Violation Details Modal */}
      <Modal
        open={showViolationModal}
        onClose={() => setShowViolationModal(false)}
        title="Violation Details"
        width="max-w-2xl"
      >
        {selectedViolation && (
          <div className="space-y-4">
            {/* Violation Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  {selectedViolation.action_taken.replace('_', ' ')}
                </h3>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedViolation.created_at)}
                </span>
              </div>
            </div>

            {/* Violation Details */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Action Type
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedViolation.action_taken.replace('_', ' ')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Violation Type
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedViolation.violation_type.replace('_', ' ')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Summary
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedViolation.violation_summary || 'No summary available'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Admin
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedViolation.admin_name || 'System'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Timestamp
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(selectedViolation.created_at, true)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BanRestrictUsers;
