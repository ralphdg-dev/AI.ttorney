import React from 'react';
import { Eye, Pencil, Archive, Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = React.useState('all');
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
  const [actionLoading, setActionLoading] = React.useState({});

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: query,
        status: statusFilter
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

  const columns = [
    { key: 'full_name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'birthdate', header: 'Birthdate' },
    { 
      key: 'registration_date', 
      header: 'Registration Date',
      render: (row) => new Date(row.registration_date).toLocaleDateString()
    },
    {
      key: 'account_status',
      header: 'Account Status',
      render: (row) => <StatusBadge status={row.account_status} />,
    },
    {
      key: 'has_lawyer_application',
      header: 'Lawyer Application',
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
              Search, filter and manage legal seeker accounts. Total: {pagination.total}
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
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'verified', label: 'Verified' },
              { value: 'unverified', label: 'Unverified' },
              { value: 'pending_lawyer', label: 'Pending Lawyer' }
            ],
            label: 'Filter by status',
          }}
          sort={{
            value: sortBy,
            onChange: setSortBy,
            options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A'],
            label: 'Sort by',
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        rowKey={(row) => row.id}
        dense
      />

      {/* Pagination Info */}
      {pagination.total > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} legal seekers
        </div>
      )}
    </div>
  );
};

export default ManageLegalSeekers;
