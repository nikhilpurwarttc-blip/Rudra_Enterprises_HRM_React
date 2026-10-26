import { useCallback, useId, useMemo, useState } from 'react';
import GlassCard from '../../../components/GlassCard';
import { Calendar, TrendingUp } from 'lucide-react';

const PLANT_COLORS = [
  { stroke: '#14b8a6', bg: 'bg-teal-500' },
  { stroke: '#3b82f6', bg: 'bg-blue-500' },
  { stroke: '#f59e0b', bg: 'bg-amber-500' },
  { stroke: '#8b5cf6', bg: 'bg-violet-500' },
  { stroke: '#f43f5e', bg: 'bg-rose-500' },
  { stroke: '#06b6d4', bg: 'bg-cyan-500' },
];

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDayLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return Number(parts[2]) || parts[2];
};

const getLocalHourBucket = (dateStr, hourValue) => {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? ''));
  const hour = Number(hourValue);
  if (!dateParts || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return `${dateStr}T${String(hourValue).padStart(2, '0')}`;
  }

  const utcDate = new Date(Date.UTC(
    Number(dateParts[1]),
    Number(dateParts[2]) - 1,
    Number(dateParts[3]),
    hour
  ));
  const localDate = [
    utcDate.getFullYear(),
    String(utcDate.getMonth() + 1).padStart(2, '0'),
    String(utcDate.getDate()).padStart(2, '0'),
  ].join('-');
  return `${localDate}T${String(utcDate.getHours()).padStart(2, '0')}`;
};

export const MonthlyDailyPlantAttendanceChart = ({
  dailyPlantWise = [],
  hourlyPlantWise = [],
  period = 'month',
  todayDate,
  selectedMonth,
  financialYear,
  startDate,
  endDate,
  plantIds = [],
  formatter = (v) => v,
}) => {
  const [hoveredDateIndex, setHoveredDateIndex] = useState(null);
  const chartId = useId().replace(/:/g, '');

  // 1. Extract unique plants from data
  const filteredDailyPlantWise = useMemo(() => {
    if (!plantIds.length) return dailyPlantWise;
    const selectedIds = new Set(plantIds.map(String));
    return dailyPlantWise.filter((item) => selectedIds.has(String(item.plant_id)));
  }, [dailyPlantWise, plantIds]);
  const filteredHourlyPlantWise = useMemo(() => {
    if (!plantIds.length) return hourlyPlantWise;
    const selectedIds = new Set(plantIds.map(String));
    return hourlyPlantWise.filter((item) => selectedIds.has(String(item.plant_id)));
  }, [hourlyPlantWise, plantIds]);

  const plants = useMemo(() => {
    const plantMap = new Map();
    filteredDailyPlantWise.forEach((item) => {
      if (item.plant_id && !plantMap.has(item.plant_id)) {
        plantMap.set(item.plant_id, {
          plant_id: item.plant_id,
          plant_name: item.plant_name || `Plant ${item.plant_id}`,
        });
      }
    });
    return Array.from(plantMap.values());
  }, [filteredDailyPlantWise]);
  const selectedPlantColor = PLANT_COLORS[0];

  // 2. Build chart buckets from the active dashboard period.
  const chartBuckets = useMemo(() => {
    const today = new Date();
    const toDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    let granularity = 'day';
    let rangeStart;
    let rangeEnd;

    if (period === 'today') {
      rangeStart = /^\d{4}-\d{2}-\d{2}$/.test(todayDate || '')
        ? todayDate
        : toDateString(today);
      rangeEnd = rangeStart;
      granularity = 'hour';
    } else if (period === 'custom' && startDate && endDate && startDate <= endDate) {
      rangeStart = startDate;
      rangeEnd = endDate;
      const rangeLength = Math.round(
        (new Date(`${rangeEnd}T00:00:00`) - new Date(`${rangeStart}T00:00:00`)) / 86400000
      ) + 1;
      granularity = rangeLength > 31 ? 'month' : 'day';
    } else if (period === 'financial_year' && /^\d{4}-\d{2}$/.test(financialYear || '')) {
      const startYear = Number(financialYear.slice(0, 4));
      rangeStart = `${startYear}-04-01`;
      rangeEnd = `${startYear + 1}-03-31`;
      granularity = 'month';
    } else {
      const [year, month] = /^\d{4}-\d{2}$/.test(selectedMonth || '')
        ? selectedMonth.split('-').map(Number)
        : [today.getFullYear(), today.getMonth() + 1];
      rangeStart = `${year}-${String(month).padStart(2, '0')}-01`;
      rangeEnd = toDateString(new Date(year, month, 0));
    }

    const dates = [];
    const cursor = new Date(`${rangeStart}T00:00:00`);
    const lastDate = new Date(`${rangeEnd}T00:00:00`);
    while (cursor <= lastDate) {
      dates.push(toDateString(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (granularity === 'hour') {
      return {
        granularity,
        buckets: Array.from({ length: 24 }, (_, hour) => ({
          key: `${rangeStart}T${String(hour).padStart(2, '0')}`,
          date: rangeStart,
          hour,
          label: new Date(2000, 0, 1, hour).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            hour12: true,
          }),
        })),
      };
    }

    if (granularity === 'month') {
      const monthKeys = [...new Set(dates.map((date) => date.slice(0, 7)))];
      return {
        granularity,
        buckets: monthKeys.map((monthKey) => {
          const [year, month] = monthKey.split('-').map(Number);
          return {
            key: monthKey,
            date: `${monthKey}-01`,
            label: new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            }),
          };
        }),
      };
    }

    return {
      granularity,
      buckets: dates.map((date) => ({
        key: date,
        date,
        label: formatDayLabel(date),
      })),
    };
  }, [period, todayDate, selectedMonth, financialYear, startDate, endDate]);

  // 3. Index daily and hourly records by time bucket and plant.
  const bucketMap = useMemo(() => {
    const map = new Map();
    const rows = chartBuckets.granularity === 'hour' ? filteredHourlyPlantWise : filteredDailyPlantWise;
    rows.forEach((item) => {
      const bucketKey = chartBuckets.granularity === 'hour'
        ? getLocalHourBucket(item.date, item.hour)
        : chartBuckets.granularity === 'month'
          ? item.date.slice(0, 7)
          : item.date;
      if (!map.has(bucketKey)) map.set(bucketKey, new Map());
      const plantsForBucket = map.get(bucketKey);
      const current = plantsForBucket.get(item.plant_id) || {
        present: 0,
        absent: 0,
        ot_hours: 0,
      };
      current.present += Number(item.present) || 0;
      current.absent += Number(item.absent) || 0;
      current.ot_hours += Number(item.ot_hours) || 0;
      plantsForBucket.set(item.plant_id, current);
    });
    return map;
  }, [chartBuckets.granularity, filteredDailyPlantWise, filteredHourlyPlantWise]);

  // 4. Build the selected period's chart series.
  const dailySeries = useMemo(() => {
    return chartBuckets.buckets.map((bucket) => {
      const plantEntries = bucketMap.get(bucket.key) || new Map();
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalOT = 0;
      const plantBreakdown = [];

      plants.forEach((plant, idx) => {
        const entry = plantEntries.get(plant.plant_id);
        const present = entry ? Number(entry.present) || 0 : 0;
        const absent = entry ? Number(entry.absent) || 0 : 0;
        const ot = entry ? Number(entry.ot_hours) || 0 : 0;

        totalPresent += present;
        totalAbsent += absent;
        totalOT += ot;

        plantBreakdown.push({
          plant_id: plant.plant_id,
          plant_name: plant.plant_name,
          present,
          absent,
          ot_hours: ot,
          color: PLANT_COLORS[idx % PLANT_COLORS.length],
        });
      });

      return {
        ...bucket,
        totalPresent,
        totalAbsent,
        totalOT,
        displayCount: totalPresent,
        hasData: plantEntries.size > 0,
        plants: plantBreakdown,
      };
    });
  }, [chartBuckets, bucketMap, plants]);

  // Max value for Y-axis scale
  const maxCount = useMemo(() => {
    const counts = dailySeries.map((d) => d.displayCount);
    const max = Math.max(10, ...counts);
    // Round up to nice number
    return Math.ceil(max / 10) * 10;
  }, [dailySeries]);

  // SVG Dimension Constants
  const svgWidth = 900;
  const svgHeight = 190;
  const padLeft = 40;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 30;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Coordinate computation
  const getX = useCallback(
    (index) => padLeft + (index / Math.max(1, dailySeries.length - 1)) * plotWidth,
    [dailySeries.length, plotWidth]
  );

  const getY = useCallback(
    (count) => padTop + plotHeight - (count / maxCount) * plotHeight,
    [maxCount, plotHeight]
  );

  const hoveredDay = hoveredDateIndex === null ? null : dailySeries[hoveredDateIndex];
  const hoveredX = hoveredDateIndex === null ? null : getX(hoveredDateIndex);
  const hoveredY = hoveredDay ? getY(hoveredDay.displayCount) : null;
  const latestDataIndex = dailySeries.reduce(
    (latestIndex, day, index) => (day.hasData ? index : latestIndex),
    -1
  );
  const chartTitle = chartBuckets.granularity === 'hour'
    ? 'Hourly Plant Attendance'
    : chartBuckets.granularity === 'month'
      ? 'Monthly Plant Attendance Trend'
      : 'Daily Plant Attendance Trend';
  const chartUnit = chartBuckets.granularity === 'hour'
    ? 'hour'
    : chartBuckets.granularity === 'month'
      ? 'month'
      : 'day';
  const now = new Date();
  const currentDate = period === 'today' && /^\d{4}-\d{2}-\d{2}$/.test(todayDate || '')
    ? todayDate
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonth = currentDate.slice(0, 7);
  const currentHour = now.getHours();
  const handlePathHover = (event) => {
    const bounds = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * svgWidth;
    const index = Math.round(
      ((svgX - padLeft) / plotWidth) * Math.max(1, dailySeries.length - 1)
    );
    setHoveredDateIndex(Math.max(0, Math.min(dailySeries.length - 1, index)));
  };

  // Build SVG Path string
  const pathD = useMemo(() => {
    if (dailySeries.length === 0) return '';
    return dailySeries.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.displayCount);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [dailySeries, getX, getY]);

  const areaD = useMemo(() => {
    if (!pathD || dailySeries.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(dailySeries.length - 1);
    const bottomY = padTop + plotHeight;
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, dailySeries.length, getX, plotHeight]);

  return (
    <GlassCard className="relative isolate overflow-hidden rounded-2xl border border-teal-900/10 bg-white/75 shadow-[0_18px_44px_-30px_rgba(13,148,136,0.55)] backdrop-blur-xl dark:border-teal-100/10 dark:bg-white/2">
      <div className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-3 border-b border-(--color-border)/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/15 to-cyan-500/5 text-teal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_5px_14px_rgba(13,148,136,0.1)] dark:text-teal-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_5px_14px_rgba(13,148,136,0.12)]">
            <TrendingUp size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-teal-700/75 dark:text-teal-300/75">
              Workforce analytics
            </p>
            <h2 className="text-sm font-bold leading-tight text-(--color-text) sm:text-base">
              {chartTitle}
            </h2>
            <p className="mt-1 text-[11px] leading-tight text-(--color-text-muted)">
              Present headcount by {chartUnit}
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-(--color-border) bg-white/55 px-3 py-1.5 text-[10px] font-semibold text-(--color-text-muted) shadow-sm dark:bg-white/[0.04]">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.7)]" />
          {plants.length} {plants.length === 1 ? 'plant' : 'plants'}
          {plantIds.length > 0 ? ' · dashboard filter' : ''}
        </div>
      </div>

      <div className="relative px-2.5 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="attendance-chart-stage relative w-full" onMouseLeave={() => setHoveredDateIndex(null)}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="attendance-chart-canvas h-auto w-full select-none"
            role="img"
            aria-label={`${chartTitle}, present headcount by ${chartUnit}`}
          >
            <defs>
              <linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={selectedPlantColor.stroke} stopOpacity="0.28" />
                <stop offset="55%" stopColor={selectedPlantColor.stroke} stopOpacity="0.1" />
                <stop offset="100%" stopColor={selectedPlantColor.stroke} stopOpacity="0.015" />
              </linearGradient>
              <linearGradient id={`${chartId}-depth`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.04" />
              </linearGradient>
              <filter id={`${chartId}-glow`} x="-30%" y="-60%" width="160%" height="220%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id={`${chartId}-line`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="55%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = padTop + plotHeight * (1 - pct);
              const labelVal = Math.round(maxCount * pct);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={yVal}
                    x2={padLeft + plotWidth}
                    y2={yVal}
                    stroke="currentColor"
                    strokeDasharray="2 5"
                    className="text-black/[0.08] dark:text-white/[0.08]"
                  />
                  <text
                    x={padLeft - 8}
                    y={yVal + 3}
                    textAnchor="end"
                    className="fill-current text-[9px] font-medium text-(--color-text-muted)"
                  >
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {areaD && (
              <>
                <path
                  d={areaD}
                  transform="translate(0 5)"
                  fill={`url(#${chartId}-depth)`}
                  className="attendance-chart-depth"
                />
                <path
                  d={areaD}
                  fill={`url(#${chartId}-area)`}
                  className="attendance-chart-area"
                />
              </>
            )}

            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={`url(#${chartId}-line)`}
                strokeWidth="3.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${chartId}-glow)`}
                className="attendance-chart-line"
              />
            )}

            {latestDataIndex >= 0 && (
              <g aria-hidden="true">
                <circle
                  cx={getX(latestDataIndex)}
                  cy={getY(dailySeries[latestDataIndex].displayCount)}
                  r="8"
                  fill={selectedPlantColor.stroke}
                  className="attendance-chart-pulse"
                />
                <circle
                  cx={getX(latestDataIndex)}
                  cy={getY(dailySeries[latestDataIndex].displayCount)}
                  r="3.5"
                  fill="#ffffff"
                  stroke={selectedPlantColor.stroke}
                  strokeWidth="2.5"
                />
              </g>
            )}

            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="stroke"
                onMouseEnter={handlePathHover}
                onMouseMove={handlePathHover}
              />
            )}

            {hoveredDay && hoveredX !== null && hoveredY !== null && (
              <g>
                <line
                  x1={hoveredX}
                  y1={padTop}
                  x2={hoveredX}
                  y2={padTop + plotHeight}
                  stroke={selectedPlantColor.stroke}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  className="opacity-60"
                />
                <circle
                  cx={hoveredX}
                  cy={hoveredY}
                  r="7"
                  fill={selectedPlantColor.stroke}
                  fillOpacity="0.15"
                />
                <circle
                  cx={hoveredX}
                  cy={hoveredY}
                  r="4"
                  fill={selectedPlantColor.stroke}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="drop-shadow-md"
                />
              </g>
            )}

            {/* X-Axis Date Number Labels */}
            {dailySeries.map((item, idx) => {
              const isDense = dailySeries.length > 20;
              const isCurrentBucket = chartBuckets.granularity === 'hour'
                ? item.date === currentDate && item.hour === currentHour
                : chartBuckets.granularity === 'month'
                  ? item.key === currentMonth
                  : item.date === currentDate;
              const shouldShow = chartBuckets.granularity === 'hour'
                ? idx % 3 === 0 || isCurrentBucket
                : chartBuckets.granularity === 'month'
                  ? true
                  : !isDense || idx % 2 === 0 || idx === dailySeries.length - 1 || isCurrentBucket;
              if (!shouldShow) return null;

              const x = getX(idx);
              const isHovered = hoveredDateIndex === idx;

              return (
                <g key={item.key}>
                  <text
                    x={x}
                    y={padTop + plotHeight + 20}
                    textAnchor="middle"
                    fill={isCurrentBucket ? selectedPlantColor.stroke : undefined}
                    className={`text-[9px] ${
                      isCurrentBucket || isHovered
                        ? 'font-bold'
                        : 'fill-current font-semibold text-(--color-text-muted)'
                    } ${isHovered && !isCurrentBucket ? 'fill-teal-600 dark:fill-teal-400' : ''}`}
                  >
                    {item.label}
                  </text>
                  {isCurrentBucket && (
                    <circle
                      cx={x}
                      cy={padTop + plotHeight + 25}
                      r="1.5"
                      fill={selectedPlantColor.stroke}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {hoveredDay && hoveredX !== null && hoveredY !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-20 w-[calc(100%-0.75rem)] max-w-72 rounded-xl border border-(--color-border) bg-white/1 p-2.5 text-(--color-text) shadow-[0_12px_28px_-14px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl transition duration-150 dark:bg-black/40 dark:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]"
              style={{
                left: `clamp(0px, calc(${(hoveredX / svgWidth) * 100}% - 9rem), calc(100% - 18rem))`,
                top: `${(hoveredY / svgHeight) * 100}%`,
                transform: `perspective(900px) translateY(${hoveredY / svgHeight < 0.55 ? '0.5rem' : 'calc(-100% - 0.5rem)'}) rotateX(2deg)`,
                transformOrigin: 'center',
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-2 border-b border-(--color-border) pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300">
                    <Calendar size={12} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold">
                      {chartBuckets.granularity === 'hour'
                        ? `${hoveredDay.label} · Today`
                        : chartBuckets.granularity === 'month'
                          ? new Date(`${hoveredDay.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                          : formatDateDisplay(hoveredDay.date)}
                    </p>
                    <p className="text-[9px] text-(--color-text-muted)">
                      {hoveredDay.hasData ? `Attendance by ${chartUnit}` : 'No attendance logged'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-teal-500/10 px-1.5 py-1 text-[9px] font-bold tabular-nums text-teal-800 dark:text-teal-200">
                  {formatter(hoveredDay.displayCount)} present
                </span>
              </div>

              {hoveredDay.totalOT > 0 && (
                <div className="mb-2 rounded-md bg-amber-500/10 px-2 py-1">
                  <span className="block text-[8px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Overtime</span>
                  <span className="text-[11px] font-bold tabular-nums text-amber-800 dark:text-amber-200">{formatter(hoveredDay.totalOT)} hrs</span>
                </div>
              )}

              {hoveredDay.plants.length > 0 && (
                <div className="max-h-28 space-y-0.5 overflow-y-auto">
                  {hoveredDay.plants.map((plant) => {
                    return (
                      <div
                        key={plant.plant_id}
                        className="flex items-center justify-between gap-2 rounded px-1.5 py-0.5"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${plant.color.bg}`} />
                          <span className="truncate text-[9px] font-medium">{plant.plant_name}</span>
                        </span>
                        <span className="shrink-0 text-[9px] font-semibold tabular-nums">
                          {formatter(plant.present)} present
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
