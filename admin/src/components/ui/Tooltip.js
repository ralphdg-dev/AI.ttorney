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
  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const base = 'absolute z-20 whitespace-nowrap rounded px-2 py-1 text-[10px] text-gray-700 bg-white border border-gray-200 shadow-sm';

  const getStyle = () => {
    switch (placement) {
      case 'bottom':
        return { wrapper: 'top-full left-1/2 -translate-x-1/2', margin: { marginTop: offset } };
      case 'left':
        return { wrapper: 'right-full top-1/2 -translate-y-1/2', margin: { marginRight: offset } };
      case 'right':
        return { wrapper: 'left-full top-1/2 -translate-y-1/2', margin: { marginLeft: offset } };
      case 'top':
      default:
        return { wrapper: 'bottom-full left-1/2 -translate-x-1/2', margin: { marginBottom: offset } };
    }
  };

  const pos = getStyle();

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
          role="tooltip"
          className={`${base} ${pos.wrapper} ${className}`}
          style={pos.margin}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
};

export default Tooltip;
