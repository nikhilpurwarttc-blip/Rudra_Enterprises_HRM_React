import GlassCard from '../../../components/GlassCard';

export const DashboardPanel = ({ title, description, action, children, className = '' }) => (
  <GlassCard className={`min-w-0 bg-gradient-to-b from-white/10 to-black/5 dark:from-white/5 dark:to-black/20 shadow-xl shadow-black/5 backdrop-blur-xl border border-white/20 dark:border-white/10 ${className}`}>
    <div className={`px-4 py-3 sm:px-5 sm:py-4 rounded-t-2xl flex items-start justify-between gap-3 border-b border-white/10 bg-white/5 dark:bg-white/[0.02] ${className ? 'm-4 sm:m-5' : ''}`}>
      <div>
        <h2 className="uppercase text-sm font-semibold tracking-wide text-(--color-text)">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-(--color-text-muted)">{description}</p>}
      </div>
      {action}
    </div>
    <div className="p-4 sm:p-5">
      {children}
    </div>
  </GlassCard>
);

export const DashboardMetric = ({ icon: Icon, label, value, detail, breakdown, tone = 'accent' }) => {
  const tones = {
    accent: 'bg-gradient-to-br from-(--color-accent)/20 to-(--color-accent)/10 text-(--color-accent) shadow-sm shadow-(--color-accent)/20',
    teal: 'bg-gradient-to-br from-teal-500/20 to-teal-500/10 text-teal-700 dark:text-teal-300 shadow-sm shadow-teal-500/10',
    blue: 'bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-500/10',
    amber: 'bg-gradient-to-br from-amber-500/20 to-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-500/10',
    violet: 'bg-gradient-to-br from-violet-500/20 to-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm shadow-violet-500/10',
  };

  if (breakdown) {
    return (
      <GlassCard className="group min-w-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 hover:border-(--color-border-strong) bg-gradient-to-b from-white/10 to-black/5 dark:from-white/5 dark:to-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 motion-reduce:transform-none">
        <div className="flex min-w-0 items-center gap-3.5 p-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/20 ${tones[tone] ?? tones.accent}`}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="uppercase truncate text-xs font-medium text-(--color-text-muted)">{label}</p>
            <p className="mt-0.5 truncate text-2xl font-extrabold tracking-tight text-(--color-text)" title={String(value)}>
              {value}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-(--color-border) border-t border-(--color-border) px-4 py-3 bg-black/[0.02] dark:bg-white/[0.01]">
          {breakdown.map((item) => (
            <div key={item.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
              <dt className="uppercase truncate text-[11px] font-medium text-(--color-text-muted)">{item.label}</dt>
              <dd className="mt-1 truncate text-sm font-bold tabular-nums text-(--color-text)" title={String(item.value)}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="group flex min-w-0 items-start gap-3.5 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 hover:border-(--color-border-strong) bg-gradient-to-b from-white/10 to-black/5 dark:from-white/5 dark:to-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 motion-reduce:transform-none">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/20 ${tones[tone] ?? tones.accent}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="uppercase truncate text-xs font-medium text-(--color-text-muted)">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-extrabold tracking-tight text-(--color-text)" title={String(value)}>
          {value}
        </p>
        {detail && <p className="mt-1 truncate text-xs font-medium text-(--color-text-muted)">{detail}</p>}
      </div>
    </GlassCard>
  );
};

export const DashboardSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading dashboard overview">
    <span className="sr-only">Loading dashboard overview...</span>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass-card h-28 animate-pulse bg-white/5 p-4 rounded-2xl border border-white/10 motion-reduce:animate-none shadow-lg">
          <div className="h-3 w-24 rounded-md bg-(--color-accent-soft)" />
          <div className="mt-5 h-7 w-32 rounded-md bg-(--color-accent-soft)" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass-card h-64 animate-pulse bg-white/5 p-5 rounded-2xl border border-white/10 motion-reduce:animate-none shadow-lg">
          <div className="h-4 w-36 rounded-md bg-(--color-accent-soft)" />
          <div className="mt-8 space-y-4">
            <div className="h-3 w-full rounded-md bg-(--color-accent-soft)" />
            <div className="h-3 w-4/5 rounded-md bg-(--color-accent-soft)" />
            <div className="h-3 w-3/5 rounded-md bg-(--color-accent-soft)" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashboardEmpty = ({ message = 'There is no activity for this period yet.' }) => (
  <p className="rounded-2xl border border-dashed border-(--color-border-strong) bg-black/[0.02] dark:bg-white/[0.01] px-6 py-10 text-center text-sm font-medium text-(--color-text-muted)">
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
          <li key={item.id ?? item[labelKey] ?? index} className="group/bar">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-semibold text-(--color-text)">{item[labelKey]}</span>
              <span className="shrink-0 tabular-nums font-medium text-(--color-text-muted)">{formatter(value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 p-[1px] ring-1 ring-inset ring-white/10" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-(--color-accent) to-(--color-accent)/80 shadow-sm shadow-(--color-accent)/30 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};