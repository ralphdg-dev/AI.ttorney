import React from 'react';
import ReactDOM from 'react-dom';
import { Users, Eye, Pencil, Archive, ArchiveRestore, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Loader2, XCircle, Shield, MoreVertical } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import ViewAdminModal from '../../components/admin/ViewAdminModal';
import AddAdminModal from '../../components/admin/AddAdminModal';
import EditAdminModal from '../../components/admin/EditAdminModal';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import { useToast } from '../../components/ui/Toast';
import adminManagementService from '../../services/adminManagementService';
import { useAuth } from '../../contexts/AuthContext';

const RoleBadge = ({ role, isArchived = false }) => {
  const getStyles = () => {
    if (isArchived) {
      return 'bg-gray-200 text-gray-600 border border-gray-300';
    }

    return role === 'superadmin'
      ? 'bg-purple-50 text-purple-700 border border-purple-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200';
  };
  
  const displayRole = role === 'superadmin' ? 'Superadmin' : 'Admin';
  
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStyles()}`}>
      {displayRole}
    </span>
  );
};

const StatusBadge = ({ status, isArchived = false }) => {
  const getStatusStyles = (status) => {
    if (isArchived) {
      return 'bg-gray-200 text-gray-600 border border-gray-300';
    }
    
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'disabled':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'archived':
        return 'bg-gray-200 text-gray-600 border border-gray-300';
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  const getDisplayStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'disabled':
        return 'Disabled';
      case 'archived':
        return 'Archived';
      default:
        return 'Active';
    }
  };

  const styles = getStatusStyles(status);
  const displayStatus = getDisplayStatus(status);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {displayStatus}
    </span>
  );
};

const ManageAdmins = () => {
  const { showSuccess, showError, showWarning, ToastContainer } = useToast();
  const { admin: currentAdmin } = useAuth();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [status, setStatus] = React.useState('All');
  const [roleFilter, setRoleFilter] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [data, setData] = React.useState([]);
  const [allData, setAllData] = React.useState([]); // Store all data for client-side filtering
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [sortConfig, setSortConfig] = React.useState({
    key: null,
    direction: 'asc'
  });
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showViewModal, setShowViewModal] = React.useState(false);
  const [selectedAdmin, setSelectedAdmin] = React.useState(null);
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    adminId: null,
    adminName: '',
    loading: false,
    changes: null // For tracking edit changes
  });

  // Kebab dropdown state
  const [openDropdown, setOpenDropdown] = React.useState(null);
  const [dropdownPosition, setDropdownPosition] = React.useState({});
  const [dropdownAnchor, setDropdownAnchor] = React.useState(null);

  const handleDropdownToggle = (rowId, event) => {
    if (openDropdown === rowId) {
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
    setOpenDropdown(rowId);
  };

  // Close on outside click (ignore clicks within portal)
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        openDropdown &&
        !event.target.closest('.dropdown-container') &&
        !event.target.closest('.dropdown-portal')
      ) {
        setOpenDropdown(null);
        setDropdownPosition({});
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Recompute position on scroll/resize
  React.useEffect(() => {
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

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [query]);

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simple role filter mapping
      const mapRoleFilter = (filter) => {
        switch (filter) {
          case 'All Roles': return 'all';
          case 'Superadmin': return 'superadmin';
          case 'Admin': return 'admin';
          case 'Archived': return 'all';
          default: return 'all';
        }
      };
      
      const role = mapRoleFilter(roleFilter);
      console.log('Role filter:', roleFilter, '-> API role:', role);

      const params = {
        page: 1, // Always start from page 1 for search
        limit: 100, // Load more data for better client-side filtering
        search: debouncedQuery,
        role
      };
      
      const response = await adminManagementService.getAdmins(params);
      setAllData(response.data || []);
      setPagination(prev => ({ ...prev, total: response.pagination?.total || 0, pages: Math.ceil((response.pagination?.total || 0) / 10) }));
    } catch (err) {
      console.error('Error loading admins:', err);
      const errorMessage = err.message || 'Failed to load admins';
      setError(errorMessage);
      setAllData([]);
      setData([]);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedQuery, roleFilter]);
  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle view admin details
  const handleView = (admin) => {
    setSelectedAdmin(admin);
    setShowViewModal(true);
  };

  // Handle edit admin
  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setShowEditModal(true);
  };

  // Handle archive button click
  const handleArchive = (admin) => {
    const isCurrentlyArchived = admin.status === 'archived';
    const modalType = isCurrentlyArchived ? 'unarchive' : 'archive';
    
    setConfirmationModal({
      open: true,
      type: modalType,
      adminId: admin.id,
      adminName: admin.full_name || admin.email || 'Unknown',
      loading: false
    });
  };

  // Handle disable/enable admin
  const handleDisable = (admin) => {
    const isCurrentlyDisabled = (admin.status || '').toLowerCase() === 'disabled';
    const modalType = isCurrentlyDisabled ? 'enable' : 'disable';

    setConfirmationModal({
      open: true,
      type: modalType,
      adminId: admin.id,
      adminName: admin.full_name || admin.email || 'Unknown',
      loading: false
    });
  };

  // Handle unarchive admin (for backward compatibility)
  const handleUnarchive = (admin) => {
    setConfirmationModal({
      open: true,
      type: 'unarchive',
      adminId: admin.id,
      adminName: admin.full_name || admin.email || 'Unknown',
      loading: false
    });
  };

  // Helper function to get modal content based on type
  const getModalContent = () => {
    const { type, adminName, changes } = confirmationModal;
    
    switch (type) {
      case 'archive':
        return {
          title: 'Archive Admin',
          message: `Are you sure you want to archive ${adminName}? Archived admins will be hidden from the main list but can be accessed through the "Archived" filter.`,
          confirmText: 'Archive Admin',
          onConfirm: confirmStatusChange
        };
      case 'unarchive':
        return {
          title: 'Unarchive Admin',
          message: `Are you sure you want to unarchive ${adminName}? They will be restored to the active admins list.`,
          confirmText: 'Unarchive Admin',
          onConfirm: confirmStatusChange
        };
      case 'disable':
        return {
          title: 'Disable Admin',
          message: `Are you sure you want to disable ${adminName}? They will not be able to log in until enabled again.`,
          confirmText: 'Disable Admin',
          onConfirm: confirmStatusChange
        };
      case 'enable':
        return {
          title: 'Enable Admin',
          message: `Are you sure you want to enable ${adminName}? They will be able to log in again.`,
          confirmText: 'Enable Admin',
          onConfirm: confirmStatusChange
        };
      case 'edit':
        return {
          title: 'Confirm Admin Changes',
          message: `Are you sure you want to save these changes to ${adminName}?`,
          confirmText: 'Save Changes',
          onConfirm: confirmEdit,
          changes: changes // Pass the structured changes object
        };
      default:
        return {};
    }
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ open: false, type: '', adminId: null, adminName: '', loading: false, changes: null });
  };

  // Handle archive/unarchive/disable/enable admin status changes
  const confirmStatusChange = async () => {
    const { adminId, adminName, type } = confirmationModal;
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));

      let newStatus = 'active';
      let successAction = '';
      switch (type) {
        case 'archive':
          newStatus = 'archived';
          successAction = 'archived';
          break;
        case 'unarchive':
          newStatus = 'active';
          successAction = 'unarchived';
          break;
        case 'disable':
          newStatus = 'disabled';
          successAction = 'disabled';
          break;
        case 'enable':
          newStatus = 'active';
          successAction = 'enabled';
          break;
        default:
          newStatus = 'active';
          successAction = 'updated';
      }

      await adminManagementService.updateAdmin(adminId, { status: newStatus });
      await loadData();
      setConfirmationModal({ open: false, type: '', adminId: null, adminName: '', loading: false, changes: null });
      showSuccess(`Admin "${adminName}" ${successAction} successfully!`);
    } catch (err) {
      console.error('Failed to update admin status:', err);
      showError('Failed to update admin status: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle edit confirmation
  const confirmEdit = async () => {
    const { adminId, changes } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // Apply the changes (in this case, only status changes are supported)
      if (changes && changes.Status) {
        await adminManagementService.updateAdmin(adminId, { status: changes.Status.to.toLowerCase() });
      }
      
      await loadData(); // Reload data
      setShowEditModal(false); // Close edit modal
      setConfirmationModal({ open: false, type: '', adminId: null, adminName: '', loading: false, changes: null });
      
      showSuccess(`Admin status updated successfully!`);
      
    } catch (err) {
      console.error('Failed to update admin:', err);
      showError('Failed to update admin: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle add admin - directly open modal
  const handleAddAdmin = () => {
    setShowAddModal(true);
  };

  // Handle confirmed add admin
  const handleConfirmedAddAdmin = () => {
    setShowAddModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowAddModal(false);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setShowEditModal(false);
    setSelectedAdmin(null);
  };

  // Handle view modal close
  const handleViewModalClose = () => {
    setShowViewModal(false);
    setSelectedAdmin(null);
  };

  // Handle admin creation success
  const handleAdminCreated = (newAdmin) => {
    // Reload the data to show the new admin
    loadData();
    setShowAddModal(false);
    showSuccess(`Admin "${newAdmin.full_name || newAdmin.email}" created successfully!`);
  };

  // Handle admin update success - intercept to show confirmation with changes
  const handleAdminUpdated = (updatedAdmin, originalAdmin) => {
    // Compare original and updated admin to show changes
    const changes = {};
    
    if (originalAdmin && updatedAdmin) {
      // Check for status changes
      if (originalAdmin.status !== updatedAdmin.status) {
        changes.Status = {
          from: originalAdmin.status,
          to: updatedAdmin.status
        };
      }
      
      // Check for other potential changes (role, etc.)
      if (originalAdmin.role !== updatedAdmin.role) {
        changes.Role = {
          from: originalAdmin.role,
          to: updatedAdmin.role
        };
      }
    }
    
    // If there are changes, show confirmation modal
    if (Object.keys(changes).length > 0) {
      setConfirmationModal({
        open: true,
        type: 'edit',
        adminId: updatedAdmin.id,
        adminName: updatedAdmin.full_name || updatedAdmin.email || 'Unknown',
        loading: false,
        changes: changes
      });
    } else {
      // No changes, just close the modal
      setShowEditModal(false);
    }
  };

  // Handle column sorting
  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
    // Clear the dropdown sort when using column sort
    setSortBy('Newest');
  };

  // Handle dropdown sort change
  const handleSortByChange = (newSortBy) => {
    setSortBy(newSortBy);
    // Clear column sort when using dropdown sort
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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

    // Apply client-side search filter for immediate feedback
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredArray = filteredArray.filter(item => {
        return (
          (item.full_name || '').toLowerCase().includes(searchTerm) ||
          (item.email || '').toLowerCase().includes(searchTerm)
        );
      });
    }

    // Status-based filter
    if (roleFilter === 'Archived') {
      filteredArray = filteredArray.filter(item => item.status === 'archived');
    } else if (roleFilter === 'Disabled') {
      filteredArray = filteredArray.filter(item => (item.status || '').toLowerCase() === 'disabled');
    } else {
      // Default: exclude archived; include active and disabled
      filteredArray = filteredArray.filter(item => item.status !== 'archived');
    }

    // Apply column sorting if active
    if (sortConfig.key) {
      filteredArray = filteredArray.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle different data types
        let comparison = 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at' || sortConfig.key === 'last_login') {
          comparison = new Date(aValue) - new Date(bValue);
        } else if (typeof aValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else {
          comparison = aValue - bValue;
        }

        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }
    // Apply dropdown sorting if no column sort is active
    else if (sortBy !== 'Newest') {
      filteredArray = filteredArray.sort((a, b) => {
        switch (sortBy) {
          case 'Oldest':
            return new Date(a.created_at) - new Date(b.created_at);
          case 'Name A-Z':
            return (a.full_name || '').localeCompare(b.full_name || '');
          case 'Name Z-A':
            return (b.full_name || '').localeCompare(a.full_name || '');
          case 'Email A-Z':
            return (a.email || '').localeCompare(b.email || '');
          case 'Email Z-A':
            return (b.email || '').localeCompare(a.email || '');
          case 'Role A-Z':
            return (a.role || '').localeCompare(b.role || '');
          case 'Role Z-A':
            return (b.role || '').localeCompare(a.role || '');
          case 'Last Login Recent':
            return new Date(b.last_login || 0) - new Date(a.last_login || 0);
          case 'Last Login Oldest':
            return new Date(a.last_login || 0) - new Date(b.last_login || 0);
          case 'Newest':
          default:
            return new Date(b.created_at) - new Date(a.created_at);
        }
      });
    }
    // Default sort by newest creation date
    else {
      filteredArray = filteredArray.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return filteredArray;
  }, [allData, query, sortConfig, sortBy]);

  // Paginate the filtered data
  const paginatedData = React.useMemo(() => {
    const startIndex = (pagination.page - 1) * 10;
    const endIndex = startIndex + 10;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, pagination.page]);

  // Update pagination when filtered data changes
  React.useEffect(() => {
    const totalFiltered = filteredAndSortedData.length;
    const totalPages = Math.ceil(totalFiltered / 10);
    setPagination(prev => ({ 
      ...prev, 
      total: totalFiltered, 
      pages: totalPages,
      page: prev.page > totalPages && totalPages > 0 ? 1 : prev.page
    }));
  }, [filteredAndSortedData]);

  const columns = [
    { 
      key: 'full_name', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('full_name')}
        >
          <span>Full Name</span>
          {sortConfig.key === 'full_name' ? (
            sortConfig.direction === 'asc' ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      )
    },
    { 
      key: 'email', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('email')}
        >
          <span>Email</span>
          {sortConfig.key === 'email' ? (
            sortConfig.direction === 'asc' ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      )
    },
    {
      key: 'role',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('role')}
        >
          <span>Role</span>
          {sortConfig.key === 'role' ? (
            sortConfig.direction === 'asc' ? (
              <ChevronUp size={14} className="text-blue-600" />
            ) : (
              <ChevronDown size={14} className="text-blue-600" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      ),
      render: (row) => <RoleBadge role={row.role} isArchived={row.status === 'archived'} />,
    },
    { 
      key: 'created_at', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('created_at')}
        >
          <span>Created Date</span>
          {sortConfig.key === 'created_at' ? (
            sortConfig.direction === 'asc' ? (
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
        const date = new Date(row.created_at);
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          timeZone: 'Asia/Manila'
        }).format(date);
      }
    },
    { 
      key: 'updated_at', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('updated_at')}
        >
          <span>Last Updated</span>
          {sortConfig.key === 'updated_at' ? (
            sortConfig.direction === 'asc' ? (
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
        if (!row.updated_at) return 'Never';
        const date = new Date(row.updated_at);
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          timeZone: 'Asia/Manila'
        }).format(date);
      }
    },
    { 
      key: 'last_login', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('last_login')}
        >
          <span>Last Login</span>
          {sortConfig.key === 'last_login' ? (
            sortConfig.direction === 'asc' ? (
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
        if (!row.last_login) return 'Never';
        
        // Parse the UTC timestamp properly
        const date = new Date(row.last_login);
        const now = new Date();
        
        // Calculate difference in milliseconds, then convert to minutes and hours
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        
        
        // Show relative time for recent logins, absolute date for older ones
        if (diffInMinutes < 1) {
          return 'Just now';
        } else if (diffInMinutes < 60) {
          return `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
          return `${diffInHours}h ago`;
        } else if (diffInDays < 7) {
          return `${diffInDays}d ago`;
        } else {
          return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric', 
            year: 'numeric',
            timeZone: 'Asia/Manila'
          }).format(date);
        }
      }
    },
    { 
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} isArchived={row.status === 'archived'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <div className="relative dropdown-container">
            <button
              onClick={(e) => handleDropdownToggle(row.id, e)}
              className={`flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 rounded-full transition-all duration-200 ${openDropdown === row.id ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {openDropdown === row.id && ReactDOM.createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => { setOpenDropdown(null); setDropdownPosition({}); }}
                />
                <div
                  className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] dropdown-portal"
                  style={{ right: dropdownPosition.right ?? 20, bottom: dropdownPosition.bottom ?? 20 }}
                >
                  <div className="py-2">
                    <button
                      onClick={() => { handleView(row); setOpenDropdown(null); setDropdownPosition({}); }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-3 text-gray-500" />
                        <span>View</span>
                      </div>
                    </button>
                    {row.id !== (currentAdmin && currentAdmin.id) && (
                      <>
                        <button
                          onClick={() => { handleEdit(row); setOpenDropdown(null); setDropdownPosition({}); }}
                          className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <Pencil className="w-4 h-4 mr-3 text-gray-500" />
                            <span>Edit</span>
                          </div>
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        {row.status === 'archived' ? (
                          <button
                            onClick={() => { handleUnarchive(row); setOpenDropdown(null); setDropdownPosition({}); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <div className="flex items-center">
                              <ArchiveRestore className="w-4 h-4 mr-3 text-green-500" />
                              <span>Unarchive</span>
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleArchive(row); setOpenDropdown(null); setDropdownPosition({}); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <div className="flex items-center">
                              <Archive className="w-4 h-4 mr-3 text-red-500" />
                              <span>Archive</span>
                            </div>
                          </button>
                        )}
                        <div className="border-t border-gray-200 my-1"></div>
                        {row.status === 'disabled' ? (
                          <button
                            onClick={() => { handleDisable(row); setOpenDropdown(null); setDropdownPosition({}); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <div className="flex items-center">
                              <RefreshCw className="w-4 h-4 mr-3 text-green-600" />
                              <span>Enable</span>
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleDisable(row); setOpenDropdown(null); setDropdownPosition({}); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors"
                          >
                            <div className="flex items-center">
                              <Shield className="w-4 h-4 mr-3 text-yellow-600" />
                              <span>Disable</span>
                            </div>
                          </button>
                        )}
                      </>
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

  // Loading is now shown inside the table body via DataTable

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-2">Failed to load admins</p>
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
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch">
            <Shield size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Admins</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              View and manage administrator accounts.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      {/* Toolbar */}
      <div className="w-full mb-3">
        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          filter={{
            value: roleFilter,
            onChange: setRoleFilter,
            options: ['All Roles', 'Superadmin', 'Admin', 'Archived', 'Disabled'],
            label: 'Filter by role',
          }}
          sort={{
            value: sortBy,
            onChange: handleSortByChange,
            options: [
              'Newest', 
              'Oldest', 
              'Name A-Z', 
              'Name Z-A',
              'Email A-Z',
              'Email Z-A',
              'Role A-Z',
              'Role Z-A',
              'Last Login Recent',
              'Last Login Oldest'
            ],
            label: 'Sort by',
          }}
          primaryButton={{
            label: 'Add Admin',
            onClick: handleAddAdmin,
            className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]'
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedData.map(row => ({ ...row, archived: row.status === 'archived' }))}
        rowKey={(row) => row.id}
        dense
        loading={loading}
        loadingMessage="Loading admins..."
        emptyMessage="No admins found."
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          {/* Pagination Info */}
          <div className="text-xs text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} admins
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

      {/* Add Admin Modal */}
      <AddAdminModal
        open={showAddModal}
        onClose={handleModalClose}
        onSave={handleAdminCreated}
      />

      {/* Edit Admin Modal */}
      <EditAdminModal
        open={showEditModal}
        onClose={handleEditModalClose}
        onSave={handleAdminUpdated}
        admin={selectedAdmin}
      />

      {/* View Admin Modal */}
      <ViewAdminModal
        open={showViewModal}
        onClose={handleViewModalClose}
        admin={selectedAdmin}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={confirmationModal.open}
        onClose={closeConfirmationModal}
        type={confirmationModal.type}
        loading={confirmationModal.loading}
        {...getModalContent()}
      />
    </div>
  );
};

export default ManageAdmins;
