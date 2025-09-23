import React from 'react';
import { Users, Eye, Archive, Check, X, Pencil, Loader2, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import ViewLawyerApplicationModal from '../../components/lawyers/ViewLawyerApplicationModal';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'resubmission':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'Approved';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'resubmission': return 'Resubmission';
      case 'pending': return 'Pending';
      default: return status || 'Pending';
    }
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyles(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};

const RollMatchBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const isMatched = s === 'matched';
  const styles = isMatched
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-red-50 text-red-700 border border-red-200';
  const label = isMatched ? 'Matched' : 'Not Found';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {label}
    </span>
  );
};

const ManageLawyerApplications = () => {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
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
  const [viewOpen, setViewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [historicalViewOpen, setHistoricalViewOpen] = React.useState(false);
  const [historicalApplication, setHistoricalApplication] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editApplication, setEditApplication] = React.useState(null);
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    applicationId: null,
    applicantName: '',
    loading: false
  });

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: query,
        status: statusFilter === 'All' ? 'all' : statusFilter.toLowerCase()
      };
      
      const response = await lawyerApplicationsService.getLawyerApplications(params);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load lawyer applications:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, query, statusFilter]);

  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openView = async (row) => {
    try {
      setLoadingDetails(true);
      setViewOpen(true);
      
      // Fetch complete application details
      const applicationDetails = await lawyerApplicationsService.getLawyerApplication(row.id);
      setSelected(applicationDetails);
    } catch (error) {
      console.error('Failed to fetch application details:', error);
      // Fallback to using row data if API call fails
      setSelected(row);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewHistoricalApplication = (application) => {
    // Open the historical application in a new modal
    setHistoricalApplication({ data: application });
    setHistoricalViewOpen(true);
  };

  const handleEdit = async (row) => {
    try {
      // Fetch complete application details for editing
      const applicationDetails = await lawyerApplicationsService.getLawyerApplication(row.id);
      setEditApplication(applicationDetails);
      setEditOpen(true);
    } catch (error) {
      console.error('Failed to fetch application details for editing:', error);
      // Fallback to using row data if API call fails
      setEditApplication(row);
      setEditOpen(true);
    }
  };

  const handleEditSave = (updatedApplication) => {
    // Refresh the data after successful edit
    loadData();
  };

  // Helper function to get modal content based on type
  const getModalContent = () => {
    const { type, applicantName } = confirmationModal;
    
    switch (type) {
      case 'approve':
        return {
          title: 'Approve Application',
          message: `Are you sure you want to approve this lawyer application? This will grant the applicant verified lawyer status and access to lawyer features.`,
          confirmText: 'Approve Application',
          showFeedbackInput: false,
          onConfirm: confirmApprove
        };
      case 'reject':
        return {
          title: 'Reject Application',
          message: `Are you sure you want to reject this lawyer application? The applicant will be notified and may be able to reapply later.`,
          confirmText: 'Reject Application',
          showFeedbackInput: true,
          feedbackLabel: 'Rejection Reason',
          feedbackPlaceholder: 'Please explain why this application is being rejected...',
          onConfirm: confirmReject
        };
      case 'resubmission':
        return {
          title: 'Request Resubmission',
          message: `Are you sure you want to request resubmission for this application? The applicant will be asked to correct and resubmit their documents.`,
          confirmText: 'Request Resubmission',
          showFeedbackInput: true,
          feedbackLabel: 'Feedback for Resubmission',
          feedbackPlaceholder: 'Please explain what needs to be corrected or improved...',
          onConfirm: confirmResubmission
        };
      default:
        return {};
    }
  };

  const closeModal = () => {
    setConfirmationModal({ open: false, type: '', applicationId: null, applicantName: '', loading: false });
  };

  // Handle approve application
  const handleApprove = (applicationId, applicantName) => {
    setConfirmationModal({
      open: true,
      type: 'approve',
      applicationId,
      applicantName,
      loading: false
    });
  };

  const confirmApprove = async () => {
    const { applicationId, applicantName } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      await lawyerApplicationsService.updateApplicationStatus(applicationId, 'approved');
      await loadData(); // Reload data
      setConfirmationModal({ open: false, type: '', applicationId: null, applicantName: '', loading: false });
    } catch (err) {
      console.error('Failed to approve application:', err);
      alert('Failed to approve application: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle reject application
  const handleReject = (applicationId, applicantName) => {
    setConfirmationModal({
      open: true,
      type: 'reject',
      applicationId,
      applicantName,
      loading: false
    });
  };

  const confirmReject = async (feedback) => {
    const { applicationId, applicantName } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      await lawyerApplicationsService.updateApplicationStatus(applicationId, 'rejected', feedback);
      await loadData(); // Reload data
      setConfirmationModal({ open: false, type: '', applicationId: null, applicantName: '', loading: false });
    } catch (err) {
      console.error('Failed to reject application:', err);
      alert('Failed to reject application: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle resubmission request
  const handleResubmission = (applicationId, applicantName) => {
    console.log('Handle resubmission called with:', { applicationId, applicantName });
    setConfirmationModal({
      open: true,
      type: 'resubmission',
      applicationId,
      applicantName,
      loading: false
    });
  };

  const confirmResubmission = async (feedback) => {
    const { applicationId, applicantName } = confirmationModal;
    
    console.log('Confirming resubmission:', { applicationId, applicantName, feedback });
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      const result = await lawyerApplicationsService.updateApplicationStatus(applicationId, 'resubmission', feedback);
      console.log('Resubmission result:', result);
      await loadData(); // Reload data
      setConfirmationModal({ open: false, type: '', applicationId: null, applicantName: '', loading: false });
    } catch (err) {
      console.error('Failed to request resubmission:', err);
      alert('Failed to request resubmission: ' + err.message);
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

        if (sortConfig.key === 'application_date' || sortConfig.key === 'roll_sign_date') {
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
            return new Date(a.application_date) - new Date(b.application_date);
          case 'Name A-Z':
            return (a.full_name || '').localeCompare(b.full_name || '');
          case 'Name Z-A':
            return (b.full_name || '').localeCompare(a.full_name || '');
          case 'Newest':
          default:
            return new Date(b.application_date) - new Date(a.application_date);
        }
      });
    }
    // Default sort by newest application date
    else {
      sortedArray = sortedArray.sort((a, b) => 
        new Date(b.application_date) - new Date(a.application_date)
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
      key: 'roll_number', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
      ),
      render: (row) => (
        <div className="flex items-center gap-2">
          <span>{row.roll_number}</span>
          <RollMatchBadge status={row.pra_status} />
        </div>
      )
    },
    { 
      key: 'roll_sign_date', 
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
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
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric'
        });
      }
    },
    {
      key: 'application_type',
      header: 'Application',
      render: (row) => {
        const isNew = row.application_type === 'New Application';
        
        if (isNew) {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
              1st Application
            </span>
          );
        }
        
        // Extract attempt number from application_type string like "Resubmission (3rd attempt)"
        const attemptMatch = row.application_type.match(/(\d+)(st|nd|rd|th) attempt/);
        const attemptNumber = attemptMatch ? attemptMatch[1] : '2';
        const suffix = attemptMatch ? attemptMatch[2] : 'nd';
        
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
            {attemptNumber}{suffix} Attempt
          </span>
        );
      }
    },
    {
      key: 'prior_status',
      header: 'Prior Status',
      render: (row) => {
        if (!row.prior_status) {
          return (
            <span className="text-xs text-gray-400 italic">
              First Application
            </span>
          );
        }
        return <StatusBadge status={row.prior_status} />;
      }
    },
    {
      key: 'status',
      header: (
        <button
          className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
          onClick={() => handleSort('status')}
        >
          <span>Current Status</span>
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
      key: 'approval',
      header: 'Approval',
      align: 'left',
      render: (row) => {
        // Hide approval buttons if application is already approved/accepted
        if (row.status === 'approved' || row.status === 'accepted') {
          return null;
        }

        return (
          <div className="flex items-center gap-2 text-gray-600">
            <Tooltip content="Approve">
              <button 
                className="p-1 rounded hover:bg-emerald-50 text-emerald-700 border border-transparent hover:border-emerald-200" 
                aria-label="Approve"
                onClick={() => handleApprove(row.id, row.full_name)}
              >
                <Check size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Request Resubmission">
              <button 
                className="p-1 rounded hover:bg-yellow-50 text-yellow-700 border border-transparent hover:border-yellow-200" 
                aria-label="Request Resubmission"
                onClick={() => handleResubmission(row.id, row.full_name)}
                disabled={row.status === 'resubmission'}
              >
                <RotateCcw size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Reject">
              <button 
                className="p-1 rounded hover:bg-red-50 text-red-700 border border-transparent hover:border-red-200" 
                aria-label="Reject"
                onClick={() => handleReject(row.id, row.full_name)}
                disabled={row.status === 'rejected'}
              >
                <X size={16} />
              </button>
            </Tooltip>
          </div>
        );
      },
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
              onClick={() => openView(row)}
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
            <button className="p-1 rounded hover:bg-gray-100" aria-label="Archive">
              <Archive size={16} />
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
          <p className="text-sm text-gray-600">Loading lawyer applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-2">Failed to load lawyer applications</p>
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
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch"><Users size={14} /></div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Lawyer Applications</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Review and approve or reject lawyer applications.</p>
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
            options: ['All', 'Pending', 'Approved', 'Rejected', 'Resubmission'], 
            label: 'Filter by status' 
          }}
          sort={{ 
            value: sortBy, 
            onChange: handleSortByChange, 
            options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A'], 
            label: 'Sort by' 
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
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
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

      {/* View Modal */}
      <ViewLawyerApplicationModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelected(null);
          setLoadingDetails(false);
        }}
        application={selected}
        loading={loadingDetails}
        onViewHistoricalApplication={handleViewHistoricalApplication}
      />

      {/* Historical Application View Modal */}
      <ViewLawyerApplicationModal
        open={historicalViewOpen}
        onClose={() => {
          setHistoricalViewOpen(false);
          setHistoricalApplication(null);
        }}
        application={historicalApplication}
        loading={false}
        isHistoricalView={true}
      />

      {/* Edit Application Modal */}
      <ViewLawyerApplicationModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditApplication(null);
        }}
        application={editApplication}
        loading={false}
        isEditMode={true}
        onSave={handleEditSave}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={confirmationModal.open}
        onClose={closeModal}
        type={confirmationModal.type}
        applicantName={confirmationModal.applicantName}
        loading={confirmationModal.loading}
        {...getModalContent()}
      />
    </div>
  );
};

export default ManageLawyerApplications;
