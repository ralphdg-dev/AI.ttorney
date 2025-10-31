import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

const RollMatchBadge = ({ 
  status, 
  isArchived = false, 
  nameMatch = null,
  dateMatch = null,
  warnings = null,
  showDetails = false 
}) => {
  // Don't show badge for archived items
  if (isArchived) {
    return null;
  }

  const getBadgeConfig = (status) => {
    switch (status) {
      case 'matched':
        return {
          icon: CheckCircle,
          text: 'Verified',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          iconColor: 'text-emerald-600'
        };
      case 'matched_with_warnings':
        return {
          icon: AlertTriangle,
          text: 'Warning',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600'
        };
      case 'not_found':
        return {
          icon: XCircle,
          text: 'Not Found',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600'
        };
      default:
        return {
          icon: HelpCircle,
          text: 'Unknown',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getBadgeConfig(status);
  const Icon = config.icon;

  const getTooltipContent = () => {
    if (status === 'matched') {
      return 'Roll number verified in PRA records';
    }
    
    if (status === 'matched_with_warnings' && warnings) {
      return `Roll number found but: ${warnings.join(', ')}`;
    }
    
    if (status === 'not_found') {
      return 'Roll number not found in PRA records';
    }
    
    return 'Status unknown';
  };

  const renderDetails = () => {
    if (!showDetails) return null;

    return (
      <div className="mt-1 text-[9px] space-y-0.5">
        {nameMatch && (
          <div className="flex items-center gap-1">
            {nameMatch.matched ? (
              <CheckCircle size={8} className="text-emerald-600" />
            ) : (
              <XCircle size={8} className="text-red-600" />
            )}
            <span className={nameMatch.matched ? 'text-emerald-700' : 'text-red-700'}>
              Name: {nameMatch.confidence || 'No match'}
            </span>
          </div>
        )}
        {dateMatch && (
          <div className="flex items-center gap-1">
            {dateMatch.matched ? (
              <CheckCircle size={8} className="text-emerald-600" />
            ) : (
              <XCircle size={8} className="text-red-600" />
            )}
            <span className={dateMatch.matched ? 'text-emerald-700' : 'text-red-700'}>
              Date: {dateMatch.matched ? 'Match' : 'Mismatch'}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="inline-block" title={getTooltipContent()}>
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
      >
        <Icon size={10} className={config.iconColor} />
        <span>{config.text}</span>
      </span>
      {renderDetails()}
    </div>
  );
};

export default RollMatchBadge;