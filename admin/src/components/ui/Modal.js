import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, width = 'max-w-lg', showCloseButton = true }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={showCloseButton ? onClose : undefined} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${width} rounded-lg bg-white shadow-xl border border-gray-200`}> 
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {showCloseButton && (
              <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
