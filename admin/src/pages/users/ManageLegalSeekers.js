import React from 'react';
import { Eye, Pencil, Archive, Users } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';

const sampleData = [
  { name: 'Maria Dela Cruz', email: 'maria.dc@example.com', birthdate: '1995-03-12', registered: '2025-08-10', status: 'Active' },
  { name: 'Juan Santos', email: 'juan.santos@example.com', birthdate: '1992-11-02', registered: '2025-08-08', status: 'Pending' },
  { name: 'Katrina Lim', email: 'kat.lim@example.com', birthdate: '1998-06-22', registered: '2025-08-05', status: 'Suspended' },
  { name: 'Roberto Reyes', email: 'rob.reyes@example.com', birthdate: '1990-01-18', registered: '2025-08-01', status: 'Active' },
];

const Badge = ({ status }) => {
  const styles =
    status === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'Suspended'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {status}
    </span>
  );
};

const ManageLegalSeekers = () => {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest'); // Newest | Oldest | Name A-Z | Name Z-A

  const columns = [
    { key: 'name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'birthdate', header: 'Birthdate' },
    { key: 'registered', header: 'Registration Date' },
    {
      key: 'status',
      header: 'Account Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end space-x-2 text-gray-600">
          <Tooltip content="View">
            <button className="p-1 rounded hover:bg-gray-100" aria-label="View">
              <Eye size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Edit">
            <button className="p-1 rounded hover:bg-gray-100" aria-label="Edit">
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

  const filteredData = React.useMemo(() => {
    let rows = [...sampleData];
    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((val) => String(val).toLowerCase().includes(q))
      );
    }
    // Filter by status
    if (statusFilter !== 'All') {
      rows = rows.filter(r => r.status === statusFilter);
    }
    // Sort
    const byDate = (a, b) => new Date(b.registered) - new Date(a.registered);
    const byDateAsc = (a, b) => new Date(a.registered) - new Date(b.registered);
    const byName = (a, b) => a.name.localeCompare(b.name);
    const byNameDesc = (a, b) => b.name.localeCompare(a.name);
    switch (sortBy) {
      case 'Newest':
        rows.sort(byDate); break;
      case 'Oldest':
        rows.sort(byDateAsc); break;
      case 'Name A-Z':
        rows.sort(byName); break;
      case 'Name Z-A':
        rows.sort(byNameDesc); break;
      default: break;
    }
    return rows;
  }, [query, statusFilter, sortBy]);

  return (
    <div>
      {/* Header Title + Subtitle with Icon */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch">
            <Users size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Legal Seekers</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Search, filter and manage legal seeker accounts.</p>
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
            options: ['All', 'Active', 'Pending', 'Suspended'],
            label: 'Filter by status',
          }}
          sort={{
            value: sortBy,
            onChange: setSortBy,
            options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A'],
            label: 'Sort by',
          }}
          primaryButton={{ label: 'Add New', onClick: () => {}, className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]' }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        rowKey={(row) => row.email}
        dense
      />
    </div>
  );
};

export default ManageLegalSeekers;
