// Shared table used by every list page
// Props:
//   columns: [{ key, label, className?, tdClass?, render?, sortable? }]
//     sortable defaults to true when key is not 'actions' and key doesn't start with '_'
//   rows: array of data objects
//   total: total count before filtering (optional, defaults to rows.length)
//   label: noun for the count line e.g. "products"
//   emptyText: override empty message

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Feedback, LoadingState } from './Feedback';

const isSortableCol = (col) => {
  if (col.sortable === false) return false;
  if (col.sortable === true) return true;
  // auto: non-sortable if key is 'actions' or starts with '_'
  return col.key !== 'actions' && !col.key.startsWith('_');
};

const Th = ({ children, className = "", sortable, active, dir, onClick }) => (
  <th
    onClick={sortable ? onClick : undefined}
    className={`bg-(--color-accent-soft) px-4 py-3.5 text-left text-sm font-semibold uppercase text-[var(--color-text)] ${sortable ? 'group cursor-pointer select-none' : ''} ${className}`}
  >
    <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
      {children}
      {sortable && (
        <span className={`shrink-0 transition-colors print:hidden ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
          {active
            ? dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
            : <ArrowUpDown size={12} />}
        </span>
      )}
    </span>
  </th>
);

const Td = ({ children, className = "", colSpan }) => (
  <td
    colSpan={colSpan}
    className={`border-r border-(--color-border) px-4 py-3 text-sm text-(--color-text) last:border-r-0 print:text-black overflow-hidden text-ellipsis ${className}`}
  >
    {children}
  </td>
);

const SkeletonRow = ({ cols }) => (
  <tr className="flex w-full">
    {Array.from({ length: cols }).map((_, i) => (
      <Td key={i} className="flex-1 min-w-0 w-0">
        <div
          className="h-4 animate-pulse rounded bg-(--color-accent-soft)"
          style={{ width: `${60 + ((i * 17) % 35)}%` }}
        />
      </Td>
    ))}
  </tr>
);

const PageTable = ({
  className = "max-h-[65.5vh]",
  columns,
  rows,
  total,
  label = "records",
  emptyText = "No data found",
  onRowClick,
  onScroll,
  isLoading = false,
  pagination,
  rowClass,
  tbodyClass = "max-h-[500px]",
  footerRow,
}) => {
  const [sort, setSort] = useState({ col: null, dir: 'asc' });

  const handleSort = (key) =>
    setSort(s => ({ col: key, dir: s.col === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const sortedRows = useMemo(() => {
    if (!sort.col) return rows;
    const sorted = [...rows].sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av == null) return 1;
      if (bv == null) return -1;
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  }, [rows, sort]);

  return (
    <div className="box-border space-y-3">
      <div className={`${className} glass-card rounded-xl border-(--color-border) bg-(--color-surface) shadow-none print:bg-transparent overflow-hidden`}>
        <table className="w-full flex flex-col">
          {/* Header */}
          <thead className="block border-b-2 border-(--color-border-strong) print:bg-(--color-bg-elevated) ">
            <tr className="flex w-full">
              {columns.map((col) => (
                <Th
                  key={col.key}
                  className={`flex-1 min-w-0 w-0 last:pr-[31px] ${col.className ?? ''}`}
                  sortable={isSortableCol(col)}
                  active={sort.col === col.key}
                  dir={sort.dir}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>

          {/* Scrollable Body */}
          <tbody 
            onScroll={onScroll} 
            className={`${tbodyClass} block overflow-y-auto divide-y divide-(--color-border)`}
          >
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : sortedRows.length === 0 ? (
              <tr className="flex w-full">
                <td colSpan={columns.length} className="w-full p-0">
                  <Feedback type="empty" title={emptyText} />
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => (
                <tr
                  key={row._id ?? row.id ?? idx}
                  onClick={() => onRowClick?.(row)}
                  className={`flex w-full cursor-pointer hover:bg-(--color-accent-soft) ${
                    typeof rowClass === 'function' ? rowClass(row, idx) : (rowClass ?? '')
                  }`}
                >
                  {columns.map((col) => (
                    <Td
                      key={col.key}
                      className={`flex-1 min-w-0 w-0 ${
                        typeof col.tdClass === "function"
                          ? col.tdClass(row, idx)
                          : (col.tdClass ?? '')
                      }`}
                    >
                      {col.render ? col.render(row, idx) : row[col.key]}
                    </Td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {footerRow && <tfoot className="block">{footerRow}</tfoot>}
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-(--color-text-muted)">
          Showing {sortedRows.length}
          {total !== undefined && total !== sortedRows.length
            ? ` of ${total}`
            : ""}{" "}
          {label}
        </p>
        {pagination && pagination}
      </div>
    </div>
  );
};

export { Th, Td };
export default PageTable;