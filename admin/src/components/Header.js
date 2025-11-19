import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { getBreadcrumbForItem } from './menuConfig';

const Header = ({ activeItem }) => {
  const crumbs = getBreadcrumbForItem(activeItem);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <nav aria-label="Breadcrumb" className="flex items-center">
        <LayoutGrid size={16} className="text-gray-500 mr-2" />
        <ol className="flex items-center text-[11px]">
          {crumbs.map((c, idx) => (
            <li key={`${c}-${idx}`} className="flex items-center">
              <span className={`whitespace-nowrap ${idx === crumbs.length - 1 ? 'text-gray-900' : 'text-gray-500'}`}>{c}</span>
              {idx < crumbs.length - 1 && (
                <span className="mx-3 text-gray-300">/</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex items-center space-x-4 opacity-0 select-none">
        {/* Right side actions placeholder (kept minimal to match screenshot) */}
        <span className="w-2 h-2 bg-gray-200 rounded-full" />
        <span className="w-2 h-2 bg-gray-200 rounded-full" />
        <span className="w-2 h-2 bg-gray-200 rounded-full" />
      </div>
    </header>
  );
};

export default Header;