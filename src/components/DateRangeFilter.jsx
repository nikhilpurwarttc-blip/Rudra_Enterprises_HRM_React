import { useState, useCallback } from 'react';
import SearchableSelect from './SearchableSelect';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().slice(0, 10);

const today = () => {
  const d = new Date();
  return { dateFrom: fmt(d), dateTo: fmt(d) };
};

const thisWeek = () => {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { dateFrom: fmt(mon), dateTo: fmt(sun) };
};

// Build month options: Jan–Dec for current + previous year
const buildMonthOptions = () => {
  const now = new Date();
  const opts = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
    for (let m = 11; m >= 0; m--) {
      const label = new Date(y, m, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      opts.push({ value: `month:${y}:${m}`, label });
    }
  }
  return opts;
};

// Build quarterly options: Q1–Q4 for current + previous financial year
// Financial year: Apr–Mar  (Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
const buildQuarterOptions = () => {
  const now = new Date();
  const curFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const opts = [];
  for (let fy = curFY; fy >= curFY - 1; fy--) {
    const fyLabel = `FY ${fy}-${String(fy + 1).slice(2)}`;
    opts.push(
      { value: `q:${fy}:1`, label: `Q1 Apr–Jun  (${fyLabel})` },
      { value: `q:${fy}:2`, label: `Q2 Jul–Sep  (${fyLabel})` },
      { value: `q:${fy}:3`, label: `Q3 Oct–Dec  (${fyLabel})` },
      { value: `q:${fy}:4`, label: `Q4 Jan–Mar  (${fyLabel})` },
    );
  }
  return opts;
};

// Build financial year options: last 5 FYs
const buildFYOptions = () => {
  const now = new Date();
  const curFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => {
    const fy = curFY - i;
    return { value: `fy:${fy}`, label: `FY ${fy}–${String(fy + 1).slice(2)}` };
  });
};

const rangeFromValue = (val) => {
  if (!val) return null;
  if (val === 'today') return today();
  if (val === 'week')  return thisWeek();

  if (val.startsWith('month:')) {
    const [, y, m] = val.split(':').map(Number);
    const from = new Date(y, m, 1);
    const to   = new Date(y, m + 1, 0);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }
  if (val.startsWith('q:')) {
    const [, fy, q] = val.split(':').map(Number);
    // Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar (next cal year)
    const quarters = [
      [fy,     3,  fy,     5],
      [fy,     6,  fy,     8],
      [fy,     9,  fy,    11],
      [fy + 1, 0,  fy + 1, 2],
    ];
    const [fy1, m1, fy2, m2] = quarters[q - 1];
    const from = new Date(fy1, m1, 1);
    const to   = new Date(fy2, m2 + 1, 0);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }
  if (val.startsWith('fy:')) {
    const fy = Number(val.split(':')[1]);
    return { dateFrom: `${fy}-04-01`, dateTo: `${fy + 1}-03-31` };
  }
  return null;
};

const PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
];

const MONTH_OPTIONS    = buildMonthOptions();
const QUARTER_OPTIONS  = buildQuarterOptions();
const FY_OPTIONS       = buildFYOptions();

const inputCls = 'w-full min-h-14 rounded-md border border-(--color-border-strong) bg-transparent px-3 text-sm text-(--color-text) transition-colors placeholder:text-(--color-text-muted) focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)';

// ── Component ─────────────────────────────────────────────────────────────────
// Props:
//   onChange({ dateFrom, dateTo }) — called whenever a preset or custom range is selected
//   defaultPreset — initial preset value (default: 'today')
export default function DateRangeFilter({ onChange, defaultPreset = 'today' }) {
  const initRange = rangeFromValue(defaultPreset) ?? today();

  const [preset,    setPreset]    = useState(defaultPreset);
  const [month,     setMonth]     = useState('');
  const [quarter,   setQuarter]   = useState('');
  const [fy,        setFY]        = useState('');
  const [dateFrom,  setDateFrom]  = useState(initRange.dateFrom);
  const [dateTo,    setDateTo]    = useState(initRange.dateTo);

  const emit = useCallback((range) => onChange?.(range), [onChange]);

  const handlePreset = (val) => {
    setPreset(val); setMonth(''); setQuarter(''); setFY('');
    const r = rangeFromValue(val);
    if (r) { setDateFrom(r.dateFrom); setDateTo(r.dateTo); emit(r); }
  };

  const handleMonth = (val) => {
    setMonth(val); setPreset(''); setQuarter(''); setFY('');
    const r = rangeFromValue(val);
    if (r) { setDateFrom(r.dateFrom); setDateTo(r.dateTo); emit(r); }
  };

  const handleQuarter = (val) => {
    setQuarter(val); setPreset(''); setMonth(''); setFY('');
    const r = rangeFromValue(val);
    if (r) { setDateFrom(r.dateFrom); setDateTo(r.dateTo); emit(r); }
  };

  const handleFY = (val) => {
    setFY(val); setPreset(''); setMonth(''); setQuarter('');
    const r = rangeFromValue(val);
    if (r) { setDateFrom(r.dateFrom); setDateTo(r.dateTo); emit(r); }
  };

  const handleCustomFrom = (val) => {
    setDateFrom(val); setPreset(''); setMonth(''); setQuarter(''); setFY('');
    emit({ dateFrom: val, dateTo });
  };

  const handleCustomTo = (val) => {
    setDateTo(val); setPreset(''); setMonth(''); setQuarter(''); setFY('');
    emit({ dateFrom, dateTo: val });
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Today / This Week */}
      <div className="min-w-36 flex-1">
        <SearchableSelect
          label="Quick"
          options={PRESET_OPTIONS}
          value={preset}
          onChange={handlePreset}
          placeholder="Quick select…"
        />
      </div>

      {/* Month */}
      <div className="min-w-44 flex-1">
        <SearchableSelect
          label="Month"
          options={MONTH_OPTIONS}
          value={month}
          onChange={handleMonth}
          placeholder="Select month…"
        />
      </div>

      {/* Quarter */}
      <div className="min-w-52 flex-1">
        <SearchableSelect
          label="Quarter"
          options={QUARTER_OPTIONS}
          value={quarter}
          onChange={handleQuarter}
          placeholder="Select quarter…"
        />
      </div>

      {/* Financial Year */}
      <div className="min-w-36 flex-1">
        <SearchableSelect
          label="Financial Year"
          options={FY_OPTIONS}
          value={fy}
          onChange={handleFY}
          placeholder="Select FY…"
        />
      </div>

      {/* Custom date range */}
      <div className="min-w-32 flex-1">
        <label className="mb-1 block text-sm font-medium text-(--color-text-muted)">From</label>
        <input type="date" value={dateFrom} onChange={e => handleCustomFrom(e.target.value)} className={inputCls} />
      </div>
      <div className="min-w-32 flex-1">
        <label className="mb-1 block text-sm font-medium text-(--color-text-muted)">To</label>
        <input type="date" value={dateTo} onChange={e => handleCustomTo(e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}
