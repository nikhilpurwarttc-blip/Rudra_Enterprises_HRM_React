import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const SectionCard = ({
  title,
  children,
  left,
  action,
  onRefresh,
  Open = false,
  sectionClass = '',
  scroll = false
}) => {
  const [spinning, setSpinning] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [open] = useState(Open);

  const handleRefresh = async () => {
    if (spinning) return;

    setSpinning(true);

    try {
      await onRefresh?.();
    } finally {
      setSpinning(false);
    }
  };

  const sectionCollapse = () => {
    setCollapsed(prev => !prev);
  };

  return (
    <div
      className={twMerge(
        'glass-card py-4 min-h-0 rounded-xl print:bg-transparent print:border-0 print:shadow-none print:rounded-none ',
        scroll && 'flex flex-col flex-1 overflow-hidden',
        sectionClass
      )}
    >
      {(title || left || action || onRefresh) && (
        <div
          className={`flex items-center justify-between pr-4 ${
            collapsed ? 'mb-4' : ''
          }`}
        >
          {title && (
            <h3 className="inline-block rounded-r-full bg-[var(--color-accent)] px-3 py-1 text-base font-semibold text-white">
              {title}
            </h3>
          )}

          {left}

          <div className="relative flex items-center gap-2">
            {action}

            {open && (
              <button
                title="collapse"
                onClick={sectionCollapse}
                className="rounded-full border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
              >
                <ChevronDown
                  size={14}
                  className={collapsed ? 'rotate-180' : 'rotate-360'}
                />
              </button>
            )}

            {onRefresh && (
              <button
                title="Refresh"
                onClick={handleRefresh}
                disabled={spinning}
                className="rounded-full border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={spinning ? 'animate-spin' : ''}
                />
              </button>
            )}
          </div>
        </div>
      )}

      {collapsed && (
        <div
          className={`px-2 ${
            scroll ? 'overflow-y-auto flex-1 min-h-0' : ''
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionCard;