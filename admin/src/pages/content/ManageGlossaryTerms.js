import React from 'react';
import { Book, Eye, Pencil, Archive } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';

const categories = ['All', 'Family', 'Civil', 'Consumer', 'Criminal', 'Labor'];

const sampleTerms = [
  { en: 'Custody', fil: 'Kustodiya', category: 'Family', createdAt: '2025-08-01', updatedAt: '2025-08-15', createdBy: 'Admin Jane' },
  { en: 'Contract', fil: 'Kontrata', category: 'Civil', createdAt: '2025-07-20', updatedAt: '2025-08-10', createdBy: 'Admin John' },
  { en: 'Warranty', fil: 'Garantya', category: 'Consumer', createdAt: '2025-07-05', updatedAt: '2025-07-06', createdBy: 'Admin Lea' },
  { en: 'Bail', fil: 'Piyansa', category: 'Criminal', createdAt: '2025-06-11', updatedAt: '2025-06-12', createdBy: 'Admin Mark' },
  { en: 'Dismissal', fil: 'Pagkatanggal', category: 'Labor', createdAt: '2025-05-02', updatedAt: '2025-07-01', createdBy: 'Admin Sofia' },
];

const ManageGlossaryTerms = () => {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');

  const columns = [
    { key: 'en', header: 'English Term' },
    { key: 'fil', header: 'Filipino Term' },
    { key: 'category', header: 'Category' },
    { key: 'createdAt', header: 'Created At' },
    { key: 'updatedAt', header: 'Updated At' },
    { key: 'createdBy', header: 'Created By' },
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
    let rows = [...sampleTerms];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (category !== 'All') rows = rows.filter((r) => r.category === category);

    const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    const byDateAsc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const byEn = (a, b) => a.en.localeCompare(b.en);
    const byEnDesc = (a, b) => b.en.localeCompare(a.en);
    switch (sortBy) {
      case 'Newest': rows.sort(byDate); break;
      case 'Oldest': rows.sort(byDateAsc); break;
      case 'A-Z (English)': rows.sort(byEn); break;
      case 'Z-A (English)': rows.sort(byEnDesc); break;
      default: break;
    }
    return rows;
  }, [query, category, sortBy]);

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch"><Book size={14} /></div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Glossary Terms</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">English/Filipino terms categorized by law domain.</p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      {/* Toolbar */}
      <div className="w-full mb-3">
        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          filter={{ value: category, onChange: setCategory, options: categories, label: 'Category' }}
          sort={{ value: sortBy, onChange: setSortBy, options: ['Newest', 'Oldest', 'A-Z (English)', 'Z-A (English)'], label: 'Sort by' }}
          primaryButton={{ label: 'Add New', onClick: () => {}, className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]' }}
        />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredData} rowKey={(r) => `${r.en}-${r.fil}`} dense />
    </div>
  );
};

export default ManageGlossaryTerms;
