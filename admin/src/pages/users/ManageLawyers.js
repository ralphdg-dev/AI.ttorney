import React from 'react';
import { Users, Eye, Pencil, Archive } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';

const sampleLawyers = [
  { name: 'Atty. Daniel Cruz', email: 'daniel.cruz@example.com', rollNumber: 'RN-2020-00123', rollSignDate: '2020-07-15', status: 'Verified' },
  { name: 'Atty. Sofia Mendoza', email: 'sofia.mendoza@example.com', rollNumber: 'RN-2018-00456', rollSignDate: '2018-03-22', status: 'Verified' },
  { name: 'Atty. Luis Santos', email: 'luis.santos@example.com', rollNumber: 'RN-2019-00987', rollSignDate: '2019-11-05', status: 'Verified' },
];

const VerifiedBadge = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>
);

const ManageLawyers = () => {
  const [query, setQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState('Newest');

  const columns = [
    { key: 'name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'rollNumber', header: 'Roll Number' },
    { key: 'rollSignDate', header: 'Roll Sign Date' },
    { key: 'status', header: 'Status', render: () => <VerifiedBadge /> },
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
    let rows = [...sampleLawyers];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
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
  }, [query, sortBy]);

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch"><Users size={14} /></div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Lawyers</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Verified lawyers only.</p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      {/* Toolbar */}
      <div className="w-full mb-3">
        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          sort={{ value: sortBy, onChange: setSortBy, options: ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A'], label: 'Sort by' }}
          primaryButton={{ label: 'Add New', onClick: () => {}, className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]' }}
        />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredData} rowKey={(r) => r.email} dense />
    </div>
  );
};

export default ManageLawyers;
