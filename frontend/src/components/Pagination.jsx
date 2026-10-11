import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Database
} from "lucide-react";

/**
 * Modern, fully functional pagination component.
 * Supports:
 * - Dynamic page windowing with ellipsis
 * - Rows per page selection
 * - Jump-to-page direct input
 * - Total items range display
 * - Accessible keyboard & disabled states
 */
export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = "entries",
  showJump = true,
}) => {
  const [jumpInput, setJumpInput] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate smart pagination page numbers
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const leftSide = Math.max(2, safeCurrentPage - 1);
    const rightSide = Math.min(totalPages - 1, safeCurrentPage + 1);

    pages.push(1);

    if (leftSide > 2) {
      pages.push("...");
    }

    for (let i = leftSide; i <= rightSide; i++) {
      pages.push(i);
    }

    if (rightSide < totalPages - 1) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  const handlePageClick = (page) => {
    if (page === "..." || page === safeCurrentPage) return;
    if (page >= 1 && page <= totalPages && onPageChange) {
      onPageChange(page);
    }
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages && onPageChange) {
      onPageChange(parsed);
      setJumpInput("");
    }
  };

  return (
    <div className="pagination-wrapper">
      {/* Left side: Results Count & Page Size Dropdown */}
      <div className="pagination-info">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Database size={13} color="var(--blue-accent)" />
          <span>
            Showing <strong style={{ color: "var(--text-primary)" }}>{startItem}</strong>–
            <strong style={{ color: "var(--text-primary)" }}>{endItem}</strong> of{" "}
            <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> {itemLabel}
          </span>
        </div>

        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="pagination-size-select">
            <label htmlFor="pagination-rows-select">Rows:</label>
            <select
              id="pagination-rows-select"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
              }}
              title="Select number of items per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons & Jump */}
      <div className="pagination-nav">
        {/* First Page */}
        <button
          onClick={() => handlePageClick(1)}
          disabled={safeCurrentPage <= 1}
          className="pagination-btn"
          title="First Page"
          aria-label="Go to first page"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="pagination-btn"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((item, idx) => {
          if (item === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                •••
              </span>
            );
          }

          const isActive = item === safeCurrentPage;
          return (
            <button
              key={`page-${item}`}
              onClick={() => handlePageClick(item)}
              className={`pagination-btn ${isActive ? "active" : ""}`}
              aria-label={`Page ${item}`}
              aria-current={isActive ? "page" : undefined}
            >
              {item}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="pagination-btn"
          title="Next Page"
          aria-label="Go to next page"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => handlePageClick(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="pagination-btn"
          title="Last Page"
          aria-label="Go to last page"
        >
          <ChevronsRight size={14} />
        </button>

        {/* Direct Jump to Page */}
        {showJump && totalPages > 1 && (
          <form onSubmit={handleJumpSubmit} className="pagination-jump">
            <span>Go to:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              placeholder={String(safeCurrentPage)}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="pagination-jump-input"
              title={`Enter page 1 to ${totalPages} and press Enter`}
            />
          </form>
        )}
      </div>
    </div>
  );
};
