import { useMemo, useState, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  Banknote,
  FileSpreadsheet,
  Landmark,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Wallet,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { Feedback } from '../../components/Feedback';
import PageTable from '../../components/PageTable';
import SearchableSelect from '../../components/SearchableSelect';
import { resolveApiAssetUrl } from '../../config/config';

const REPORT_TABS = [
  { id: 'monthly', label: 'Monthly payroll', icon: Wallet },
  { id: 'yearly', label: 'Yearly summary', icon: FileSpreadsheet },
  { id: 'statutory', label: 'Statutory (PF / ESI)', icon: ShieldCheck },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const MetricCard = ({ icon: Icon, label, value, accent = 'text-(--color-accent)' }) => (
  <GlassCard className="flex min-w-0 items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2.5">
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--color-accent-soft) ${accent}`}>
      <Icon size={16} aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="truncate text-xs text-(--color-text-muted) capitalize">{label}</p>
      <p className="truncate text-sm font-semibold text-(--color-text)">{value}</p>
    </div>
  </GlassCard>
);

const FilterSelect = ({ label, options, value, onChange, isLoading = false, multiSelect = false }) => (
  <SearchableSelect
    label={label}
    options={options}
    value={value}
    onChange={onChange}
    placeholder={`All ${label.toLowerCase()}`}
    isLoading={isLoading}
    showSearch
    multiSelect={multiSelect}
  />
);

const EmployeeCell = ({ code, name, image }) => (
  <div className="flex min-w-0 items-center gap-2">
    <EmployeeInitialAvatar name={name} image={image} />
    <div className="min-w-0">
      <p className="truncate text-[0.95em] font-semibold text-(--color-text)" title={name}>
        {name || 'Unknown employee'}
      </p>
      <p className="truncate text-[0.8em] text-(--color-text-muted)">{code || 'No code'}</p>
    </div>
  </div>
);

const EmployeeInitialAvatar = ({ name, image }) => {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const imageUrl = resolveApiAssetUrl(image);
  const nameParts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : nameParts[0]?.[0] ?? 'E';

  return (
    <span aria-hidden="true" className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-accent-soft) text-[0.9em] font-semibold text-(--color-accent)">
      {initials.toLocaleUpperCase()}
      {imageUrl && failedImageUrl !== imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onError={() => setFailedImageUrl(imageUrl)}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
    </span>
  );
};

const SalaryReportTabs = ({ activeReport, onChange }) => (
  <div className="flex flex-wrap gap-2 border-b border-(--color-border)" role="tablist" aria-label="Salary report type">
    {REPORT_TABS.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={activeReport === id}
        onClick={() => onChange(id)}
        className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeReport === id
            ? 'border-(--color-accent) text-(--color-accent)'
            : 'border-transparent text-(--color-text-muted) hover:text-(--color-text)'
          }`}
      >
        <Icon size={14} aria-hidden="true" /> {label}
      </button>
    ))}
  </div>
);

const SalaryReportFilters = ({
  activeReport,
  payrollMonth,
  onPayrollMonthChange,
  year,
  onYearChange,
  yearOptions,
  statutoryType,
  onStatutoryTypeChange,
  plantIds,
  onPlantChange,
  plantOptions,
  isLoadingPlants,
  canViewPlants,
  departmentId,
  onDepartmentChange,
  departmentOptions,
  isLoadingDepartments,
  canViewDepartments,
  designationId,
  onDesignationChange,
  designationOptions,
  isLoadingDesignations,
  canViewDesignations,
}) => (
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
    {activeReport === 'monthly' && (
      <InputField label="Payroll month" type="month" value={payrollMonth} onChange={onPayrollMonthChange} />
    )}
    {activeReport === 'yearly' && (
      <SearchableSelect
        title="Select calendar year"
        label="Calendar year"
        options={yearOptions}
        value={year}
        onChange={onYearChange}
        placeholder="Select calendar year"
      />
    )}
    {activeReport === 'statutory' && (
      <>
        <SearchableSelect
          title="Select contribution type"
          label="Contribution type"
          options={[
            { value: 'esi', label: 'ESI' },
            { value: 'pf', label: 'PF' },
          ]}
          value={statutoryType}
          onChange={onStatutoryTypeChange}
          placeholder="Select contribution type"
        />
        <InputField label="Payroll month" type="month" value={payrollMonth} onChange={onPayrollMonthChange} />
      </>
    )}
    {canViewPlants && (
      <FilterSelect label="Plant" options={plantOptions} value={plantIds} isLoading={isLoadingPlants} onChange={onPlantChange} multiSelect />
    )}
    {canViewDepartments && (
      <FilterSelect label="Department" options={departmentOptions} value={departmentId} isLoading={isLoadingDepartments} onChange={onDepartmentChange} />
    )}
    {canViewDesignations && (
      <FilterSelect label="Designation" options={designationOptions} value={designationId} isLoading={isLoadingDesignations} onChange={onDesignationChange} />
    )}
  </div>
);

const SalaryReportSummary = ({ activeReport, summary }) => {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <MetricCard icon={Landmark} label="Employees" value={formatNumber(summary.total_employees)} />
      {activeReport === 'statutory' ? (
        <>
          <MetricCard icon={Wallet} label="Gross wages" value={formatCurrency(summary.total_wages)} />
          <MetricCard icon={ShieldCheck} label="Employee contribution" value={formatCurrency(summary.total_employee_contribution)} />
          <MetricCard icon={ShieldCheck} label="Total contributions" value={formatCurrency(summary.grand_total)} accent="text-emerald-600" />
        </>
      ) : (
        <>
          <MetricCard icon={Wallet} label={activeReport === 'yearly' ? 'Year gross' : 'Gross salary'} value={formatCurrency(activeReport === 'yearly' ? summary.year_gross : summary.gross_salary)} />
          <MetricCard icon={Wallet} label="Total deductions" value={formatCurrency(activeReport === 'yearly' ? summary.year_deductions : summary.total_deductions)} />
          <MetricCard icon={Wallet} label={activeReport === 'yearly' ? 'Year net salary' : 'Net salary'} value={formatCurrency(activeReport === 'yearly' ? summary.year_net_salary : summary.net_salary)} accent="text-emerald-600" />
        </>
      )}
    </div>
  );
};

// SOLID OPAQUE STICKY STYLES
const STICKY_SNO_HEADER = '!bg-slate-100 dark:!bg-slate-900 sticky left-0 z-40 shadow-[3px_0_8px_rgba(0,0,0,0.12)]';
const STICKY_SNO_BODY = '!bg-white dark:!bg-slate-900 sticky left-0 z-20 shadow-[3px_0_8px_rgba(0,0,0,0.08)]';

const STICKY_EMP_HEADER = '!bg-slate-100 dark:!bg-slate-900 sticky left-[55px] z-40 shadow-[4px_0_10px_rgba(0,0,0,0.12)]';
const STICKY_EMP_BODY = '!bg-white dark:!bg-slate-900 sticky left-[55px] z-20 shadow-[4px_0_10px_rgba(0,0,0,0.08)]';

const STICKY_NET_HEADER = '!bg-emerald-200 dark:!bg-emerald-950 sticky z-40 shadow-[-4px_0_10px_rgba(0,0,0,0.12)]';
const STICKY_NET_BODY = '!bg-emerald-100 dark:!bg-emerald-900 sticky z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.08)]';

const STICKY_ACTION_HEADER = '!bg-slate-100 dark:!bg-slate-900 sticky right-0 z-40 shadow-[-3px_0_8px_rgba(0,0,0,0.12)]';
const STICKY_ACTION_BODY = '!bg-white dark:!bg-slate-900 sticky right-0 z-20 shadow-[-3px_0_8px_rgba(0,0,0,0.08)]';

const getColumns = (activeReport, chargeColumns, onPayEmployee, payingEmployeeId, canPayEmployees, isPaying) => {
  if (activeReport === 'monthly') {
    return [
      {
        key: '_serial',
        label: 'S. No.',
        fullLabel: 'Serial Number',
        className: `min-w-[55px] w-[55px] ${STICKY_SNO_HEADER}`,
        tdClass: `min-w-[55px] w-[55px] text-center ${STICKY_SNO_BODY}`,
        sortable: false,
        render: (_row, index) => index + 1,
      },
      {
        key: 'employee_name',
        label: 'Emp. Name',
        fullLabel: 'Employee Name & Code',
        className: `min-w-[170px] w-[170px] ${STICKY_EMP_HEADER}`,
        tdClass: `min-w-[170px] w-[170px] ${STICKY_EMP_BODY}`,
        sortable: false,
        render: (row) => <EmployeeCell code={row.employee_code} name={row.employee_name} image={row.image} />,
      },
      { key: 'designation_name', label: 'Desig.', fullLabel: 'Designation', className: 'min-w-[110px]', tdClass: 'min-w-[110px]', render: (row) => row.designation_name || '—' },
      { key: 'base_salary', label: 'Base Sal.', fullLabel: 'Base Salary', className: 'min-w-[95px]', tdClass: 'min-w-[95px] text-right', render: (row) => formatCurrency(row.base_salary) },
      { key: 'present_days', label: 'Days', fullLabel: 'Present Days', className: 'min-w-[65px]', tdClass: 'min-w-[65px] text-right', render: (row) => formatNumber(row.present_days) },
      { key: 'regular_hours', label: 'Basic Hrs', fullLabel: 'Basic Hours Worked', className: 'min-w-[80px]', tdClass: 'min-w-[80px] text-right', render: (row) => formatNumber(row.regular_hours) },
      { key: 'auto_pay', label: 'Auto/Shut.', fullLabel: 'Auto Pay / Shutdown Pay', className: 'min-w-[95px]', tdClass: 'min-w-[95px] text-right', render: (row) => formatCurrency(Number(row.furnace_allowance || 0) + Number(row.shutdown_pay || 0)) },
      { key: 'regular_pay', label: 'Basic Pay', fullLabel: 'Basic Pay', className: 'min-w-[90px]', tdClass: 'min-w-[90px] text-right', render: (row) => formatCurrency(row.regular_pay) },
      { key: 'overtime_hours', label: 'OT Hrs', fullLabel: 'Overtime Hours', className: 'min-w-[70px]', tdClass: 'min-w-[70px] text-right', render: (row) => formatNumber(row.overtime_hours) },
      { key: 'overtime_pay', label: 'OT Pay', fullLabel: 'Overtime Pay', className: 'min-w-[85px]', tdClass: 'min-w-[85px] text-right', render: (row) => formatCurrency(row.overtime_pay) },
      { key: 'total_hours', label: 'Tot. Hrs', fullLabel: 'Total Hours Worked', className: 'min-w-[80px]', tdClass: 'min-w-[80px] text-right', sortable: false, render: (row) => formatNumber(Number(row.regular_hours || 0) + Number(row.overtime_hours || 0)) },
      { key: 'gross_salary', label: 'Tot. Pay', fullLabel: 'Total Gross Pay', className: 'min-w-[100px]', tdClass: 'min-w-[100px] text-right font-semibold', render: (row) => formatCurrency(row.gross_salary) },
      ...chargeColumns.map((charge) => ({
        key: `charge-${charge.id}`,
        label: charge.name,
        fullLabel: charge.name,
        className: 'min-w-[90px]',
        tdClass: 'min-w-[90px] text-right',
        sortable: false,
        render: (row) => formatCurrency(row.charge_breakdown?.find((item) => String(item.id) === String(charge.id))?.amount),
      })),
      { key: 'basic_pf_amount', label: 'B. PF', fullLabel: 'Basic Provident Fund', className: 'min-w-[85px]', tdClass: 'min-w-[85px] text-right', render: (row) => formatCurrency(row.basic_pf_amount ?? row.pf_amount) },
      { key: 'ot_pf_amount', label: 'OT PF', fullLabel: 'Overtime Provident Fund', className: 'min-w-[80px]', tdClass: 'min-w-[80px] text-right', render: (row) => formatCurrency(row.ot_pf_amount) },
      { key: 'advance', label: 'Adv.', fullLabel: 'Cash / Bank Advance', className: 'min-w-[85px]', tdClass: 'min-w-[85px] text-right', sortable: false, render: (row) => formatCurrency(Number(row.cash_advance || 0) + Number(row.bank_advance || 0)) },
      { key: 'total_deductions', label: 'Deductions', fullLabel: 'Total Deductions', className: 'min-w-[105px]', tdClass: 'min-w-[105px] text-right', render: (row) => formatCurrency(row.total_deductions) },
      {
        key: 'net_salary',
        label: 'Net Pay',
        fullLabel: 'Net Payable Salary',
        className: `min-w-[110px] w-[110px] ${STICKY_NET_HEADER} right-[132px]`,
        tdClass: `min-w-[110px] w-[110px] text-right font-bold ${STICKY_NET_BODY} right-[132px]`,
        render: (row) => formatCurrency(row.net_salary),
      },
      {
        key: 'actions',
        label: 'Action',
        fullLabel: 'Payment Status / Action',
        className: `min-w-[132px] w-[132px] text-center ${STICKY_ACTION_HEADER}`,
        tdClass: `min-w-[132px] w-[132px] text-center ${STICKY_ACTION_BODY}`,
        sortable: false,
        render: (row) =>
          row.is_paid ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <BadgeCheck size={13} aria-hidden="true" />
              Paid
            </span>
          ) : canPayEmployees && row.eligible_for_lock ? (
            <Button
              type="button"
              onClick={() => onPayEmployee(row)}
              disabled={isPaying}
              title="Prepare and lock this employee’s salary calculation if needed, then continue to payment."
              aria-label={`Pay ${row.employee_name}`}
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs"
            >
              {payingEmployeeId === String(row.employee_id) ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
                  Preparing…
                </>
              ) : (
                <>
                  <Banknote size={14} aria-hidden="true" />
                  Pay Now
                </>
              )}
            </Button>
          ) : (
            '—'
          ),
      },
    ];
  }

  if (activeReport === 'yearly') {
    return [
      { key: 'employee_name', label: 'Employee', fullLabel: 'Employee Name', className: 'min-w-[160px]', tdClass: 'min-w-[160px]', sortable: false, render: (row) => <EmployeeCell code={row.employee_code} name={row.employee_name} image={row.image} /> },
      { key: 'plant_name', label: 'Plant', fullLabel: 'Plant Name', className: 'min-w-[110px]', tdClass: 'min-w-[110px]' },
      ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName) => ({
        key: `months.${monthName}`,
        label: monthName,
        fullLabel: `${monthName} Gross Pay`,
        sortable: false,
        className: 'min-w-[85px]',
        tdClass: 'min-w-[85px] text-right',
        render: (row) => formatCurrency(row.months?.[monthName]),
      })),
      { key: 'year_gross', label: 'Yr Gross', fullLabel: 'Yearly Gross Salary', className: 'min-w-[100px]', tdClass: 'min-w-[100px] text-right font-semibold', render: (row) => formatCurrency(row.year_gross) },
      { key: 'year_deductions', label: 'Deductions', fullLabel: 'Yearly Total Deductions', className: 'min-w-[100px]', tdClass: 'min-w-[100px] text-right', render: (row) => formatCurrency(row.year_deductions) },
      { key: 'year_net_salary', label: 'Yr Net', fullLabel: 'Yearly Net Salary', className: 'min-w-[105px]', tdClass: 'min-w-[105px] text-right font-semibold text-emerald-700 dark:text-emerald-400', render: (row) => formatCurrency(row.year_net_salary) },
    ];
  }

  return [
    { key: 'employee_name', label: 'Employee', fullLabel: 'Employee Name', className: 'min-w-[160px]', tdClass: 'min-w-[160px]', sortable: false, render: (row) => <EmployeeCell code={row.employee_code} name={row.employee_name} image={row.image} /> },
    { key: 'plant_name', label: 'Plant', fullLabel: 'Working Plant', className: 'min-w-[120px]', tdClass: 'min-w-[120px]' },
    { key: 'gross_wages', label: 'Gross Wages', fullLabel: 'Total Gross Wages', className: 'min-w-[110px]', tdClass: 'min-w-[110px] text-right', render: (row) => formatCurrency(row.gross_wages) },
    { key: 'employee_share', label: 'Emp. Share', fullLabel: 'Employee Contribution Share', className: 'min-w-[110px]', tdClass: 'min-w-[110px] text-right', render: (row) => formatCurrency(row.employee_share) },
    { key: 'employer_share', label: 'Empr. Share', fullLabel: 'Employer Contribution Share', className: 'min-w-[110px]', tdClass: 'min-w-[110px] text-right', render: (row) => formatCurrency(row.employer_share) },
    { key: 'total_contribution', label: 'Tot. Contrib.', fullLabel: 'Total Statutory Contribution', className: 'min-w-[115px]', tdClass: 'min-w-[115px] text-right font-semibold', render: (row) => formatCurrency(row.total_contribution) },
  ];
};

const MIN_ZOOM = 75;
const MAX_ZOOM = 125;
const ZOOM_STEP = 10;

const SalaryReportTable = ({
  activeReport,
  rows = [],
  isLoading = false,
  payrollMonth,
  chargeColumns = [],
  onPayEmployee,
  payingEmployeeId,
  canPayEmployees = false,
  isPaying = false,
  refreshReport,
  isRefreshing = false,
}) => {
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleZoomIn = useCallback(() => setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM)), []);
  const handleZoomOut = useCallback(() => setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM)), []);
  const handleResetZoom = useCallback(() => setZoomLevel(100), []);

  const columns = useMemo(
    () => getColumns(activeReport, chargeColumns, onPayEmployee, payingEmployeeId, canPayEmployees, isPaying),
    [activeReport, chargeColumns, onPayEmployee, payingEmployeeId, canPayEmployees, isPaying]
  );

  const sortedRows = useMemo(() => {
    if (activeReport !== 'monthly' || !sort.key) return rows;

    return [...rows].sort((left, right) => {
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      const leftComparable = typeof leftValue === 'string' ? leftValue.toLocaleLowerCase() : leftValue;
      const rightComparable = typeof rightValue === 'string' ? rightValue.toLocaleLowerCase() : rightValue;
      if (leftComparable == null) return 1;
      if (rightComparable == null) return -1;
      return (leftComparable < rightComparable ? -1 : leftComparable > rightComparable ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [activeReport, rows, sort]);

  if (activeReport === 'monthly') {
    const monthLabel = payrollMonth
      ? new Date(`${payrollMonth}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : 'Selected period';

    const styledColumns = columns.map((column) => {
      let headerBg = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
      let bodyBg = 'bg-white dark:bg-slate-900';

      if (column.key === 'regular_hours' || column.key === 'overtime_hours' || column.key === 'total_hours') {
        headerBg = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
        bodyBg = 'bg-slate-50 dark:bg-slate-900';
      } else if (column.key === 'regular_pay' || column.key === 'overtime_pay') {
        headerBg = 'bg-indigo-100 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200';
        bodyBg = 'bg-indigo-50/70 dark:bg-indigo-950/50';
      } else if (column.key === 'gross_salary') {
        headerBg = 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100';
        bodyBg = 'bg-emerald-50/70 dark:bg-emerald-950/50';
      } else if (column.key === 'total_deductions' || column.key.startsWith('charge-') || column.key.includes('pf_amount') || column.key === 'advance') {
        headerBg = 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100';
        bodyBg = 'bg-amber-50/70 dark:bg-amber-950/50';
      }

      if (column.className?.includes('sticky')) {
        headerBg = '';
        bodyBg = '';
      }

      return {
        ...column,
        headerBg,
        bodyBg,
      };
    });

    return (
      <section className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-(--color-border) bg-(--color-bg-elevated) px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold text-(--color-text)">Monthly salary details</h2>
            <p className="text-[11px] text-(--color-text-muted)">{monthLabel} · {rows.length} employees</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Text Zoom Controls Bar */}
            <div className="flex items-center gap-1 rounded-lg border border-(--color-border) bg-white dark:bg-slate-900 p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                title="Zoom Out Table Text"
                aria-label="Zoom Out Table Text"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ZoomOut size={13} />
              </button>
              <span className="min-w-[40px] text-center text-[10px] font-semibold text-(--color-text-muted)">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                title="Zoom In Table Text"
                aria-label="Zoom In Table Text"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ZoomIn size={13} />
              </button>
              {zoomLevel !== 100 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Text Size"
                  aria-label="Reset Text Size"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-(--color-accent) transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>

            <button
              type="button"
              variant="ghost"
              onClick={refreshReport}
              disabled={isRefreshing || !refreshReport}
              aria-label="Refresh salary report"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
              {/* <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span> */}
            </button>

            {/* {isLoading && <span role="status" className="text-[11px] text-(--color-text-muted)">Updating salary data…</span>} */}
          </div>
        </div>

        {/* Scrollable Container with Font Scaling Container Variable */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Salary Data Table"
          style={{
            fontSize: `${0.75 * (zoomLevel / 100)}rem`,
          }}
          className="relative flex-1 overflow-auto bg-white dark:bg-slate-900 focus:outline-hidden"
        >
          <table className="w-full min-w-max border-separate border-spacing-0 bg-white dark:bg-slate-900">
            <thead className="sticky top-0 z-50">
              <tr>
                {styledColumns.map((column) => {
                  const sortable = column.sortable !== false && column.key !== 'actions' && !column.key.startsWith('_');
                  const isActiveSort = sort.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      title={column.fullLabel || column.label}
                      aria-sort={sortable && isActiveSort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`whitespace-nowrap border-b border-r border-slate-200 dark:border-slate-800 px-[0.7em] py-[0.5em] text-left font-bold uppercase tracking-wider transition-colors duration-150 last:border-r-0 ${column.headerBg} ${column.className ?? ''}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSort((current) => ({
                              key: column.key,
                              direction: current.key === column.key && current.direction === 'asc' ? 'desc' : 'asc',
                            }))
                          }
                          className="inline-flex items-center gap-1 font-bold uppercase tracking-wider hover:opacity-80 cursor-pointer"
                          aria-label={`Sort by ${column.fullLabel || column.label}`}
                        >
                          {column.label}
                          {isActiveSort ? (
                            sort.direction === 'asc' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {isLoading ? (
                Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`} aria-hidden="true">
                    {styledColumns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={`border-b border-r border-slate-200 dark:border-slate-800 px-[0.7em] py-[0.5em] last:border-r-0 ${column.bodyBg} ${column.tdClass ?? ''}`}
                      >
                        <span
                          className="block h-[1em] animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                          style={{ width: `${55 + ((columnIndex * 13) % 40)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={styledColumns.length} className="border-b border-slate-200 dark:border-slate-800 py-8">
                    <Feedback type="empty" title="No active approved employees found for this month and filters." />
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, rowIndex) => (
                  <tr key={row.employee_id ?? row.id ?? rowIndex} className="group">
                    {styledColumns.map((column) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap border-b border-r border-slate-200 dark:border-slate-800 px-[0.7em] py-[0.4em] text-slate-900 dark:text-slate-100 last:border-r-0 ${column.bodyBg} ${column.tdClass ?? ''}`}
                      >
                        {column.render ? column.render(row, rowIndex) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 border-t border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-[11px] text-(--color-text-muted)">
          Showing {sortedRows.length} employees
        </div>
      </section>
    );
  }

  const emptyText = 'No payroll records found for these filters.';

  return (
    // <div className="relative flex-1 min-h-0 w-full overflow-auto">
    <PageTable
      className="w-full min-w-max"
      columns={columns}
      rows={rows}
      total={rows.length}
      label={activeReport === 'statutory' ? 'contribution records' : 'payroll records'}
      emptyText={emptyText}
      isLoading={isLoading}
    />
    // </div>
  );
};

export { SalaryReportFilters, SalaryReportSummary, SalaryReportTable, SalaryReportTabs };