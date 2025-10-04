import React from 'react';
import { Book, Eye, Pencil, Archive } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const categories = ['All', 'Family', 'Criminal', 'Civil', 'Labor', 'Consumer', 'Others'];

const sampleTerms = [
  { 
    id: 1,
    term_en: 'Custody', 
    term_fil: 'Kustodiya', 
    definition_en: 'Legal guardianship of a child',
    definition_fil: 'Legal na pag-aalaga sa isang bata',
    example_en: 'The court awarded custody to the mother.',
    example_fil: 'Ibinigay ng korte ang kustodiya sa ina.',
    category: 'family', 
    created_at: '2025-08-01T10:30:00Z', 
    updated_at: '2025-08-15T14:20:00Z', 
    view_count: 125,
    is_verified: true,
    verified_by: 'Admin Jane'
  },
  { 
    id: 2,
    term_en: 'Contract', 
    term_fil: 'Kontrata', 
    definition_en: 'A legally binding agreement between parties',
    definition_fil: 'Isang legal na kasunduan sa pagitan ng mga partido',
    example_en: 'They signed a contract for the sale of the house.',
    example_fil: 'Pumirma sila ng kontrata para sa pagbebenta ng bahay.',
    category: 'civil', 
    created_at: '2025-07-20T09:15:00Z', 
    updated_at: '2025-08-10T16:45:00Z', 
    view_count: 89,
    is_verified: true,
    verified_by: 'Admin John'
  },
  { 
    id: 3,
    term_en: 'Warranty', 
    term_fil: 'Garantya', 
    definition_en: 'A guarantee provided by a seller',
    definition_fil: 'Garantiya na ibinibigay ng nagbebenta',
    example_en: 'The product comes with a one-year warranty.',
    example_fil: 'Ang produkto ay may kasamang isang taong garantiya.',
    category: 'consumer', 
    created_at: '2025-07-05T11:00:00Z', 
    updated_at: '2025-07-06T12:30:00Z', 
    view_count: 67,
    is_verified: false,
    verified_by: null
  },
  { 
    id: 4,
    term_en: 'Bail', 
    term_fil: 'Piyansa', 
    definition_en: 'Money paid to secure temporary release from custody',
    definition_fil: 'Perang bayad upang makakuha ng pansamantalang kalayaan',
    example_en: 'The judge set bail at $10,000.',
    example_fil: 'Itinakda ng hukom ang piyansa sa $10,000.',
    category: 'criminal', 
    created_at: '2025-06-11T08:45:00Z', 
    updated_at: '2025-06-12T10:15:00Z', 
    view_count: 203,
    is_verified: true,
    verified_by: 'Admin Mark'
  },
  { 
    id: 5,
    term_en: 'Dismissal', 
    term_fil: 'Pagkatanggal', 
    definition_en: 'Termination of employment',
    definition_fil: 'Pagkakaalis sa trabaho',
    example_en: 'The employee filed a case for wrongful dismissal.',
    example_fil: 'Naghain ang empleyado ng kaso para sa maling pagkatanggal.',
    category: 'labor', 
    created_at: '2025-05-02T13:20:00Z', 
    updated_at: '2025-07-01T15:10:00Z', 
    view_count: 156,
    is_verified: null,
    verified_by: null
  },
];

const ManageGlossaryTerms = () => {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    termId: null,
    termName: '',
    loading: false
  });

  // Handle edit term
  const handleEdit = (term) => {
    // For now, simulate edit changes since actual edit modal doesn't exist yet
    const simulatedChanges = {
      'Filipino Term': { from: term.term_fil, to: 'Updated Translation' },
      'Category': { from: term.category, to: 'civil' },
      'Definition (English)': { from: term.definition_en, to: 'Updated definition' },
      'Verification Status': { from: term.is_verified ? 'Verified' : 'Unverified', to: 'Verified' }
    };
    
    setConfirmationModal({
      open: true,
      type: 'edit',
      termId: term.id,
      termName: term.term_en,
      loading: false,
      changes: simulatedChanges
    });
  };

  // Handle add new term
  const handleAddNew = () => {
    setConfirmationModal({
      open: true,
      type: 'add',
      termId: null,
      termName: '',
      loading: false,
      changes: null
    });
  };

  // Handle archive term
  const handleArchive = (term) => {
    setConfirmationModal({
      open: true,
      type: 'archive',
      termId: term.id,
      termName: term.term_en,
      loading: false
    });
  };

  // Helper function to get modal content
  const getModalContent = () => {
    const { type, termName, changes } = confirmationModal;
    
    switch (type) {
      case 'archive':
        return {
          title: 'Archive Glossary Term',
          message: `Are you sure you want to archive "${termName}"? This term will be hidden from the main list but can be accessed through the "Archived" filter.`,
          confirmText: 'Archive Term',
          onConfirm: confirmArchive
        };
      case 'edit':
        const changesList = changes ? Object.entries(changes).map(([field, change]) => 
          `• ${field}: "${change.from}" → "${change.to}"`
        ).join('\n') : '';
        return {
          title: 'Confirm Term Changes',
          message: `Are you sure you want to save these changes to "${termName}"?\n\nChanges:\n${changesList}`,
          confirmText: 'Save Changes',
          onConfirm: confirmEdit
        };
      case 'add':
        return {
          title: 'Create New Glossary Term',
          message: 'Are you sure you want to create a new glossary term? This will add a new English-Filipino legal term to the database.',
          confirmText: 'Create Term',
          onConfirm: confirmAdd
        };
      default:
        return {};
    }
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ open: false, type: '', termId: null, termName: '', loading: false, changes: null });
  };

  // Handle archive confirmation
  const confirmArchive = async () => {
    const { termId, termName } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // TODO: Implement actual archive API call
      console.log(`Archiving term: ${termName}`);
      alert(`Term "${termName}" has been archived successfully!`);
      
      setConfirmationModal({ open: false, type: '', termId: null, termName: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to archive term:', err);
      alert('Failed to archive term: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle edit confirmation
  const confirmEdit = async () => {
    const { termId, termName, changes } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // TODO: Implement actual edit API call
      console.log(`Editing term: ${termName}`, changes);
      alert(`Term "${termName}" changes have been saved successfully!`);
      
      setConfirmationModal({ open: false, type: '', termId: null, termName: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to edit term:', err);
      alert('Failed to edit term: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle add confirmation
  const confirmAdd = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // TODO: Implement actual add API call
      console.log('Creating new glossary term');
      alert('New glossary term has been created successfully!');
      
      setConfirmationModal({ open: false, type: '', termId: null, termName: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to create term:', err);
      alert('Failed to create term: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Helper function to format date
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

  // Helper function to format category
  const formatCategory = (category) => {
    if (!category) return 'N/A';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Helper function to render verification status
  const renderVerificationStatus = (isVerified) => {
    if (isVerified === null) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">Pending</span>;
    }
    const styles = isVerified
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200';
    const label = isVerified ? 'Verified' : 'Unverified';
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>{label}</span>;
  };

  const columns = [
    { key: 'term_en', header: 'English Term' },
    { key: 'term_fil', header: 'Filipino Term' },
    { 
      key: 'category', 
      header: 'Category',
      render: (row) => formatCategory(row.category)
    },
    { 
      key: 'is_verified', 
      header: 'Status',
      align: 'center',
      render: (row) => renderVerificationStatus(row.is_verified)
    },
    { 
      key: 'created_at', 
      header: 'Created At',
      render: (row) => formatDate(row.created_at)
    },
    { 
      key: 'verified_by', 
      header: 'Verified By',
      render: (row) => row.verified_by || 'N/A'
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
              onClick={() => handleArchive(row)}
            >
              <Archive size={16} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const filteredData = React.useMemo(() => {
    let rows = [...sampleTerms];
    
    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => 
        r.term_en?.toLowerCase().includes(q) ||
        r.term_fil?.toLowerCase().includes(q) ||
        r.definition_en?.toLowerCase().includes(q) ||
        r.definition_fil?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.verified_by?.toLowerCase().includes(q)
      );
    }
    
    // Category filter
    if (category !== 'All') {
      rows = rows.filter((r) => formatCategory(r.category) === category);
    }

    // Sorting
    const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    const byDateAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    const byEn = (a, b) => (a.term_en || '').localeCompare(b.term_en || '');
    const byEnDesc = (a, b) => (b.term_en || '').localeCompare(a.term_en || '');
    const byViews = (a, b) => (b.view_count || 0) - (a.view_count || 0);
    const byViewsAsc = (a, b) => (a.view_count || 0) - (b.view_count || 0);
    
    switch (sortBy) {
      case 'Newest': rows.sort(byDate); break;
      case 'Oldest': rows.sort(byDateAsc); break;
      case 'A-Z (English)': rows.sort(byEn); break;
      case 'Z-A (English)': rows.sort(byEnDesc); break;
      case 'Most Viewed': rows.sort(byViews); break;
      case 'Least Viewed': rows.sort(byViewsAsc); break;
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
          sort={{ value: sortBy, onChange: setSortBy, options: ['Newest', 'Oldest', 'A-Z (English)', 'Z-A (English)', 'Most Viewed', 'Least Viewed'], label: 'Sort by' }}
          primaryButton={{ label: 'Add New', onClick: handleAddNew, className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]' }}
        />
      </div>

      {/* DataTable matching other admin pages */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-2 text-[10px] font-medium text-gray-500 tracking-wide ${
                      column.align === 'center' ? 'text-center' : 
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-2 text-center text-[11px] text-gray-500">
                    No glossary terms found.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-2 text-[11px] text-gray-700 ${
                          column.align === 'center' ? 'text-center' : 
                          column.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

export default ManageGlossaryTerms;
