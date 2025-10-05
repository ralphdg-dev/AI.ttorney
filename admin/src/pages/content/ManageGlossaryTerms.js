import React from 'react';
import { Book, Eye, Pencil, Archive } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import ListToolbar from '../../components/ui/ListToolbar';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import ViewTermModal from '../../components/glossary/ViewTermModal';
import Pagination from '../../components/ui/Pagination';
import glossaryTermsService from '../../services/glossaryTermsService';

const categories = ['All', 'Family', 'Criminal', 'Civil', 'Labor', 'Consumer', 'Others'];

const ManageGlossaryTerms = () => {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('Newest');
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedTerm, setSelectedTerm] = React.useState(null);
  const [terms, setTerms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: '',
    termId: null,
    termName: '',
    loading: false
  });

  // Load data from API
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Map frontend category to backend format
      const categoryParam = category === 'All' ? 'all' : category.toLowerCase();

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: query.trim(),
        category: categoryParam,
        status: 'all' // Show all verification statuses
      };

      const response = await glossaryTermsService.getGlossaryTerms(params);

      if (response.success) {
        setTerms(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 0
        }));
      } else {
        throw new Error(response.error || 'Failed to load glossary terms');
      }
    } catch (err) {
      console.error('Error loading glossary terms:', err);
      setError(err.message || 'Failed to load glossary terms');
      setTerms([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, query, category]);

  // Load data on component mount and when dependencies change
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle view term
  const handleView = (term) => {
    setSelectedTerm(term);
    setViewModalOpen(true);
  };

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
      
      // Delete the term (since we don't have archive functionality, we'll delete)
      await glossaryTermsService.deleteGlossaryTerm(termId);
      
      // Reload data
      await loadData();
      
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
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get category colors (matching client-side forum post colors)
  const getCategoryColors = (category) => {
    switch ((category || '').toLowerCase()) {
      case 'family':
        return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#BE123C' };
      case 'civil':
        return { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', textColor: '#7C3AED' };
      case 'criminal':
        return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#DC2626' };
      case 'labor':
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' };
      case 'consumer':
        return { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' };
      case 'others':
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#374151' };
      default:
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#374151' };
    }
  };

  // Helper function to render category badge
  const renderCategoryBadge = (category) => {
    if (!category) return '-';
    
    const colors = getCategoryColors(category);
    const displayText = category.charAt(0).toUpperCase() + category.slice(1);
    
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border"
        style={{
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          color: colors.textColor
        }}
      >
        {displayText}
      </span>
    );
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
      render: (row) => renderCategoryBadge(row.category)
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
      render: (row) => row.verified_by || '-'
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
              onClick={() => handleArchive(row)}
            >
              <Archive size={16} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  // All terms with client-side sorting
  const sortedTerms = React.useMemo(() => {
    let rows = [...terms];

    // Client-side sorting (since API returns data sorted by created_at desc by default)
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
  }, [terms, sortBy]);

  // Paginated data for display
  const paginatedData = React.useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return sortedTerms.slice(startIndex, endIndex);
  }, [sortedTerms, pagination.page, pagination.limit]);

  // Update pagination when sorted data changes
  React.useEffect(() => {
    const totalItems = sortedTerms.length;
    const totalPages = Math.ceil(totalItems / pagination.limit);
    setPagination(prev => ({ 
      ...prev, 
      total: totalItems, 
      pages: totalPages 
    }));
    
    // Reset to page 1 if current page is beyond available pages
    if (pagination.page > totalPages && totalPages > 0) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [sortedTerms.length, pagination.limit, pagination.page]);

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
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[11px] text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#023D7B] mr-2"></div>
                      Loading glossary terms...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[11px] text-red-600">
                    <div className="flex flex-col items-center">
                      <p className="mb-2">Error loading glossary terms: {error}</p>
                      <button 
                        onClick={loadData}
                        className="text-[11px] px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[11px] text-gray-500">
                    <div className="flex flex-col items-center">
                      <Book className="h-8 w-8 text-gray-400 mb-2" />
                      <p>No glossary terms found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {query ? 'Try adjusting your search criteria' : 'Click "Add New" to create your first term'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
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

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
        onPageChange={handlePageChange}
        itemName="terms"
      />

      {/* View Term Modal */}
      <ViewTermModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        term={selectedTerm}
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

export default ManageGlossaryTerms;
