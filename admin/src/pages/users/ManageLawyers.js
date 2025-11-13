import React from 'react';
import ReactDOM from 'react-dom';
import { Users, Eye, Pencil, UserX, Loader2, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Archive, MoreVertical } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import ViewLawyerModal from '../../components/lawyers/ViewLawyerModal';
import EditLawyerModal from '../../components/lawyers/EditLawyerModal';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import usersService from '../../services/usersService';

const StatusBadge = ({ status }) => (
  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
    {status}
  </span>
);

const ManageLawyers = () => {
  const { showSuccess, showError, showWarning, ToastContainer } = useToast();
  const [query, setQuery] = React.useState('');
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
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    lawyerId: null,
    lawyerName: '',
    loading: false,
    changes: null // For tracking edit changes
  });
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedLawyer, setSelectedLawyer] = React.useState(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingLawyer, setEditingLawyer] = React.useState(null);

  // Kebab dropdown state (like ManageAdmins)
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

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: query
      };
      
      const response = await usersService.getLawyers(params);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Error loading lawyers:', err);
      const errorMessage = err.message || 'Failed to load lawyers';
      setError(errorMessage);
      setData([]);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, query]);

  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle view lawyer details
  const handleView = (lawyer) => {
    setSelectedLawyer(lawyer);
    setViewModalOpen(true);
  };

  const handleEdit = (lawyer) => {
    setEditingLawyer(lawyer);
    setEditModalOpen(true);
  };

  // Handle edit save
  const handleEditSave = async (updatedLawyer, originalLawyer) => {
    try {
      // TODO: Replace with actual lawyersService.updateLawyer call
      console.log('Updating lawyer:', updatedLawyer);
      
      // For now, simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await loadData(); // Reload data to reflect changes
      setEditModalOpen(false);
      setEditingLawyer(null);
      
      showSuccess(`Lawyer "${updatedLawyer.full_name}" updated successfully!`);
      
    } catch (err) {
      console.error('Failed to update lawyer:', err);
      showError('Failed to update lawyer: ' + (err.message || 'Unknown error'));
    }
  };

  // Handle suspend lawyer
  const handleSuspend = (lawyerId, lawyerName) => {
    setConfirmationModal({
      open: true,
      type: 'suspend',
      lawyerId,
      lawyerName,
      loading: false
    });
  };

  // Helper function to get modal content based on type
  const getModalContent = () => {
    const { type, lawyerName } = confirmationModal;
    
    switch (type) {
      case 'suspend':
        return {
          title: 'Suspend Lawyer',
          message: `Are you sure you want to suspend ${lawyerName}? This will prevent them from accepting new consultations and accessing lawyer features.`,
          confirmText: 'Suspend Lawyer',
          onConfirm: confirmSuspend
        };
      default:
        return {};
    }
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ open: false, type: '', lawyerId: null, lawyerName: '', loading: false, changes: null });
  };

  // Handle suspend confirmation
  const confirmSuspend = async () => {
    const { lawyerId, lawyerName } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      setActionLoading(prev => ({ ...prev, [lawyerId]: true }));
      
      await usersService.updateLawyerStatus(lawyerId, false); // false = suspended/unverified
      await loadData(); // Reload data
      setConfirmationModal({ open: false, type: '', lawyerId: null, lawyerName: '', loading: false, changes: null });
      
      showSuccess(`Lawyer "${lawyerName}" suspended successfully!`);
      
    } catch (err) {
      console.error('Failed to suspend lawyer:', err);
      showError('Failed to suspend lawyer: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    } finally {
      setActionLoading(prev => ({ ...prev, [lawyerId]: false }));
    }
  };

  // Handle column sorting
  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
    setSortBy('Newest');
  };

  // Handle dropdown sort change
  const handleSortByChange = (newSortBy) => {
    setSortBy(newSortBy);
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

        let comparison = 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (sortConfig.key === 'registration_date' || sortConfig.key === 'roll_sign_date') {
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
      key: 'username', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
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
      key: 'roll_number', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('roll_number')}
        >
          <span>Roll Number</span>
          {sortConfig.key === 'roll_number' ? (
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
      key: 'roll_sign_date', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('roll_sign_date')}
        >
          <span>Roll Sign Date</span>
          {sortConfig.key === 'roll_sign_date' ? (
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
        if (!row.roll_sign_date) return 'N/A';
        const date = new Date(row.roll_sign_date);
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
      key: 'accepting_consultations',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('accepting_consultations')}
        >
          <span>Accepting Consultations</span>
          {sortConfig.key === 'accepting_consultations' ? (
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
      render: (row) => (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
          row.accepting_consultations 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-gray-50 text-gray-700 border border-gray-200'
        }`}>
          {row.accepting_consultations ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      key: 'status',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-500"
          onClick={() => handleSort('status')}
        >
          <span>Status</span>
          {sortConfig.key === 'status' ? (
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
      render: (row) => <StatusBadge status={row.status} />
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
                    <button
                      onClick={() => { handleSuspend(row.id, row.full_name); setOpenDropdown(null); setDropdownPosition({}); }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      disabled={actionLoading[row.id]}
                    >
                      <div className="flex items-center">
                        {actionLoading[row.id] ? (
                          <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                        ) : (
                          <Archive className="w-4 h-4 mr-3 text-red-500" />
                        )}
                        <span>Suspend</span>
                      </div>
                    </button>
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

  // Loading handled by DataTable's built-in loading row

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-2">Failed to load lawyers</p>
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
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Lawyers</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Verified lawyers only. Total: {pagination.total}
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
          sort={{
            value: sortBy,
            onChange: handleSortByChange,
            options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A'],
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
        loading={loading}
        loadingMessage="Loading lawyers..."
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          {/* Pagination Info */}
          <div className="text-xs text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} lawyers
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

      {/* View Lawyer Modal */}
      <ViewLawyerModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        lawyer={selectedLawyer}
      />

      {/* Edit Lawyer Modal */}
      <EditLawyerModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        lawyer={editingLawyer}
        onSave={handleEditSave}
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

export default ManageLawyers;
