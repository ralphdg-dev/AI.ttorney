import React from 'react';

/**
 * Reusable status badge component that automatically handles archived styling
 * Props:
 * - status: string - The status value
 * - isArchived: boolean - Whether the item is archived
 * - statusConfig: object - Configuration for status colors and labels
 * 
 * Example statusConfig:
 * {
 *   active: { color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Active' },
 *   disabled: { color: 'bg-gray-50 text-gray-700 border border-gray-200', label: 'Disabled' },
 *   pending: { color: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Pending' }
 * }
 */
const ArchivableStatusBadge = ({ status, isArchived = false, statusConfig = {} }) => {
  const getStatusStyles = (status) => {
    // Always use gray styling for archived items
    if (isArchived) {
      return 'bg-gray-200 text-gray-600 border border-gray-300';
    }
    
    // Use provided config or fallback to default
    const config = statusConfig[status?.toLowerCase()];
    if (config) {
      return config.color;
    }
    
    // Default fallback
    return 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const getDisplayStatus = (status) => {
    const config = statusConfig[status?.toLowerCase()];
    if (config) {
      return config.label;
    }
    
    // Fallback to capitalized status
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  };

  const styles = getStatusStyles(status);
  const displayStatus = getDisplayStatus(status);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {displayStatus}
    </span>
  );
};

export default ArchivableStatusBadge;
