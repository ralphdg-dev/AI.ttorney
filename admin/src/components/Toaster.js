import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const typeStyles = {
  success: {
    icon: <CheckCircle2 className="text-green-700" size={18} />,
    bg: 'bg-green-100',
    border: 'border-green-200',
    text: 'text-green-900',
  },
  error: {
    icon: <XCircle className="text-red-700" size={18} />,
    bg: 'bg-red-100',
    border: 'border-red-200',
    text: 'text-red-900',
  },
  warning: {
    icon: <AlertTriangle className="text-amber-700" size={18} />,
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    text: 'text-amber-900',
  },
  info: {
    icon: <Info className="text-blue-700" size={18} />,
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    text: 'text-blue-900',
  },
};

export default function Toaster() {
  const { toasts, hide } = useToast();

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-start justify-center">
      <div className="mt-8 space-y-3 w-[92vw] max-w-md px-3 sm:px-0">
      {toasts.map((t) => {
        const style = typeStyles[t.type] || typeStyles.info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 ${style.bg} ${style.text} border ${style.border} rounded-lg p-3 shadow-sm ${t.visible ? 'animate-toast-in' : 'animate-toast-out'}`}
          >
            <div className="mt-0.5">{style.icon}</div>
            <div className="flex-1 text-sm">
              {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
              <div className="leading-snug">{t.message}</div>
            </div>
            <button
              onClick={() => hide(t.id)}
              className="text-black/40 hover:text-black/60"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
}
