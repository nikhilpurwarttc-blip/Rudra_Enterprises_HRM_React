import GlassCard from '../../../components/GlassCard';

export const DashboardPanel = ({ title, description, action, children, className = '' }) => (
  <GlassCard className={`min-w-0 p-4 sm:p-5 ${className}`}>
    <div className={`mb-4 flex items-start justify-between gap-3 ${className ? 'm-4 sm:m-5' : ''} `}>
      <div>
        <h2 className="text-sm font-bold text-(--color-text)">{title}</h2>
        {description && <p className="mt-1 text-xs text-(--color-text-muted)">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </GlassCard>
);

export const DashboardMetric = ({ icon: Icon, label, value, detail, breakdown, tone = 'accent' }) => {
  const tones = {
    accent: 'bg-(--color-accent-soft) text-(--color-accent)',
    teal: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  };

  if (breakdown) {
    return (
      <GlassCard className="group min-w-0 transition duration-200 hover:-translate-y-0.5 hover:border-(--color-border-strong) motion-reduce:transform-none">
        <div className="flex min-w-0 items-center gap-3 p-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] ?? tones.accent}`}>
            <Icon size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-(--color-text-muted)">{label}</p>
            <p className="mt-1 truncate text-xl font-bold tracking-tight text-(--color-text)" title={String(value)}>
              {value}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-(--color-border) border-t border-(--color-border) px-4">
          {breakdown.map((item) => (
            <div key={item.label} className="min-w-0 py-1 px-2 pb-2 first:pl-0 last:pr-0">
              <dt className="truncate text-[11px] text-(--color-text-muted)">{item.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-(--color-text)" title={String(item.value)}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="group flex min-w-0 items-start gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-(--color-border-strong) motion-reduce:transform-none">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] ?? tones.accent}`}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-(--color-text-muted)">{label}</p>
        <p className="mt-1 truncate text-xl font-bold tracking-tight text-(--color-text)" title={String(value)}>
          {value}
        </p>
        {detail && <p className="mt-1 truncate text-xs text-(--color-text-muted)">{detail}</p>}
      </div>
    </GlassCard>
  );
};

export const DashboardSkeleton = () => (
  <div className="space-y-5" role="status" aria-label="Loading dashboard overview">
    <span className="sr-only">Loading dashboard overview...</span>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass-card h-24 animate-pulse bg-(--color-surface) p-4 motion-reduce:animate-none">
          <div className="h-3 w-24 rounded bg-(--color-accent-soft)" />
          <div className="mt-4 h-6 w-32 rounded bg-(--color-accent-soft)" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass-card h-64 animate-pulse bg-(--color-surface) p-5 motion-reduce:animate-none">
          <div className="h-4 w-36 rounded bg-(--color-accent-soft)" />
          <div className="mt-7 space-y-4">
            <div className="h-3 w-full rounded bg-(--color-accent-soft)" />
            <div className="h-3 w-4/5 rounded bg-(--color-accent-soft)" />
            <div className="h-3 w-3/5 rounded bg-(--color-accent-soft)" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashboardEmpty = ({ message = 'There is no activity for this period yet.' }) => (
  <p className="rounded-xl border border-dashed border-(--color-border-strong) px-4 py-8 text-center text-sm text-(--color-text-muted)">
    {message}
  </p>
);

export const DashboardBarList = ({ items, valueKey = 'count', labelKey = 'label', formatter = (value) => value }) => {
  const maxValue = Math.max(0, ...items.map((item) => Number(item[valueKey]) || 0));

  if (!items.length || maxValue === 0) return <DashboardEmpty />;

  return (
    <ul className="space-y-4">
      {items.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const percentage = maxValue ? Math.max((value / maxValue) * 100, value > 0 ? 3 : 0) : 0;

        return (
          <li key={item.id ?? item[labelKey] ?? index}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-(--color-text)">{item[labelKey]}</span>
              <span className="shrink-0 tabular-nums text-(--color-text-muted)">{formatter(value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-(--color-accent-soft)" aria-hidden="true">
              <div
                className="h-full rounded-full bg-(--color-accent) transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
