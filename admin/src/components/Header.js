import React from "react";
import { LayoutGrid, Menu } from "lucide-react";
import { getBreadcrumbForItem } from "./menuConfig";

const Header = ({ activeItem, onToggleSidebar }) => {
  const crumbs = getBreadcrumbForItem(activeItem);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
      <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
        <LayoutGrid size={16} className="text-gray-500 mr-2" />
        <ol className="flex items-center text-[11px] overflow-x-auto">
          {crumbs.map((c, idx) => (
            <li key={`${c}-${idx}`} className="flex items-center">
              <span
                className={`whitespace-nowrap ${
                  idx === crumbs.length - 1 ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {c}
              </span>
              {idx < crumbs.length - 1 && (
                <span className="mx-3 text-gray-300">/</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden ml-2"
        onClick={() => onToggleSidebar && onToggleSidebar()}
        aria-label="Toggle navigation menu"
      >
        <Menu size={18} />
      </button>
      <div className="hidden md:flex items-center space-x-4 opacity-0 select-none">
        {/* Right side actions placeholder (kept minimal to match screenshot) */}
        <span className="w-2 h-2 bg-gray-200 rounded-full" />
        <span className="w-2 h-2 bg-gray-200 rounded-full" />
        <span className="w-2 h-2 bg-gray-200 rounded-full" />
      </div>
    </header>
  );
};

export default Header;
