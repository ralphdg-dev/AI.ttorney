import React from 'react';

const RollMatchBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const isMatched = s === 'matched';
  const styles = isMatched
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-red-50 text-red-700 border border-red-200';
  const label = isMatched ? 'Matched' : 'Not Found';
  
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
      {label}
    </span>
  );
};

export default RollMatchBadge;
