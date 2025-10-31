import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Download, 
  Search, 
  Filter, 
  Calendar,
  Eye,
  FileText,
  User,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import ListToolbar from '../../components/ui/ListToolbar';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import auditLogsService from '../../services/auditLogsService';

const ActionTypeBadge = ({ actionType }) => {
  const getStyles = (type) => {
    switch (type?.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'delete':
      case 'archive':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'login':
      case 'authentication':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'export':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStyles(actionType)}`}>
      {actionType || 'Unknown'}
    </span>
  );
};

const TableTypeBadge = ({ table }) => {
  const getIcon = (table) => {
    switch (table?.toLowerCase()) {
      case 'users':
      case 'legal_seekers':
        return <User size={10} />;
      case 'admin':
        return <Shield size={10} />;
      case 'lawyers':
        return <FileText size={10} />;
      default:
        return <Activity size={10} />;
    }
  };

  const getStyles = (table) => {
    switch (table?.toLowerCase()) {
      case 'users':
      case 'legal_seekers':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'admin':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'lawyers':
        return 'bg-green-50 text-green-700 border border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getStyles(table)}`}>
      {getIcon(table)}
      {table || 'Unknown'}
    </span>
  );
};

const ManageAuditLogs = () => {
  const { showSuccess, showError, ToastContainer } = useToast();
  
  // State management
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState('All Tables');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [dateRange, setDateRange] = useState('All Time');
  const [sortBy, setSortBy] = useState('Newest');

  // Modal states
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        table: tableFilter === 'All Tables' ? '' : tableFilter.toLowerCase(),
        action: actionFilter === 'All Actions' ? '' : actionFilter.toLowerCase(),
        date_range: dateRange === 'All Time' ? '' : dateRange.toLowerCase(),
        sort: sortBy.toLowerCase()
      };

      const response = await auditLogsService.getAuditLogs(params);
      
      setAuditLogs(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0
      }));

    } catch (err) {
      console.error('Failed to load audit logs:', err);
      
      // Check if it's a setup issue
      if (err.message && err.message.includes('table not found')) {
        setError('Database setup required. Please set up the audit logs table.');
      } else {
        setError(err.message || 'Failed to load audit logs');
      }
      
      showError('Failed to load audit logs: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, tableFilter, actionFilter, dateRange, sortBy]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [searchTerm, tableFilter, actionFilter, dateRange, sortBy]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle view details
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // Handle export
  const handleExport = async () => {
    try {
      setExporting(true);
      
      const params = {
        search: searchTerm,
        table: tableFilter === 'All Tables' ? '' : tableFilter.toLowerCase(),
        action: actionFilter === 'All Actions' ? '' : actionFilter.toLowerCase(),
        date_range: dateRange === 'All Time' ? '' : dateRange.toLowerCase(),
        format: 'csv'
      };

      await auditLogsService.exportAuditLogs(params);
      showSuccess('Audit logs exported successfully');
      
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      showError('Failed to export audit logs: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Table columns
  const columns = [
    {
      key: 'created_at',
      header: 'DATE & TIME',
      render: (log) => (
        <div className="text-xs text-gray-900">
          {formatDate(log.created_at)}
        </div>
      )
    },
    {
      key: 'action',
      header: 'ACTION',
      render: (log) => (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-900">
            {log.action}
          </div>
          <ActionTypeBadge actionType={log.metadata?.action_type} />
        </div>
      )
    },
    {
      key: 'target_table',
      header: 'TABLE',
      render: (log) => (
        <TableTypeBadge table={log.target_table} />
      )
    },
    {
      key: 'actor',
      header: 'PERFORMED BY',
      render: (log) => (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-900">
            {log.actor_id || 'Unknown'}
          </div>
          <div className="text-[10px] text-gray-500 capitalize">
            {log.role || 'Unknown Role'}
          </div>
        </div>
      )
    },
    {
      key: 'target_id',
      header: 'TARGET ID',
      render: (log) => (
        <div className="text-xs text-gray-600 font-mono">
          {log.target_id || 'N/A'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'center',
      render: (log) => (
        <div className="flex justify-center">
          <button
            onClick={() => handleViewDetails(log)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="View Details"
          >
            <Eye size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch">
            <History size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Audit Logs</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Track all admin actions and system changes for accountability.</p>
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
            value: tableFilter,
            onChange: setTableFilter,
            options: [
              'All Tables',
              'Users',
              'Legal Seekers',
              'Lawyers',
              'Admin',
              'Glossary Terms'
            ],
            label: 'Filter by table'
          }}
          sort={{
            value: sortBy,
            onChange: setSortBy,
            options: [
              'Newest',
              'Oldest',
              'Action A-Z',
              'Action Z-A',
              'Table A-Z',
              'Table Z-A'
            ],
            label: 'Sort by'
          }}
          actions={
            <div className="flex items-center gap-2">
              {/* Additional filters */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#023D7B]"
              >
                <option value="All Actions">All Actions</option>
                <option value="Create">Create</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
                <option value="Login">Login</option>
                <option value="Export">Export</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#023D7B]"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Last 30 Days">Last 30 Days</option>
              </select>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exporting || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Export
                  </>
                )}
              </button>

              {/* Refresh button */}
              <button
                onClick={loadAuditLogs}
                disabled={loading}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          }
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <div className="flex-1">
              <span className="text-sm font-medium">{error}</span>
              {error.includes('Database setup required') && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                  <div className="font-medium mb-2">Setup Instructions:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Go to your Supabase Dashboard</li>
                    <li>Navigate to SQL Editor</li>
                    <li>Run the following SQL to create the audit_logs table:</li>
                  </ol>
                  <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs overflow-x-auto">
                    <pre>{`-- Table admin_audit_logs already exists
-- Insert sample data to test the functionality
INSERT INTO admin_audit_logs (action, target_table, target_id, actor_id, role, metadata) VALUES
('Admin Login', 'admin', '1', gen_random_uuid(), 'admin', '{"ip": "127.0.0.1"}'),
('View Legal Seekers', 'legal_seekers', null, gen_random_uuid(), 'admin', '{"action_type": "view"}'),
('Update Lawyer Status', 'lawyers', '123', gen_random_uuid(), 'superadmin', '{"old_status": "pending", "new_status": "active"}'),
('Export Data', 'admin_audit_logs', null, gen_random_uuid(), 'admin', '{"format": "csv"}'),
('Create Glossary Term', 'glossary_terms', '456', gen_random_uuid(), 'admin', '{"term": "Legal Term"}')`}</pre>
                  </div>
                  <div className="mt-2 text-xs">
                    <strong>Note:</strong> After running the SQL, refresh this page to see the audit logs.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={auditLogs}
            rowKey={(row) => row.id}
            dense
            emptyMessage={
              <div className="text-center text-gray-500 py-8">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No audit logs found matching your criteria.</p>
              </div>
            }
          />

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              {/* Pagination Info */}
              <div className="text-xs text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
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
                  onClick={() => handlePageChange(Math.min(pagination.pages, pagination.page + 1))}
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
      )}

      {/* Audit Log Details Modal */}
      {showDetailsModal && selectedLog && (
        <Modal
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Audit Log Details"
          width="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Log Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  {selectedLog.action}
                </h3>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedLog.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <ActionTypeBadge actionType={selectedLog.metadata?.action_type} />
                <TableTypeBadge table={selectedLog.target_table} />
              </div>
            </div>

            {/* Log Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Performed By
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">ID: {selectedLog.actor_id || 'Unknown'}</div>
                  <div className="text-xs text-gray-500 capitalize">Role: {selectedLog.role || 'Unknown Role'}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Target Information
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  <div>Table: <span className="font-mono">{selectedLog.target_table}</span></div>
                  <div>ID: <span className="font-mono">{selectedLog.target_id || 'N/A'}</span></div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Action Details
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedLog.action}
                </div>
              </div>

              {selectedLog.metadata && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Metadata
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ToastContainer />
    </div>
  );
};

export default ManageAuditLogs;
