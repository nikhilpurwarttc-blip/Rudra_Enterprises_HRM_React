import { MoveLeft } from 'lucide-react';

const Pagination = ({ page, lastPage, onPageChange }) => {
  if (lastPage <= 1) return null;

  const getPages = () => {
    if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1);
    const pages = [];
    pages.push(1, 2);
    if (page > 4) pages.push('...');
    for (let i = Math.max(3, page - 1); i <= Math.min(lastPage - 2, page + 1); i++) pages.push(i);
    if (page < lastPage - 3) pages.push('...');
    pages.push(lastPage - 1, lastPage);
    return [...new Set(pages)];
  };

  return (
    <div className="flex items-center justify-center gap-2 text-(--color-text)">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="flex items-center gap-1.5 rounded-lg border border-(--color-border-strong) px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-(--color-accent-soft)">
        <MoveLeft size={16} className='h-5'/>
        <p className="hidden md:flex ">Previous</p>
      </button>
      {getPages().map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} className="px-2 text-(--color-text-muted)">...</span>
          : <button key={p} onClick={() => onPageChange(p)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                p === page
                  ? 'border-(--color-accent) bg-(--color-accent) text-white'
                  : 'border-(--color-border-strong) hover:bg-(--color-accent-soft)'
              }`}>
              {p}
            </button>
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === lastPage}
        className="flex items-center gap-1.5 rounded-lg border border-(--color-border-strong) px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-(--color-accent-soft)">
        <p className="hidden md:flex">Next</p>
        <MoveLeft size={16} className="rotate-180 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
