import React from 'react';

/**
 * Lightweight reusable Tooltip
 * Props:
 * - content: string | ReactNode (tooltip text)
 * - placement: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * - offset: number (px, default: 6)
 * - className: extra classes for the bubble
 */
const Tooltip = ({ content, placement = 'top', offset = 6, className = '', children }) => {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const tooltipRef = React.useRef(null);

  const show = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top - offset;
    
    // Adjust position based on placement
    switch (placement) {
      case 'bottom':
        y = rect.bottom + offset;
        break;
      case 'left':
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
      case 'top':
      default:
        y = rect.top - offset;
        break;
    }
    
    setPosition({ x, y });
    setVisible(true);
  };
  
  const hide = () => setVisible(false);

  const base = 'fixed z-50 whitespace-nowrap rounded px-2 py-1 text-[10px] text-gray-700 bg-white border border-gray-200 shadow-sm pointer-events-none';

  const getTransformClass = () => {
    switch (placement) {
      case 'bottom':
        return '-translate-x-1/2';
      case 'left':
        return '-translate-x-full -translate-y-1/2';
      case 'right':
        return '-translate-y-1/2';
      case 'top':
      default:
        return '-translate-x-1/2 -translate-y-full';
    }
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content ? (
        <span
          ref={tooltipRef}
          role="tooltip"
          className={`${base} ${getTransformClass()} ${className}`}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
};

export default Tooltip;
