import React from 'react';
import { Users, Eye, Pencil, Archive, ArchiveRestore, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, XCircle, RefreshCw } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import ViewLegalSeekerModal from '../../components/users/ViewLegalSeekerModal';
import EditLegalSeekerModal from '../../components/users/EditLegalSeekerModal';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import usersService from '../../services/usersService';
import legalSeekerService from '../../services/legalSeekerService';

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'unverified':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'active':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'suspended':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  const styles = getStatusStyles(status);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {displayStatus}
    </span>
  );
};

const LawyerApplicationBadge = ({ hasApplication }) => {
  if (hasApplication === 'Yes') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
        Yes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
      No
    </span>
  );
};

const ManageLegalSeekers = () => {
  const { showSuccess, showError, showWarning, ToastContainer } = useToast();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [combinedFilter, setCombinedFilter] = React.useState('Active');
  const [status, setStatus] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [data, setData] = React.useState([]);
  const [allData, setAllData] = React.useState([]); // Store all data for client-side filtering
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [actionLoading, setActionLoading] = React.useState({});
  const [sortConfig, setSortConfig] = React.useState({
    key: null,
    direction: 'asc'
  });
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    userId: null,
    userName: '',
    loading: false,
    changes: null // For tracking edit changes
  });

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
      
      // Parse combined filter to extract status and archived parameters
      let status = 'all';
      let archived = 'active';
      
      if (combinedFilter === 'Active') {
        status = 'all';
        archived = 'active';
      } else if (combinedFilter === 'Archived') {
        status = 'all';
        archived = 'archived';
      } else if (combinedFilter === 'All') {
        status = 'all';
        archived = 'all';
      } else if (combinedFilter.includes('Active -')) {
        // Handle "Active - Verified", "Active - Unverified", etc.
        status = combinedFilter.replace('Active - ', '').toLowerCase();
        archived = 'active';
      } else if (combinedFilter.includes('Archived -')) {
        // Handle "Archived - Verified", "Archived - Unverified", etc.
        status = combinedFilter.replace('Archived - ', '').toLowerCase();
        archived = 'archived';
      }

      const params = {
        page: 1, // Always start from page 1 for search
        limit: 100, // Load more data for better client-side filtering
        search: debouncedQuery,
        status,
        archived
      };
      
      const response = await usersService.getLegalSeekers(params);
      setAllData(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total, pages: Math.ceil(response.pagination.total / 10) }));
    } catch (err) {
      setError(err.message);
      console.error('Failed to load legal seekers:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedQuery, combinedFilter]);

  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle status toggle
  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: true }));
      const newStatus = currentStatus === 'Verified';
      await usersService.updateLegalSeekerStatus(userId, !newStatus);
      await loadData(); // Reload data
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update user status: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle view user details
  const handleView = async (user) => {
    try {
      setLoadingDetails(true);
      setViewOpen(true);
      
      console.log('handleView - Row user data:', user);
      
      // Fetch complete user details from the API
      const userDetails = await usersService.getLegalSeeker(user.id);
      console.log('handleView - API response:', userDetails);
      setSelectedUser(userDetails);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      console.log('handleView - Using fallback row data:', user);
      // Fallback to using row data if API call fails
      setSelectedUser(user);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle edit user
  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  // Handle edit save with change comparison
  const handleEditSave = (updatedUser, originalUser) => {
    const changes = {};
    
    if (originalUser && updatedUser) {
      // Check for verification status changes
      if (originalUser.is_verified !== updatedUser.is_verified) {
        changes['Email Verified'] = {
          from: originalUser.is_verified ? 'Verified' : 'Unverified',
          to: updatedUser.is_verified ? 'Verified' : 'Unverified'
        };
      }
    }
    
    // Show confirmation modal with changes
    if (Object.keys(changes).length > 0) {
      setConfirmationModal({
        open: true,
        type: 'edit',
        userId: updatedUser.id,
        userName: updatedUser.full_name || 'Unknown',
        loading: false,
        changes: changes
      });
    }
  };

  // Handle archive button click
  const handleArchive = (user) => {
    const isCurrentlyArchived = user.archived === true;
    const modalType = isCurrentlyArchived ? 'unarchive' : 'archive';
    
    setConfirmationModal({
      open: true,
      type: modalType,
      userId: user.id,
      userName: user.full_name || 'Unknown',
      loading: false
    });
  };

  // Helper function to get modal content based on type
  const getModalContent = () => {
    const { type, userName, changes } = confirmationModal;
    
    switch (type) {
      case 'archive':
        return {
          title: 'Archive User',
          message: `Are you sure you want to archive ${userName}? Archived users will be hidden from the main list but can be accessed through the "Archived" filter.`,
          confirmText: 'Archive User',
          showFeedbackInput: false,
          onConfirm: confirmArchive
        };
      case 'unarchive':
        return {
          title: 'Unarchive User',
          message: `Are you sure you want to unarchive ${userName}? They will be restored to the active users list.`,
          confirmText: 'Unarchive User',
          showFeedbackInput: false,
          onConfirm: confirmArchive
        };
      case 'edit':
        const changesList = changes ? Object.entries(changes).map(([field, change]) => 
          `• ${field}: "${change.from}" → "${change.to}"`
        ).join('\n') : '';
        return {
          title: 'Confirm User Changes',
          message: `Are you sure you want to save these changes to ${userName}?\n\nChanges:\n${changesList}`,
          confirmText: 'Save Changes',
          showFeedbackInput: false,
          onConfirm: confirmEdit
        };
      default:
        return {};
    }
  };

  const closeModal = () => {
    setConfirmationModal({ open: false, type: '', userId: null, userName: '', loading: false, changes: null });
  };

  // Handle archive/unarchive user
  const confirmArchive = async () => {
    const { userId, userName, type } = confirmationModal;
    const isArchiving = type === 'archive';
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      await usersService.archiveLegalSeeker(userId, isArchiving);
      await loadData(); // Reload data
      setConfirmationModal({ open: false, type: '', userId: null, userName: '', loading: false, changes: null });
      
    } catch (err) {
      console.error(`Failed to ${isArchiving ? 'archive' : 'unarchive'} user:`, err);
      alert(`Failed to ${isArchiving ? 'archive' : 'unarchive'} user: ` + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle edit confirmation
  const confirmEdit = async () => {
    const { userId, userName, changes } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // Prepare update data based on changes
      const updateData = {};
      
      if (changes['Email Verified']) {
        updateData.is_verified = changes['Email Verified'].to === 'Verified';
      }
      
      // Make the API call
      await legalSeekerService.updateLegalSeeker(userId, updateData);
      
      setEditOpen(false); // Close edit modal
      await loadData(); // Reload data
      setConfirmationModal({ open: false, type: '', userId: null, userName: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to edit user:', err);
      alert('Failed to edit user: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
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
          (item.email || '').toLowerCase().includes(searchTerm) ||
          (item.username || '').toLowerCase().includes(searchTerm)
        );
      });
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

        if (sortConfig.key === 'registration_date') {
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
            return new Date(a.registration_date) - new Date(b.registration_date);
          case 'Name A-Z':
            return (a.full_name || '').localeCompare(b.full_name || '');
          case 'Name Z-A':
            return (b.full_name || '').localeCompare(a.full_name || '');
          case 'Email A-Z':
            return (a.email || '').localeCompare(b.email || '');
          case 'Email Z-A':
            return (b.email || '').localeCompare(a.email || '');
          case 'Username A-Z':
            return (a.username || '').localeCompare(b.username || '');
          case 'Username Z-A':
            return (b.username || '').localeCompare(a.username || '');
          case 'Birthdate Oldest':
            return new Date(a.birthdate || '1900-01-01') - new Date(b.birthdate || '1900-01-01');
          case 'Birthdate Newest':
            return new Date(b.birthdate || '1900-01-01') - new Date(a.birthdate || '1900-01-01');
          case 'Status A-Z':
            return (a.account_status || '').localeCompare(b.account_status || '');
          case 'Status Z-A':
            return (b.account_status || '').localeCompare(a.account_status || '');
          case 'Lawyer App Yes First':
            return (b.has_lawyer_application || '').localeCompare(a.has_lawyer_application || '');
          case 'Lawyer App No First':
            return (a.has_lawyer_application || '').localeCompare(b.has_lawyer_application || '');
          case 'Newest':
          default:
            return new Date(b.registration_date) - new Date(a.registration_date);
        }
      });
    }
    // Default sort by newest registration date
    else {
      filteredArray = filteredArray.sort((a, b) => 
        new Date(b.registration_date) - new Date(a.registration_date)
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
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
      key: 'username', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
          onClick={() => handleSort('username')}
        >
          <span>Username</span>
          {sortConfig.key === 'username' ? (
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
      key: 'birthdate', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
          onClick={() => handleSort('birthdate')}
        >
          <span>Birthdate</span>
          {sortConfig.key === 'birthdate' ? (
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
        if (!row.birthdate) return 'N/A';
        const date = new Date(row.birthdate);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          timeZone: 'Asia/Manila'
        }).format(date);
      }
    },
    { 
      key: 'registration_date', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
          onClick={() => handleSort('registration_date')}
        >
          <span>Registration Date</span>
          {sortConfig.key === 'registration_date' ? (
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
        if (!row.registration_date) return 'N/A';
        const date = new Date(row.registration_date);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          timeZone: 'Asia/Manila'
        }).format(date);
      }
    },
    {
      key: 'account_status',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
          onClick={() => handleSort('account_status')}
        >
          <span>Account Status</span>
          {sortConfig.key === 'account_status' ? (
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
      render: (row) => <StatusBadge status={row.account_status} />,
    },
    {
      key: 'has_lawyer_application',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
          onClick={() => handleSort('has_lawyer_application')}
        >
          <span>Lawyer Application</span>
          {sortConfig.key === 'has_lawyer_application' ? (
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
      render: (row) => <LawyerApplicationBadge hasApplication={row.has_lawyer_application} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const isArchived = row.archived === true;
        return (
          <div className="flex items-center justify-end space-x-2 text-gray-600">
            <Tooltip content="View">
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                aria-label="View"
                onClick={() => handleView(row)}
              >
                <Eye size={16} />
              </button>
            </Tooltip>
            
            {/* Edit button - always show */}
            <Tooltip content="Edit">
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                aria-label="Edit"
                onClick={() => handleEdit(row)}
              >
                <Pencil size={16} />
              </button>
            </Tooltip>
            
            {/* Archive button for active users */}
            {!isArchived && (
              <Tooltip content="Archive">
                <button 
                  className="p-1 rounded hover:bg-gray-100" 
                  aria-label="Archive"
                  onClick={() => handleArchive(row)}
                >
                  <Archive size={16} />
                </button>
              </Tooltip>
            )}
            
            {/* Unarchive button for archived users */}
            {isArchived && (
              <Tooltip content="Unarchive">
                <button 
                  className="p-1 rounded hover:bg-green-100 text-green-600" 
                  aria-label="Unarchive"
                  onClick={() => handleArchive(row)}
                >
                  <RefreshCw size={16} />
                </button>
              </Tooltip>
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
          <p className="text-sm text-red-600 mb-2">Failed to load legal seekers</p>
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
            <Users size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Legal Seekers</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Search, filter and manage legal seeker accounts.
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
            value: combinedFilter,
            onChange: setCombinedFilter,
            options: [
              'Active',
              'Archived', 
              'All',
              'Active - Verified',
              'Active - Unverified',
              'Active - Pending Lawyer',
              'Archived - Verified',
              'Archived - Unverified',
              'Archived - Pending Lawyer'
            ],
            label: 'Filter by status',
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
              'Username A-Z',
              'Username Z-A',
              'Birthdate Oldest',
              'Birthdate Newest',
              'Status A-Z',
              'Status Z-A',
              'Lawyer App Yes First',
              'Lawyer App No First'
            ],
            label: 'Sort by',
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        rowKey={(row) => row.id}
        dense
        loading={loading}
        loadingMessage="Loading legal seekers..."
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          {/* Pagination Info */}
          <div className="text-xs text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} legal seekers
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

      {/* View Legal Seeker Modal */}
      <ViewLegalSeekerModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        user={selectedUser}
        loading={loadingDetails}
      />

      {/* Edit Legal Seeker Modal */}
      <EditLegalSeekerModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={selectedUser}
        onSave={handleEditSave}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={confirmationModal.open}
        onClose={closeModal}
        type={confirmationModal.type}
        applicantName={confirmationModal.userName}
        loading={confirmationModal.loading}
        {...getModalContent()}
      />
    </div>
  );
};

export default ManageLegalSeekers;
