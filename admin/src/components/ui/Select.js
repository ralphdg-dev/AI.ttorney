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
 * - variant?: 'toolbar' | 'form' (default: 'toolbar')
 * - error?: boolean (for form validation)
 * - disabled?: boolean
 * - placeholder?: string
 */
const Select = ({ 
  value, 
  onChange, 
  options = [], 
  ariaLabel = 'Select', 
  leftIcon, 
  className = '',
  variant = 'toolbar',
  error = false,
  disabled = false,
  placeholder = 'Select...'
}) => {
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
  const displayValue = current || placeholder;

  // Get styling based on variant
  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center justify-between w-full rounded-md border bg-white focus:outline-none";
    
    if (variant === 'form') {
      const errorStyles = error ? 'border-red-300' : 'border-gray-300';
      const focusStyles = error 
        ? 'focus:ring-1 focus:ring-red-500 focus:border-red-500' 
        : 'focus:ring-1 focus:ring-[#023D7B] focus:border-[#023D7B]';
      const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50';
      
      return `${baseStyles} px-2 py-1.5 text-xs text-gray-700 ${errorStyles} ${focusStyles} ${disabledStyles}`;
    } else {
      // toolbar variant (default)
      return `${baseStyles} gap-2 pl-2 pr-2.5 py-1.5 border-gray-200 text-[11px] text-gray-700 hover:bg-gray-50 focus:ring-1 focus:ring-gray-300`;
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`${getButtonStyles()} ${className}`}
      >
        {variant === 'toolbar' && leftIcon && (
          <span className="flex items-center gap-1 text-gray-500">
            {leftIcon}
          </span>
        )}
        <span className={`${!current && variant === 'form' ? 'text-gray-400' : 'text-gray-700'} ${variant === 'form' ? 'text-left' : ''}`}>
          {displayValue}
        </span>
        <ChevronDown size={variant === 'form' ? 12 : 14} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && !disabled && (
        <div className={`absolute z-[9998] mt-1 rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden ${
          variant === 'form' ? 'left-0 right-0' : 'right-0 w-40'
        }`}>
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange?.(opt); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 ${
                    variant === 'form' ? 'text-xs' : 'text-[11px]'
                  } ${opt === current ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
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
