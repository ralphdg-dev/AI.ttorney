import React from 'react';
import { Eye, Shield, Users, Loader2, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import AddAdminModal from '../../components/admin/AddAdminModal';
import adminManagementService from '../../services/adminManagementService';

const RoleBadge = ({ role }) => {
  const styles = role === 'superadmin'
    ? 'bg-purple-50 text-purple-700 border border-purple-200'
    : 'bg-blue-50 text-blue-700 border border-blue-200';
  
  const displayRole = role === 'superadmin' ? 'Superadmin' : 'Admin';
  
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {displayRole}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'suspended':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  const getDisplayStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'suspended':
        return 'Suspended';
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
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All Roles');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [data, setData] = React.useState([]);
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

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Map frontend filter values to backend API values
      const mapRoleFilter = (filter) => {
        switch (filter) {
          case 'All Roles': return 'all';
          case 'Superadmin': return 'superadmin';
          case 'Admin': return 'admin';
          default: return 'all';
        }
      };

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: query,
        role: mapRoleFilter(roleFilter)
      };
      
      const response = await adminManagementService.getAdmins(params);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, query, roleFilter]);

  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle view admin details
  const handleView = (admin) => {
    alert(`View details for: ${admin.full_name}\nEmail: ${admin.email}\nRole: ${admin.role}\nCreated: ${new Date(admin.created_at).toLocaleDateString()}`);
  };

  // Handle add admin
  const handleAddAdmin = () => {
    setShowAddModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowAddModal(false);
  };

  // Handle admin creation success
  const handleAdminCreated = (newAdmin) => {
    // Reload the data to show the new admin
    loadData();
    setShowAddModal(false);
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

  // Sort data based on sortConfig or dropdown sort
  const sortedData = React.useMemo(() => {
    let sortedArray = [...data];

    // Apply column sorting if active
    if (sortConfig.key) {
      sortedArray = sortedArray.sort((a, b) => {
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
      sortedArray = sortedArray.sort((a, b) => {
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
      sortedArray = sortedArray.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return sortedArray;
  }, [data, sortConfig, sortBy]);

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
      key: 'role',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
      render: (row) => <RoleBadge role={row.role} />,
    },
    { 
      key: 'created_at', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric'
        });
      }
    },
    { 
      key: 'updated_at', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric'
        });
      }
    },
    { 
      key: 'last_login', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
        
        console.log('Last login debug:', {
          raw: row.last_login,
          parsed: date.toISOString(),
          now: now.toISOString(),
          diffInMs,
          diffInMinutes,
          diffInHours,
          diffInDays
        });
        
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
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric', 
            year: 'numeric',
            timeZone: 'UTC'
          });
        }
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end space-x-2 text-gray-600">
          <Tooltip content="View Details">
            <button 
              className="p-1 rounded hover:bg-gray-100" 
              aria-label="View"
              onClick={() => handleView(row)}
            >
              <Eye size={16} />
            </button>
          </Tooltip>
          {/* Future actions can be added here when edit/delete functionality is implemented */}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#023D7B] mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

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
            options: ['All Roles', 'Superadmin', 'Admin'],
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
        data={sortedData}
        rowKey={(row) => row.id}
        dense
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
    </div>
  );
};

export default ManageAdmins;
