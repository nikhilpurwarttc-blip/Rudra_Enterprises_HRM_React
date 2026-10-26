import { useMemo, useState } from 'react';
import GlassCard from '../../../components/GlassCard';
export { MonthlyDailyPlantAttendanceChart } from './MonthlyDailyPlantAttendanceChart';

const TONES = {
  accent: {
    badge: 'bg-gradient-to-br from-(--color-accent)/25 via-(--color-accent)/15 to-(--color-accent)/5 text-(--color-accent) ring-1 ring-white/35 dark:ring-white/15 shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1.5px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.3),inset_0_1.5px_1px_rgba(255,255,255,0.2)]',
    bar: 'from-(--color-accent) to-(--color-accent-strong)',
    glow: 'bg-(--color-accent)',
  },
  teal: {
    badge: 'bg-gradient-to-br from-emerald-400/30 via-teal-500/20 to-teal-600/10 text-teal-700 dark:text-teal-300 ring-1 ring-emerald-400/35 dark:ring-emerald-400/20 shadow-[0_4px_14px_rgba(20,184,166,0.15),inset_0_1.5px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_14px_rgba(20,184,166,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.2)]',
    bar: 'from-teal-500 to-emerald-600',
    glow: 'bg-teal-500',
  },
  blue: {
    badge: 'bg-gradient-to-br from-sky-400/30 via-blue-500/20 to-indigo-600/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/35 dark:ring-blue-400/20 shadow-[0_4px_14px_rgba(59,130,246,0.15),inset_0_1.5px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_14px_rgba(59,130,246,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.2)]',
    bar: 'from-blue-500 to-indigo-600',
    glow: 'bg-blue-500',
  },
  amber: {
    badge: 'bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-amber-600/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/35 dark:ring-amber-400/20 shadow-[0_4px_14px_rgba(245,158,11,0.15),inset_0_1.5px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_14px_rgba(245,158,11,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.2)]',
    bar: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-500',
  },
  violet: {
    badge: 'bg-gradient-to-br from-fuchsia-400/30 via-violet-500/20 to-purple-600/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-400/35 dark:ring-violet-400/20 shadow-[0_4px_14px_rgba(139,92,246,0.15),inset_0_1.5px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_14px_rgba(139,92,246,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.2)]',
    bar: 'from-violet-500 to-purple-600',
    glow: 'bg-violet-500',
  },
  rose: {
    badge: 'bg-gradient-to-br from-rose-400/30 via-rose-500/20 to-red-600/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400/35 dark:ring-rose-400/20 shadow-[0_4px_14px_rgba(244,63,94,0.15),inset_0_1.5px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_14px_rgba(244,63,94,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.2)]',
    bar: 'from-rose-500 to-red-600',
    glow: 'bg-rose-500',
  },
};

export const DashboardPanel = ({
  title,
  description,
  action,
  icon: Icon,
  children,
  className = '',
  bodyClassName = '',
}) => (
  <GlassCard
    className={`group relative flex flex-col min-w-0 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 border-t-white/40 dark:border-t-white/20 bg-gradient-to-b from-white/15 via-white/5 to-black/5 dark:from-white/10 dark:via-white/[0.02] dark:to-black/35 backdrop-blur-xl shadow-[0_12px_36px_-6px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.3)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:shadow-[0_18px_42px_-6px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:hover:shadow-[0_26px_55px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] ${className}`}
  >
    {/* 3D Top Specular Highlight Edge */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/30 to-transparent"
    />

    {/* Panel Header */}
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5 sm:py-4 bg-white/10 dark:bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/20 to-white/5 ring-1 ring-inset ring-white/25 shadow-xs">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate uppercase text-xs font-extrabold tracking-wider text-(--color-text)">
            {title}
          </h2>
          {description && (
            <p className="truncate mt-0.5 text-[11px] font-medium text-(--color-text-muted)">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>

    {/* Panel Body */}
    <div className={`p-4 sm:p-5 flex-1 flex flex-col ${bodyClassName}`}>
      {children}
    </div>
  </GlassCard>
);

export const DashboardMetric = ({
  icon: Icon,
  label,
  value,
  detail,
  breakdown,
  tone = 'accent',
}) => {
  const selectedTone = TONES[tone] ?? TONES.accent;

  return (
    <GlassCard className="group relative flex flex-col justify-between min-w-0 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 border-t-white/40 dark:border-t-white/20 bg-gradient-to-b from-white/15 via-white/5 to-black/5 dark:from-white/10 dark:via-white/[0.02] dark:to-black/35 backdrop-blur-xl shadow-[0_10px_28px_-6px_rgba(0,0,0,0.07),inset_0_1px_1px_rgba(255,255,255,0.3)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_42px_-8px_rgba(0,0,0,0.13),inset_0_1px_1.5px_rgba(255,255,255,0.5)] dark:hover:shadow-[0_25px_52px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-white/35 dark:hover:border-white/25 motion-reduce:transform-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/30 to-transparent"
      />

      <div className="flex min-w-0 items-start gap-3.5 p-4 sm:p-5">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none ${selectedTone.badge}`}
        >
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate uppercase text-[11px] font-bold tracking-wider text-(--color-text-muted)">
            {label}
          </p>
          <p
            className="mt-1 truncate text-2xl font-black tracking-tight text-(--color-text) tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:text-3xl"
            title={String(value)}
          >
            {value}
          </p>
          {detail && (
            <p className="mt-1.5 truncate text-xs font-medium text-(--color-text-muted)">
              {detail}
            </p>
          )}
        </div>
      </div>

      {breakdown && (
        <dl className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 bg-black/[0.03] dark:bg-black/25 px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] sm:px-5">
          {breakdown.map((item) => (
            <div key={item.label} className="min-w-0 px-2 first:pl-0 last:pr-0">
              <dt className="truncate uppercase text-[10px] font-bold tracking-wider text-(--color-text-muted)">
                {item.label}
              </dt>
              <dd
                className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-(--color-text)"
                title={String(item.value)}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </GlassCard>
  );
};

export const DashboardStatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'default',
  className = '',
}) => {
  const toneStyle = TONES[tone]?.badge ?? 'bg-white/10 text-(--color-accent) ring-1 ring-white/20';

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/15 dark:border-white/10 border-t-white/30 dark:border-t-white/20 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/[0.05] dark:to-white/[0.01] p-3.5 sm:p-4 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 dark:hover:border-white/20 hover:shadow-md ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent"
      />
      <div className="flex items-center justify-between gap-2.5">
        <p className="truncate uppercase text-[11px] font-bold tracking-wider text-(--color-text-muted)">
          {label}
        </p>
        {Icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneStyle}`}>
            <Icon size={14} aria-hidden="true" />
          </span>
        )}
      </div>
      <p
        className="mt-1.5 truncate text-base font-extrabold tracking-tight text-(--color-text) tabular-nums sm:text-lg"
        title={String(value)}
      >
        {value}
      </p>
      {subtext && (
        <p className="mt-1 truncate text-xs font-medium text-(--color-text-muted)">
          {subtext}
        </p>
      )}
    </div>
  );
};

/* ── 3D Visual Attendance Donut Gauge with Shift Split Capsule ───────────────── */
export const AttendanceDonutChart = ({
  summary = [],
  total = 0,
  rate = 0,
  dayShiftPresent = 0,
  nightShiftPresent = 0,
  formatter = (v) => v,
}) => {
  const [hoveredStatus, setHoveredStatus] = useState(null);

  const colors = {
    present: { stroke: 'url(#donut-grad-teal)', bg: 'bg-teal-500', label: 'Present' },
    absent: { stroke: 'url(#donut-grad-rose)', bg: 'bg-rose-500', label: 'Absent' },
    partial: { stroke: 'url(#donut-grad-amber)', bg: 'bg-amber-500', label: 'Partial' },
    on_leave: { stroke: 'url(#donut-grad-violet)', bg: 'bg-violet-500', label: 'Leave' },
    holiday: { stroke: 'url(#donut-grad-sky)', bg: 'bg-sky-500', label: 'Holiday' },
    weekly_off: { stroke: 'url(#donut-grad-slate)', bg: 'bg-slate-400', label: 'Off' },
  };

  const radius = 68;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~427.26

  const segments = useMemo(() => {
    const active = summary.filter((item) => Number(item.count) > 0);
    return active.reduce(
      (acc, item) => {
        const count = Number(item.count) || 0;
        const segmentLength = total ? (count / total) * circumference : 0;
        const offset = acc.totalOffset;
        return {
          items: [...acc.items, { ...item, count, segmentLength, offset }],
          totalOffset: offset + segmentLength,
        };
      },
      { items: [], totalOffset: 0 }
    ).items;
  }, [summary, total, circumference]);

  return (
    <div className="flex flex-col items-center justify-between gap-4">
      {/* 3D Circular SVG Donut */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 180 180"
          className="h-44 w-44 drop-shadow-[0_10px_20px_rgba(0,0,0,0.12)] transition-transform duration-300"
        >
          <defs>
            <linearGradient id="donut-grad-teal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="donut-grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="donut-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="donut-grad-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="donut-grad-sky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="donut-grad-slate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>

          {/* Recessed Ambient Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-black/10 dark:text-white/5"
          />

          {/* Segment Arcs */}
          {segments.map((item) => {
            const isHovered = hoveredStatus === item.status;

            return (
              <circle
                key={item.status}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={colors[item.status]?.stroke ?? '#14b8a6'}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${Math.max(item.segmentLength - 2, 0.5)} ${circumference}`}
                strokeDashoffset={-item.offset}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
                className="cursor-pointer transition-all duration-300 ease-out"
                onMouseEnter={() => setHoveredStatus(item.status)}
                onMouseLeave={() => setHoveredStatus(null)}
              />
            );
          })}
        </svg>

        {/* Center 3D Readout */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black tracking-tight text-(--color-text) drop-shadow-sm">
            {rate}%
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-(--color-text-muted)">
            Present Rate
          </span>
          {hoveredStatus && (
            <span className="mt-1 rounded-md bg-(--color-accent) px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
              {colors[hoveredStatus]?.label}
            </span>
          )}
        </div>
      </div>

      {/* Status Legend Pills */}
      <div className="grid w-full grid-cols-3 gap-2 border-t border-white/10 pt-3">
        {summary.map((item) => {
          const cfg = colors[item.status] ?? { bg: 'bg-zinc-400', label: item.label };
          const count = Number(item.count) || 0;
          return (
            <div
              key={item.status}
              onMouseEnter={() => setHoveredStatus(item.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              className="group/item flex flex-col items-center justify-center rounded-xl p-1.5 transition-all hover:bg-white/10 dark:hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${cfg.bg} shadow-xs`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted)">
                  {cfg.label}
                </span>
              </div>
              <span className="mt-0.5 text-xs font-black tabular-nums text-(--color-text)">
                {formatter(count)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Day vs Night Operational Split Capsule */}
      {(dayShiftPresent > 0 || nightShiftPresent > 0) && (
        <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 dark:border-white/10 bg-black/[0.03] dark:bg-black/30 p-2 text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs">
              ☀️
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase text-(--color-text-muted)">Day shift</p>
              <p className="font-extrabold text-(--color-text)">{formatter(dayShiftPresent)}</p>
            </div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs">
              🌙
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase text-(--color-text-muted)">Night shift</p>
              <p className="font-extrabold text-(--color-text)">{formatter(nightShiftPresent)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── 3D Per-Day Plant Attendance Visualizer (Pillars & Cards) ───────────────── */
export const DailyPlantAttendanceVisualizer = ({
  plants = [],
  formatter = (v) => v,
}) => {
  const [viewMode, setViewMode] = useState('columns'); // 'columns' | 'cards'
  const [activePlantId, setActivePlantId] = useState(null);

  if (!plants.length) {
    return <DashboardEmpty message="No plant attendance recorded for this day." />;
  }

  const maxTotal = Math.max(1, ...plants.map((p) => Number(p.total) || Number(p.present) || 1));

  return (
    <div className="space-y-4">
      {/* View Switcher Controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-text-muted)">
            Comparing {plants.length} Operating Plant{plants.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="inline-flex rounded-xl border border-white/15 dark:border-white/10 bg-black/[0.04] dark:bg-black/40 p-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('columns')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              viewMode === 'columns'
                ? 'bg-white/20 dark:bg-white/15 text-(--color-text) shadow-sm'
                : 'text-(--color-text-muted) hover:text-(--color-text)'
            }`}
          >
            3D Pillars
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              viewMode === 'cards'
                ? 'bg-white/20 dark:bg-white/15 text-(--color-text) shadow-sm'
                : 'text-(--color-text-muted) hover:text-(--color-text)'
            }`}
          >
            Plant Cards
          </button>
        </div>
      </div>

      {viewMode === 'columns' ? (
        /* 3D Extruded Pillars View */
        <div className="relative">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 items-end pt-4 pb-2">
            {plants.map((plant) => {
              const present = Number(plant.present) || 0;
              const absent = Number(plant.absent) || 0;
              const partial = Number(plant.partial) || 0;
              const pending = Number(plant.pending_verification) || 0;
              const total = Number(plant.total) || (present + absent + partial);
              const rate = total ? Math.round((present / total) * 100) : 0;
              const heightPct = Math.max(15, Math.min(100, (total / maxTotal) * 100));
              const isHovered = activePlantId === plant.plant_id;

              return (
                <div
                  key={plant.plant_id}
                  onMouseEnter={() => setActivePlantId(plant.plant_id)}
                  onMouseLeave={() => setActivePlantId(null)}
                  className="group/pillar relative flex flex-col items-center cursor-pointer"
                >
                  {/* Floating Tooltip On Hover */}
                  {isHovered && (
                    <div className="absolute -top-20 z-20 w-44 rounded-xl border border-white/20 dark:border-white/15 bg-black/85 p-2.5 text-xs text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 pointer-events-none">
                      <p className="font-extrabold truncate text-teal-300">{plant.plant_name}</p>
                      <div className="mt-1 flex justify-between text-[11px]">
                        <span>Present:</span>
                        <span className="font-bold">{formatter(present)} ({rate}%)</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-rose-300">
                        <span>Absent:</span>
                        <span className="font-bold">{formatter(absent)}</span>
                      </div>
                      {plant.ot_hours > 0 && (
                        <div className="flex justify-between text-[11px] text-amber-300 border-t border-white/10 mt-1 pt-1">
                          <span>OT Logged:</span>
                          <span className="font-bold">{formatter(plant.ot_hours)} hrs</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Present Rate Pill */}
                  <span className="mb-2 text-[10px] font-black tracking-tight text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/25 px-1.5 py-0.5 rounded-md shadow-xs">
                    {rate}%
                  </span>

                  {/* 3D Segmented Cylinder Column */}
                  <div
                    className="relative w-12 sm:w-14 overflow-hidden rounded-2xl bg-black/10 dark:bg-black/50 p-1 shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-white/15 transition-all duration-300 group-hover/pillar:-translate-y-1 group-hover/pillar:shadow-[0_12px_24px_rgba(0,0,0,0.2)]"
                    style={{ height: `${Math.max(110, heightPct * 1.5)}px` }}
                  >
                    <div className="flex flex-col-reverse h-full w-full rounded-xl overflow-hidden">
                      {/* Present Block */}
                      {present > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 relative shadow-inner"
                          style={{ height: `${(present / total) * 100}%` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1 bg-white/40" />
                        </div>
                      )}
                      {/* Partial Block */}
                      {partial > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-amber-600 to-orange-400 relative"
                          style={{ height: `${(partial / total) * 100}%` }}
                        />
                      )}
                      {/* Pending Verification Block */}
                      {pending > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-yellow-500 to-amber-300 relative"
                          style={{ height: `${(pending / total) * 100}%` }}
                        />
                      )}
                      {/* Absent Block */}
                      {absent > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-red-600 to-rose-400 relative"
                          style={{ height: `${(absent / total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Plant Label & Present Count */}
                  <p className="mt-2 w-full truncate text-center text-xs font-bold text-(--color-text)" title={plant.plant_name}>
                    {plant.plant_name}
                  </p>
                  <p className="text-[11px] font-semibold text-(--color-text-muted)">
                    {formatter(present)} / {formatter(total)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick Legend Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-3 text-[11px] font-bold text-(--color-text-muted)">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-500 shadow-xs" /> Present</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs" /> Partial</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs" /> Absent</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-xs" /> Verification Queue</span>
          </div>
        </div>
      ) : (
        /* Plant Performance Detail Cards View */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => {
            const present = Number(plant.present) || 0;
            const absent = Number(plant.absent) || 0;
            const partial = Number(plant.partial) || 0;
            const total = Number(plant.total) || (present + absent + partial);
            const rate = total ? Math.round((present / total) * 100) : 0;

            return (
              <div
                key={plant.plant_id}
                className="group relative overflow-hidden rounded-2xl border border-white/15 dark:border-white/10 border-t-white/30 dark:border-t-white/20 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/[0.04] dark:to-white/[0.01] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-bold text-sm text-(--color-text)" title={plant.plant_name}>
                    {plant.plant_name}
                  </h3>
                  <span className="shrink-0 rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-black text-teal-700 dark:text-teal-300">
                    {rate}%
                  </span>
                </div>

                {/* 3D Segmented Cylindrical Bar */}
                <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-black/50 p-0.5 shadow-inner ring-1 ring-white/15">
                  <div className="flex h-full w-full rounded-full overflow-hidden">
                    <div style={{ width: `${(present / total) * 100}%` }} className="bg-gradient-to-r from-teal-500 to-emerald-400" />
                    <div style={{ width: `${(partial / total) * 100}%` }} className="bg-gradient-to-r from-amber-500 to-orange-400" />
                    <div style={{ width: `${(absent / total) * 100}%` }} className="bg-gradient-to-r from-rose-500 to-red-400" />
                  </div>
                </div>

                {/* Metric Readouts */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs border-t border-white/10 pt-2.5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-(--color-text-muted)">Present</span>
                    <span className="font-extrabold text-teal-700 dark:text-teal-300">{formatter(present)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-(--color-text-muted)">Absent</span>
                    <span className="font-extrabold text-rose-700 dark:text-rose-300">{formatter(absent)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-(--color-text-muted)">OT Hours</span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-300">{formatter(plant.ot_hours ?? 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DashboardSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading dashboard overview">
    <span className="sr-only">Loading dashboard overview...</span>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] p-4 shadow-lg backdrop-blur-xl motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-black/15 dark:bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded-md bg-black/15 dark:bg-white/10" />
              <div className="h-5 w-24 rounded-md bg-black/15 dark:bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-6">
      <div className="h-64 animate-pulse rounded-2xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl xl:col-span-4 motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-2xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl xl:col-span-2 motion-reduce:animate-none" />
    </div>
  </div>
);

export const DashboardEmpty = ({ message = 'There is no activity for this period yet.' }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.01] px-6 py-10 text-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
    <p className="text-sm font-medium text-(--color-text-muted)">{message}</p>
  </div>
);

export const DashboardBarList = ({
  items,
  valueKey = 'count',
  labelKey = 'label',
  formatter = (value) => value,
  tone = 'accent',
}) => {
  const maxValue = Math.max(0, ...items.map((item) => Number(item[valueKey]) || 0));

  if (!items.length || maxValue === 0) return <DashboardEmpty />;

  return (
    <ul className="space-y-3.5">
      {items.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const percentage = maxValue ? Math.max((value / maxValue) * 100, value > 0 ? 3 : 0) : 0;

        return (
          <li
            key={item.id ?? item[labelKey] ?? index}
            className="group/bar -mx-2.5 rounded-xl p-2 transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/[0.03]"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold text-(--color-text)">{item[labelKey]}</span>
              <span className="shrink-0 tabular-nums font-semibold text-(--color-text-muted)">
                {formatter(value)}
              </span>
            </div>
            <div
              className="relative h-3 overflow-hidden rounded-full bg-black/10 dark:bg-black/50 p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/15 dark:ring-white/10"
              aria-hidden="true"
            >
              <div
                className={`relative h-full rounded-full bg-gradient-to-r ${TONES[tone]?.bar ?? TONES.accent.bar} shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-[width] duration-700 ease-out motion-reduce:transition-none`}
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-white/40" />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
