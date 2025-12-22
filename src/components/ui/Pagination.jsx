/**
 * Pagination Component
 * Reusable pagination with consistent styling across the app
 */

import React from 'react';

/**
 * Pagination - Full-featured pagination component
 * @param {Object} props
 * @param {number} props.currentPage - Current page number (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.pageSize - Items per page
 * @param {function} props.onPageChange - Callback when page changes
 * @param {function} props.onPageSizeChange - Callback when page size changes (optional)
 * @param {Array} props.pageSizeOptions - Available page sizes (default: [25, 50, 100])
 * @param {boolean} props.loading - Disable controls while loading
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.itemLabel - Label for items (default: 'items')
 */
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  loading = false,
  className = '',
  itemLabel = 'items',
}) => {
  // Calculate display range
  const startIndex = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Don't render if no items or only 1 page with no page size change
  if (totalItems === 0 && !onPageSizeChange) {
    return null;
  }

  return (
    <div
      className={`
        px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 
        flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4
        ${className}
      `}
    >
      {/* Left side: Info and page size selector */}
      <div className="flex items-center gap-3">
        <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
          Showing{' '}
          <span className="text-emerald-600">{startIndex}</span>
          {' '}to{' '}
          <span className="text-emerald-600">{endIndex}</span>
          {' '}of{' '}
          <span className="text-zinc-900">{totalItems}</span>
          {' '}{itemLabel}
        </div>
        
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-600">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              disabled={loading}
              className="px-2 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
          {/* First button */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            First
          </button>
          
          {/* Previous button */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Prev
          </button>
          
          {/* Page indicator */}
          <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
            Page{' '}
            <span className="text-emerald-600">{currentPage}</span>
            {' '}of{' '}
            <span className="text-zinc-900">{totalPages}</span>
          </span>
          
          {/* Next button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || loading}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Next
          </button>
          
          {/* Last button */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || loading}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * SimplePagination - Minimal pagination with just prev/next
 * @param {Object} props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total pages
 * @param {function} props.onPageChange - Page change callback
 * @param {boolean} props.loading - Disable while loading
 */
export const SimplePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
      <span className="text-xs text-zinc-500">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || loading}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || loading}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * NumberedPagination - Pagination with page number buttons
 * @param {Object} props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total pages
 * @param {function} props.onPageChange - Page change callback
 * @param {boolean} props.loading - Disable while loading
 * @param {number} props.maxButtons - Max number of page buttons to show (default: 5)
 */
export const NumberedPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  maxButtons = 5,
}) => {
  if (totalPages <= 1) return null;

  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    let startPage, endPage;

    if (totalPages <= maxButtons) {
      startPage = 1;
      endPage = totalPages;
    } else if (currentPage <= Math.ceil(maxButtons / 2)) {
      startPage = 1;
      endPage = maxButtons;
    } else if (currentPage >= totalPages - Math.floor(maxButtons / 2)) {
      startPage = totalPages - maxButtons + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - Math.floor(maxButtons / 2);
      endPage = currentPage + Math.floor(maxButtons / 2);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {/* Previous */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || loading}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Page numbers */}
      {pageNumbers.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          disabled={loading}
          className={`
            inline-flex items-center justify-center h-8 w-8 rounded-md text-xs font-medium
            ${currentPage === pageNum
              ? 'bg-emerald-600 text-white'
              : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }
            disabled:cursor-not-allowed
          `}
        >
          {pageNum}
        </button>
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || loading}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

export default Pagination;


