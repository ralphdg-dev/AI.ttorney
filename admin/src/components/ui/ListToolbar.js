import React from 'react';
import { Search, Plus, Filter as FilterIcon, ArrowUpDown } from 'lucide-react';
import Select from './Select';

/**
 * Reusable compact list toolbar
 * Props:
 * - query: string
 * - onQueryChange: (value: string) => void
 * - totalText?: string | ReactNode (e.g., `Total Items: 5`)
 * - filter: { value: string, onChange: (value: string) => void, options: string[], label?: string }
 * - sort: { value: string, onChange: (value: string) => void, options: string[], label?: string }
 * - primaryButton?: { label: string, onClick: () => void, className?: string }
 */
const ListToolbar = ({
  query,
  onQueryChange,
  totalText,
  filter,
  sort,
  primaryButton,
}) => {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-3 py-1.5 rounded-md border border-gray-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>

        {/* Total */}
        {totalText ? (
          <div className="hidden md:block text-[10px] text-gray-600 whitespace-nowrap">
            {totalText}
          </div>
        ) : null}

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Filter */}
          {filter ? (
            <Select
              value={filter.value}
              onChange={(v) => filter.onChange?.(v)}
              options={filter.options || []}
              ariaLabel={filter.label || 'Filter'}
              leftIcon={<FilterIcon size={14} />}
              className="pl-1 pr-2"
            />
          ) : null}

          {/* Sort */}
          {sort ? (
            <Select
              value={sort.value}
              onChange={(v) => sort.onChange?.(v)}
              options={sort.options || []}
              ariaLabel={sort.label || 'Sort'}
              leftIcon={<ArrowUpDown size={14} />}
              className="pl-1 pr-2"
            />
          ) : null}

          {/* Primary button */}
          {primaryButton ? (
            <button
              onClick={primaryButton.onClick}
              className={`${primaryButton.className || 'inline-flex items-center gap-1 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-black'}`}
            >
              <Plus size={14} />
              {primaryButton.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ListToolbar;
