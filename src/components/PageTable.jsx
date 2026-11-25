// Shared table used by every list page
// Props:
//   columns: [{ key, label, className?, tdClass?, render?, sortable? }]
//     sortable defaults to true when key is not 'actions' and key doesn't start with '_'
//   rows: array of data objects
//   total: total count before filtering (optional, defaults to rows.length)
//   label: noun for the count line e.g. "products"
//   emptyText: override empty message

import { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Feedback } from './Feedback';
import { cn } from '../utils/cn';

const isSortableCol = (col) => {
  if (col.sortable === false) return false;
  if (col.sortable === true) return true;
  return col.key !== 'actions' && !col.key.startsWith('_');
};

const Th = ({ children, className = '', sortable, active, dir, onClick }) => (
  <th
    scope="col"
    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
    className={cn('bg-(--color-accent-soft) px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-text)', className)}
  >
    {sortable ? (
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      >
        <span className="min-w-0 truncate">{children}</span>
        <span aria-hidden="true" className={`shrink-0 transition-colors print:hidden ${active ? 'text-(--color-accent)' : 'text-(--color-text-muted) group-hover:text-(--color-text)'}`}>
          {active
            ? dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            : <ArrowUpDown size={14} />}
        </span>
      </button>
    ) : children}
  </th>
);

const Td = ({ children, className = '', colSpan, label }) => (
  <td
    colSpan={colSpan}
    className={cn('min-w-0 border-b border-(--color-border) px-3 py-2.5 text-sm text-(--color-text) last:border-b-0 md:table-cell md:border-b-0 md:border-r md:px-4 md:py-3 md:last:border-r-0 print:text-black', className)}
  >
    {label && (
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) md:hidden">
        {label}
      </span>
    )}
    <div className="min-w-0 break-words md:break-normal">{children}</div>
  </td>
);

const SkeletonRow = ({ columns }) => (
  <tr className="block overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-elevated) md:table-row md:rounded-none md:border-0 md:bg-transparent">
    {columns.map((column, index) => (
      <Td key={column.key} label={column.label} className="md:px-4">
        <div
          aria-hidden="true"
          className="h-4 animate-pulse rounded bg-(--color-accent-soft)"
          style={{ width: `${60 + ((index * 17) % 35)}%` }}
        />
      </Td>
    ))}
  </tr>
);

const PageTable = ({
  className = '',
  columns,
  rows,
  total,
  label = 'records',
  emptyText = 'No data found',
  onRowClick,
  onScroll,
  isLoading = false,
  pagination,
  rowClass,
  tbodyClass = '',
  footerRow,
}) => {
  const [sort, setSort] = useState({ col: null, dir: 'asc' });
  const [availableHeight, setAvailableHeight] = useState(null);
  const scrollContainerRef = useRef(null);
  const tableFooterRef = useRef(null);
  const sortableColumns = columns.filter(isSortableCol);
  const tableMinWidth = `${Math.max(44, columns.length * 9)}rem`;

  const handleSort = (key) =>
    setSort((current) => ({ col: key, dir: current.col === key && current.dir === 'asc' ? 'desc' : 'asc' }));

  const sortedRows = useMemo(() => {
    if (!sort.col) return rows;
    const sorted = [...rows].sort((a, b) => {
      let av = a[sort.col];
      let bv = b[sort.col];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av == null) return 1;
      if (bv == null) return -1;
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  }, [rows, sort]);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return undefined;

    const findScrollBoundary = () => {
      let ancestor = scrollContainer.parentElement;
      while (ancestor && ancestor !== document.body) {
        const { overflowY } = window.getComputedStyle(ancestor);
        if (overflowY === 'auto' || overflowY === 'scroll') return ancestor;
        ancestor = ancestor.parentElement;
      }
      return document.documentElement;
    };

    const boundary = findScrollBoundary();
    const updateAvailableHeight = () => {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      const boundaryTop = boundary === document.documentElement
        ? 0
        : boundary.getBoundingClientRect().top;
      const boundaryBottom = boundary === document.documentElement
        ? window.innerHeight
        : boundary.getBoundingClientRect().bottom;
      const visibleTop = Math.max(containerTop, boundaryTop);
      const footerSpace = (tableFooterRef.current?.getBoundingClientRect().height ?? 0) + 12;
      const nextHeight = Math.max(0, Math.floor(boundaryBottom - visibleTop - footerSpace));
      setAvailableHeight((currentHeight) => (
        currentHeight === nextHeight ? currentHeight : nextHeight
      ));
    };

    updateAvailableHeight();
    window.addEventListener('resize', updateAvailableHeight);
    boundary.addEventListener('scroll', updateAvailableHeight, { passive: true });

    const resizeObserver = new ResizeObserver(updateAvailableHeight);
    resizeObserver.observe(boundary);
    resizeObserver.observe(scrollContainer);
    if (tableFooterRef.current) resizeObserver.observe(tableFooterRef.current);

    return () => {
      window.removeEventListener('resize', updateAvailableHeight);
      boundary.removeEventListener('scroll', updateAvailableHeight);
      resizeObserver.disconnect();
    };
  }, [columns.length, isLoading, pagination, sortedRows.length]);

  return (
    <div className="box-border min-w-0 space-y-3">
      <div className={cn('glass-card min-w-0 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-none print:bg-transparent', className)}>
        {sortableColumns.length > 0 && sortedRows.length > 1 && (
          <div className="flex items-center gap-2 border-b border-(--color-border) px-3 py-2.5 md:hidden">
            <label htmlFor="page-table-sort" className="shrink-0 text-xs font-medium text-(--color-text-muted)">Sort by</label>
            <select
              id="page-table-sort"
              value={sort.col ?? ''}
              onChange={(event) => setSort({ col: event.target.value || null, dir: 'asc' })}
              className="min-w-0 flex-1 rounded-lg border border-(--color-border-strong) bg-(--color-bg-elevated) px-2.5 py-2 text-sm text-(--color-text) focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/20"
            >
              <option value="">Default order</option>
              {sortableColumns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setSort((current) => ({ ...current, dir: current.dir === 'asc' ? 'desc' : 'asc' }))}
              disabled={!sort.col}
              aria-label={`Sort ${sort.dir === 'asc' ? 'ascending' : 'descending'}`}
              title={`Sort ${sort.dir === 'asc' ? 'ascending' : 'descending'}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--color-border-strong) text-(--color-text) transition-colors hover:bg-(--color-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sort.dir === 'asc' ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
            </button>
          </div>
        )}
        <div
          ref={scrollContainerRef}
          onScroll={onScroll}
          className={cn('max-w-full overflow-auto overscroll-contain', tbodyClass)}
          style={availableHeight == null ? undefined : { maxHeight: `${availableHeight}px` }}
        >
          <table className="w-full min-w-0 border-collapse md:min-w-[var(--page-table-min-width)]" style={{ '--page-table-min-width': tableMinWidth }}>
            <thead className="hidden border-b-2 border-(--color-border-strong) bg-(--color-accent-soft) print:table-header-group md:sticky md:top-0 md:z-10 md:table-header-group md:shadow-[inset_0_-1px_0_0_var(--color-border-strong)]">
              <tr className="divide-x-2 divide-(--color-border-strong) md:divide-x md:divide-(--color-border-strong)">
                {columns.map((column) => (
                  <Th
                    key={column.key}
                    className={column.className}
                    sortable={isSortableCol(column)}
                    active={sort.col === column.key}
                    dir={sort.dir}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="grid gap-3 p-3 md:table-row-group md:divide-y md:divide-(--color-border) md:p-0">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonRow key={index} columns={columns} />
                ))
              ) : sortedRows.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={columns.length} className="block w-full p-0 md:table-cell">
                    <Feedback type="empty" title={emptyText} />
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, index) => (
                  <tr
                    key={row._id ?? row.id ?? index}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'block overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-elevated) transition-colors hover:border-(--color-accent)/40 hover:bg-(--color-accent-soft) md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:bg-transparent md:hover:bg-(--color-accent-soft)/50',
                      typeof rowClass === 'function' ? rowClass(row, index) : rowClass,
                    )}
                  >
                    {columns.map((column) => (
                      <Td
                        key={column.key}
                        label={column.label}
                        className={cn(
                          column.key === 'actions' && 'bg-(--color-bg)/30 md:bg-transparent',
                          typeof column.tdClass === 'function' ? column.tdClass(row, index) : column.tdClass,
                        )}
                      >
                        {column.render ? column.render(row, index) : row[column.key]}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {footerRow && <tfoot className="table-footer-group">{footerRow}</tfoot>}
          </table>
        </div>
      </div>

      <div ref={tableFooterRef} className="mx-1 flex min-w-0 flex-col gap-3 px-2 sm:mx-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-(--color-text-muted) sm:text-sm">
          Showing <span className="font-medium text-(--color-text)">{sortedRows.length}</span>
          {total !== undefined && total !== sortedRows.length
            ? <> of <span className="font-medium text-(--color-text)">{total}</span></>
            : null}{' '}
          {label}
        </p>
        {pagination && <div className="max-w-full overflow-x-auto">{pagination}</div>}
      </div>
    </div>
  );
};

export { Th, Td };
export default PageTable;
