import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange,
  itemName = 'items'
}) => {
  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalItems === 0) {
    return null;
  }

  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-4 flex items-center justify-between">
      {/* Pagination Info */}
      <div className="text-xs text-gray-500">
        Showing {startItem} to {endItem} of {totalItems} {itemName}
      </div>

      {/* Pagination Buttons */}
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <ChevronLeft size={14} className="mr-1" />
          Previous
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1.5 text-xs border rounded-md ${
                  currentPage === pageNum
                    ? 'bg-[#023D7B] text-white border-[#023D7B]'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          Next
          <ChevronRight size={14} className="ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
