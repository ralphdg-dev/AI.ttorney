import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Lightweight custom Select (button + popover menu)
 * Props:
 * - value: string
 * - onChange: (value: string) => void
 * - options: string[]
 * - ariaLabel?: string
 * - leftIcon?: ReactNode
 * - className?: string (applies to the closed button)
 */
const Select = ({ value, onChange, options = [], ariaLabel = 'Select', leftIcon, className = '' }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handle = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const current = value ?? '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-[11px] text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300 ${className}`}
      >
        <span className="flex items-center gap-1 text-gray-500">
          {leftIcon}
        </span>
        <span className="text-gray-700">{current}</span>
        <ChevronDown size={14} className="ml-1 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange?.(opt); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] ${opt === current ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Select;
