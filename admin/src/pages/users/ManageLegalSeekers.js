import React from 'react';
import { Eye, Pencil, Archive, Users, Loader2, CheckCircle, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import usersService from '../../services/usersService';

const StatusBadge = ({ status }) => {
  const styles =
    status === 'Verified'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {status}
    </span>
  );
};

const LawyerApplicationBadge = ({ hasApplication }) => {
  const isYes = hasApplication === 'Yes';
  const styles = isYes
    ? 'bg-blue-50 text-blue-700 border border-blue-200'
    : 'bg-gray-50 text-gray-600 border border-gray-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {hasApplication}
    </span>
  );
};

const ManageLegalSeekers = () => {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All Status');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [data, setData] = React.useState([]);
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

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Map frontend filter values to backend API values
      const mapStatusFilter = (filter) => {
        switch (filter) {
          case 'All Status': return 'all';
          case 'Verified': return 'verified';
          case 'Unverified': return 'unverified';
          case 'Pending Lawyer': return 'pending_lawyer';
          default: return 'all';
        }
      };

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: query,
        status: mapStatusFilter(statusFilter)
      };
      
      const response = await usersService.getLegalSeekers(params);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load legal seekers:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, query, statusFilter]);

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
  const handleView = (user) => {
    alert(`View details for: ${user.full_name}\nEmail: ${user.email}\nStatus: ${user.account_status}`);
  };

  // Handle edit user
  const handleEdit = (user) => {
    alert(`Edit user: ${user.full_name} - Edit functionality not implemented yet`);
  };

  // Handle archive user
  const handleArchive = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to archive ${userName}?`)) {
      return;
    }
    
    try {
      setActionLoading(prev => ({ ...prev, [userId]: true }));
      await usersService.deleteLegalSeeker(userId);
      await loadData(); // Reload data
    } catch (err) {
      console.error('Failed to archive user:', err);
      alert('Failed to archive user: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
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
      sortedArray = sortedArray.sort((a, b) => {
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
      sortedArray = sortedArray.sort((a, b) => 
        new Date(b.registration_date) - new Date(a.registration_date)
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
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric'
        });
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
        const date = new Date(row.registration_date);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric'
        });
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
      render: (row) => (
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
          <Tooltip content="Edit">
            <button 
              className="p-1 rounded hover:bg-gray-100" 
              aria-label="Edit"
              onClick={() => handleEdit(row)}
            >
              <Pencil size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Archive">
            <button 
              className="p-1 rounded hover:bg-gray-100" 
              aria-label="Archive"
              onClick={() => handleArchive(row.id, row.full_name)}
              disabled={actionLoading[row.id]}
            >
              {actionLoading[row.id] ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Archive size={16} />
              )}
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#023D7B] mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading legal seekers...</p>
        </div>
      </div>
    );
  }

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
            value: statusFilter,
            onChange: setStatusFilter,
            options: ['All Status', 'Verified', 'Unverified', 'Pending Lawyer'],
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
        data={sortedData}
        rowKey={(row) => row.id}
        dense
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
    </div>
  );
};

export default ManageLegalSeekers;
