import React from 'react';
import { Users, Eye, Archive, Check, X, Pencil } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';

const sampleApplications = [
  { name: 'Atty. Paolo Reyes', email: 'paolo.reyes@example.com', rollNumber: 'RN-2024-01234', rollSignDate: '2024-02-10', status: 'Pending' },
  { name: 'Atty. Nina Cruz', email: 'nina.cruz@example.com', rollNumber: 'RN-2023-09876', rollSignDate: '2023-09-18', status: 'Verified' },
  { name: 'Atty. Marco Villanueva', email: 'marco.v@example.com', rollNumber: 'RN-2022-05555', rollSignDate: '2022-06-30', status: 'Rejected' },
];

const StatusBadge = ({ status }) => {
  const styles =
    status === 'Verified'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'Rejected'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>{status}</span>;
};

const ManageLawyerApplications = () => {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');

  const columns = [
    { key: 'name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'rollNumber', header: 'Roll Number' },
    { key: 'rollSignDate', header: 'Roll Sign Date' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'approval',
      header: 'Approval',
      align: 'left',
      render: (row) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Tooltip content="Verify">
            <button className="p-1 rounded hover:bg-emerald-50 text-emerald-700 border border-transparent hover:border-emerald-200" aria-label="Verify">
              <Check size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Reject">
            <button className="p-1 rounded hover:bg-red-50 text-red-700 border border-transparent hover:border-red-200" aria-label="Reject">
              <X size={16} />
            </button>
          </Tooltip>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: () => (
        <div className="flex items-center justify-end space-x-2 text-gray-600">
          <Tooltip content="View"><button className="p-1 rounded hover:bg-gray-100" aria-label="View"><Eye size={16} /></button></Tooltip>
          <Tooltip content="Edit"><button className="p-1 rounded hover:bg-gray-100" aria-label="Edit"><Pencil size={16} /></button></Tooltip>
          <Tooltip content="Archive"><button className="p-1 rounded hover:bg-gray-100" aria-label="Archive"><Archive size={16} /></button></Tooltip>
        </div>
      ),
    },
  ];

  const filteredData = React.useMemo(() => {
    let rows = [...sampleApplications];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (statusFilter !== 'All') rows = rows.filter((r) => r.status === statusFilter);

    const byDate = (a, b) => new Date(b.rollSignDate) - new Date(a.rollSignDate);
    const byDateAsc = (a, b) => new Date(a.rollSignDate) - new Date(b.rollSignDate);
    const byName = (a, b) => a.name.localeCompare(b.name);
    const byNameDesc = (a, b) => b.name.localeCompare(a.name);
    switch (sortBy) {
      case 'Newest': rows.sort(byDate); break;
      case 'Oldest': rows.sort(byDateAsc); break;
      case 'Name A-Z': rows.sort(byName); break;
      case 'Name Z-A': rows.sort(byNameDesc); break;
      default: break;
    }
    return rows;
  }, [query, statusFilter, sortBy]);

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
          filter={{ value: statusFilter, onChange: setStatusFilter, options: ['All', 'Verified', 'Rejected', 'Pending'], label: 'Filter by status' }}
          sort={{ value: sortBy, onChange: setSortBy, options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A'], label: 'Sort by' }}
          primaryButton={{ label: 'Add New', onClick: () => {}, className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]' }}
        />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredData} rowKey={(r) => r.email} dense />
    </div>
  );
};

export default ManageLawyerApplications;
