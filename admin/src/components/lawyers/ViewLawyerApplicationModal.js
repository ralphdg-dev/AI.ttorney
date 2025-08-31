import React from 'react';
import Modal from '../ui/Modal';

const ViewLawyerApplicationModal = ({ open, onClose, application }) => {
  if (!application) return <Modal open={open} onClose={onClose} title="Lawyer Application Details" />;

  const {
    name,
    rollNumber,
    rollSignDate,
    registered,
    ibpCardUrl,
    liveSelfieUrl,
    praStatus,
  } = application || {};

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

  return (
    <Modal open={open} onClose={onClose} title="Lawyer Application Details" width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-500">Full Name</div>
            <div className="text-sm font-medium text-gray-900">{name || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Roll Number</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900">{rollNumber || '-'}</div>
              <RollMatchBadge status={praStatus} />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Roll Sign Date</div>
            <div className="text-sm font-medium text-gray-900">{rollSignDate || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Registration Date</div>
            <div className="text-sm font-medium text-gray-900">{registered || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-1">IBP Card</div>
            {ibpCardUrl ? (
              <img src={ibpCardUrl} alt="IBP Card" className="w-full h-48 object-cover rounded-md border border-gray-200" />
            ) : (
              <div className="w-full h-48 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[11px] text-gray-500">
                No image available
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-1">Live Selfie</div>
            {liveSelfieUrl ? (
              <img src={liveSelfieUrl} alt="Live Selfie" className="w-full h-48 object-cover rounded-md border border-gray-200" />
            ) : (
              <div className="w-full h-48 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[11px] text-gray-500">
                No image available
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewLawyerApplicationModal;
