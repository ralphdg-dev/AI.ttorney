import React from 'react';

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

export default StatusBadge;
