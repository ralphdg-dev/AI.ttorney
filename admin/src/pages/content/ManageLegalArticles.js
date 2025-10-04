import React from 'react';
import { FileText, Eye, Pencil, Archive } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const categories = ['All', 'Family', 'Civil', 'Consumer', 'Criminal', 'Labor'];

const sampleArticles = [
  { enTitle: 'Child Custody Basics', filTitle: 'Mga Pangunahing Kaalaman sa Kustodiya', category: 'Family', createdAt: '2025-08-01', updatedAt: '2025-08-15', createdBy: 'Admin Jane' },
  { enTitle: 'Contract Breach Remedies', filTitle: 'Mga Remedyo sa Paglabag ng Kontrata', category: 'Civil', createdAt: '2025-07-20', updatedAt: '2025-08-10', createdBy: 'Admin John' },
  { enTitle: 'Consumer Return Rights', filTitle: 'Mga Karapatan sa Pagbalik ng Produkto', category: 'Consumer', createdAt: '2025-07-05', updatedAt: '2025-07-06', createdBy: 'Admin Lea' },
  { enTitle: 'Understanding Bail', filTitle: 'Pag-unawa sa Piyansa', category: 'Criminal', createdAt: '2025-06-11', updatedAt: '2025-06-12', createdBy: 'Admin Mark' },
  { enTitle: 'Unlawful Dismissal', filTitle: 'Di-makatarungang Pagkatanggal', category: 'Labor', createdAt: '2025-05-02', updatedAt: '2025-07-01', createdBy: 'Admin Sofia' },
];

const ManageLegalArticles = () => {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    articleId: null,
    articleTitle: '',
    loading: false
  });

  // Handle edit article
  const handleEdit = (article) => {
    // For now, simulate edit changes since actual edit modal doesn't exist yet
    const simulatedChanges = {
      'Filipino Title': { from: article.filTitle, to: 'Updated Filipino Title' },
      'Category': { from: article.category, to: 'Criminal' }
    };
    
    setConfirmationModal({
      open: true,
      type: 'edit',
      articleId: article.enTitle,
      articleTitle: article.enTitle,
      loading: false,
      changes: simulatedChanges
    });
  };

  // Handle add new article
  const handleAddNew = () => {
    setConfirmationModal({
      open: true,
      type: 'add',
      articleId: null,
      articleTitle: '',
      loading: false,
      changes: null
    });
  };

  // Handle archive article
  const handleArchive = (article) => {
    setConfirmationModal({
      open: true,
      type: 'archive',
      articleId: article.enTitle, // Using English title as ID
      articleTitle: article.enTitle,
      loading: false
    });
  };

  // Helper function to get modal content
  const getModalContent = () => {
    const { type, articleTitle, changes } = confirmationModal;
    
    switch (type) {
      case 'archive':
        return {
          title: 'Archive Legal Article',
          message: `Are you sure you want to archive "${articleTitle}"? This article will be hidden from the main list but can be accessed through the "Archived" filter.`,
          confirmText: 'Archive Article',
          onConfirm: confirmArchive
        };
      case 'edit':
        const changesList = changes ? Object.entries(changes).map(([field, change]) => 
          `• ${field}: "${change.from}" → "${change.to}"`
        ).join('\n') : '';
        return {
          title: 'Confirm Article Changes',
          message: `Are you sure you want to save these changes to "${articleTitle}"?\n\nChanges:\n${changesList}`,
          confirmText: 'Save Changes',
          onConfirm: confirmEdit
        };
      case 'add':
        return {
          title: 'Create New Legal Article',
          message: 'Are you sure you want to create a new legal article? This will add a new English-Filipino legal article to the database.',
          confirmText: 'Create Article',
          onConfirm: confirmAdd
        };
      default:
        return {};
    }
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ open: false, type: '', articleId: null, articleTitle: '', loading: false, changes: null });
  };

  // Handle archive confirmation
  const confirmArchive = async () => {
    const { articleId, articleTitle } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // TODO: Implement actual archive API call
      console.log(`Archiving article: ${articleTitle}`);
      alert(`Article "${articleTitle}" has been archived successfully!`);
      
      setConfirmationModal({ open: false, type: '', articleId: null, articleTitle: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to archive article:', err);
      alert('Failed to archive article: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle edit confirmation
  const confirmEdit = async () => {
    const { articleId, articleTitle, changes } = confirmationModal;
    
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // TODO: Implement actual edit API call
      console.log(`Editing article: ${articleTitle}`, changes);
      alert(`Article "${articleTitle}" changes have been saved successfully!`);
      
      setConfirmationModal({ open: false, type: '', articleId: null, articleTitle: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to edit article:', err);
      alert('Failed to edit article: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle add confirmation
  const confirmAdd = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, loading: true }));
      
      // TODO: Implement actual add API call
      console.log('Creating new legal article');
      alert('New legal article has been created successfully!');
      
      setConfirmationModal({ open: false, type: '', articleId: null, articleTitle: '', loading: false, changes: null });
      
    } catch (err) {
      console.error('Failed to create article:', err);
      alert('Failed to create article: ' + err.message);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    { key: 'enTitle', header: 'English Title' },
    { key: 'filTitle', header: 'Filipino Title' },
    { key: 'category', header: 'Category' },
    { key: 'createdAt', header: 'Created At' },
    { key: 'updatedAt', header: 'Updated At' },
    { key: 'createdBy', header: 'Created By' },
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
    let rows = [...sampleArticles];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (category !== 'All') rows = rows.filter((r) => r.category === category);

    const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    const byDateAsc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const byTitle = (a, b) => a.enTitle.localeCompare(b.enTitle);
    const byTitleDesc = (a, b) => b.enTitle.localeCompare(a.enTitle);
    switch (sortBy) {
      case 'Newest': rows.sort(byDate); break;
      case 'Oldest': rows.sort(byDateAsc); break;
      case 'A-Z (Title)': rows.sort(byTitle); break;
      case 'Z-A (Title)': rows.sort(byTitleDesc); break;
      default: break;
    }
    return rows;
  }, [query, category, sortBy]);

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B] self-stretch"><FileText size={14} /></div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">Manage Legal Articles</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">English/Filipino articles categorized by law domain.</p>
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
          sort={{ value: sortBy, onChange: setSortBy, options: ['Newest', 'Oldest', 'A-Z (Title)', 'Z-A (Title)'], label: 'Sort by' }}
          primaryButton={{ label: 'Add New', onClick: handleAddNew, className: 'inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]' }}
        />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredData} rowKey={(r) => `${r.enTitle}-${r.filTitle}`} dense />

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

export default ManageLegalArticles;
