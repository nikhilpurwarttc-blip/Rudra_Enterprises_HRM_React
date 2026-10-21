import { useMemo, useState, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  Banknote,
  ChevronDown,
  FileSpreadsheet,
  Landmark,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
  X,
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
  { id: 'statutory', label: 'Deductions & contributions', icon: ShieldCheck },
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
        className={`capitalize flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeReport === id
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
  deductionTypeIds,
  onDeductionTypeIdsChange,
  deductionTypes = [],
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
          title="Select deduction types"
          label="Deduction types"
          options={deductionTypes.map((type) => ({
            value: String(type.id),
            label: type.code ? `${type.name} (${type.code})` : type.name,
          }))}
          value={deductionTypeIds}
          onChange={onDeductionTypeIdsChange}
          placeholder="All deduction types"
          multiSelect
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
    <div className={`grid grid-cols-1 gap-2 ${activeReport === 'statutory' ? 'sm:grid-cols-2 xl:grid-cols-5' : 'sm:grid-cols-4'}`}>
      <MetricCard icon={Landmark} label="Employees" value={formatNumber(summary.total_employees)} />
      {activeReport === 'statutory' ? (
        <>
          <MetricCard icon={Wallet} label="Basic pay" value={formatCurrency(summary.total_basic_pay ?? summary.total_wages)} />
          <MetricCard icon={ShieldCheck} label="Employee deductions" value={formatCurrency(summary.total_employee_contribution)} />
          <MetricCard icon={ShieldCheck} label="Employer contributions" value={formatCurrency(summary.total_employer_contribution)} />
          <MetricCard icon={ShieldCheck} label="Combined total" value={formatCurrency(summary.grand_total)} accent="text-emerald-600" />
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

const getColumns = (activeReport, chargeColumns, onPayEmployee, payingEmployeeId, canPayEmployees, isPaying, deductionTypes = []) => {
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
      { key: 'base_salary', label: 'Base Sal.', fullLabel: 'Base Salary (latest salary record with status = 1)', className: 'min-w-[95px]', tdClass: 'min-w-[95px] text-right', render: (row) => formatCurrency(row.base_salary) },
      {
        key: 'current_salary',
        label: 'Current Sal.',
        fullLabel: 'Current Salary (latest salary effective in the selected payroll month)',
        className: 'min-w-[110px]',
        tdClass: 'min-w-[110px] text-right',
        render: (row) => row.current_salary == null
          ? '—'
          : <span title={`Effective from ${row.current_salary_effective_from || 'unknown date'}`}>{formatCurrency(row.current_salary)}</span>,
      },
      { key: 'present_days', label: 'Present', fullLabel: 'Present Days', className: 'min-w-[65px]', tdClass: 'min-w-[65px] text-right', render: (row) => formatNumber(row.present_days) },
      { key: 'regular_hours', label: 'Basic Hrs', fullLabel: 'Basic Hours Worked', className: 'min-w-[80px]', tdClass: 'min-w-[80px] text-right', render: (row) => formatNumber(row.regular_hours) },
      {
        key: 'shutdown_pay',
        label: 'Shutdown',
        fullLabel: 'Paid shutdown days and shutdown pay',
        className: 'min-w-[105px]',
        tdClass: 'min-w-[105px] text-right',
        render: (row) => (
          <span className="flex w-full items-center justify-between gap-2 leading-tight">
            <span className="text-xs text-(--color-text-muted)" title="Paid shutdown days">
              {row.shutdown_days == null ? '—' : formatNumber(row.shutdown_days)}
            </span>
            <span>{formatCurrency(row.shutdown_pay)}</span>
          </span>
        ),
      },
      {
        key: 'current_salary_pay',
        label: 'Basic Pay',
        fullLabel: 'Current Salary Pay (salary effective in the selected payroll month)',
        className: 'min-w-[125px]',
        tdClass: 'min-w-[125px] text-right',
        render: (row) => row.current_salary_pay == null
        ? '—'
        : <span title={`Salary effective from ${row.current_salary_pay_effective_from || 'unknown date'}`}>{formatCurrency(row.current_salary_pay)}</span>,
      },
      {
        key: 'base_salary_pay',
        label: 'Base Sal. Pay',
        fullLabel: 'Base Salary Pay (latest salary record with status 1)',
        className: 'min-w-[120px]',
        tdClass: 'min-w-[120px] text-right',
        render: (row) => row.base_salary_pay == null
          ? '—'
          : <span title={`Salary effective from ${row.base_salary_pay_effective_from || 'unknown date'}`}>{formatCurrency(row.base_salary_pay)}</span>,
        },
      { key: 'overtime_hours', label: 'OT Hrs', fullLabel: 'Overtime Hours', className: 'min-w-[70px]', tdClass: 'min-w-[70px] text-right', render: (row) => formatNumber(row.overtime_hours) },
      { key: 'overtime_pay', label: 'OT Pay', fullLabel: 'Overtime Pay', className: 'min-w-[85px]', tdClass: 'min-w-[85px] text-right', render: (row) => formatCurrency(row.overtime_pay) },
      { key: 'total_hours', label: 'Tot. Hrs', fullLabel: 'Total Hours Worked', className: 'min-w-[80px]', tdClass: 'min-w-[80px] text-right', sortable: false, render: (row) => formatNumber(Number(row.regular_hours || 0) + Number(row.overtime_hours || 0)) },
      { key: 'total_pay', label: 'Tot. Pay', fullLabel: 'Total Regular + Overtime Pay (Total Hours × current salary hourly rate)', className: 'min-w-[100px]', tdClass: 'min-w-[100px] text-right font-semibold', render: (row) => formatCurrency(row.total_pay) },
      ...chargeColumns.map((charge) => ({
        key: `charge-${charge.id}`,
        label: charge.code || charge.name,
        fullLabel: charge.name,
        className: 'min-w-[90px]',
        tdClass: 'min-w-[90px] text-right',
        sortable: false,
        render: (row) => formatCurrency(row.charge_breakdown?.find((item) => String(item.id) === String(charge.id))?.amount),
      })),
      { key: 'advance', label: 'Adv.', fullLabel: 'Cash / Bank Advance', className: 'min-w-[85px]', tdClass: 'min-w-[85px] text-right', sortable: false, render: (row) => formatCurrency(Number(row.cash_advance || 0) + Number(row.bank_advance || 0)) },
      { key: 'total_deductions', label: 'Deductions', fullLabel: 'Total Deductions', className: 'min-w-[105px]', tdClass: 'min-w-[105px] text-right', render: (row) => formatCurrency(row.total_deductions) },
      { key: 'furnace_allowance', label: 'Furnace', fullLabel: 'Furnace Allowance', className: 'min-w-[105px]', tdClass: 'min-w-[105px] text-right', render: (row) => formatCurrency(row.furnace_allowance) },
      {
        key: 'net_salary',
        label: 'Net Pay',
        fullLabel: 'Net Pay (Total Pay + Auto / Shutdown Pay + other additions - deductions)',
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
    { key: 'basic_pay', label: 'Basic Pay', fullLabel: 'Regular earned pay used as the deduction basis; falls back to gross salary when regular pay is unavailable', className: 'min-w-[110px]', tdClass: 'min-w-[110px] text-right', render: (row) => formatCurrency(row.basic_pay ?? row.gross_wages) },
    ...deductionTypes.flatMap((type) => [
      {
        key: `deductions.${type.id}.employee_share`,
        label: `${type.code || type.name} · Emp.`,
        fullLabel: `${type.name} paid by employee`,
        className: 'min-w-[125px]',
        tdClass: 'min-w-[125px] text-right',
        sortable: false,
        render: (row) => formatCurrency(row.deductions?.[type.id]?.employee_share),
      },
      {
        key: `deductions.${type.id}.employer_share`,
        label: `${type.code || type.name} · Empr.`,
        fullLabel: `${type.name} paid by employer`,
        className: 'min-w-[125px]',
        tdClass: 'min-w-[125px] text-right',
        sortable: false,
        render: (row) => formatCurrency(row.deductions?.[type.id]?.employer_share),
      },
    ]),
    { key: 'employee_share', label: 'Employee Total', fullLabel: 'Total deductions paid by employee', className: 'min-w-[125px]', tdClass: 'min-w-[125px] text-right font-semibold', render: (row) => formatCurrency(row.employee_share) },
    { key: 'employer_share', label: 'Employer Total', fullLabel: 'Total contributions paid by employer', className: 'min-w-[125px]', tdClass: 'min-w-[125px] text-right font-semibold', render: (row) => formatCurrency(row.employer_share) },
    { key: 'total_contribution', label: 'Combined Total', fullLabel: 'Employee deductions plus employer contributions', className: 'min-w-[130px]', tdClass: 'min-w-[130px] text-right font-bold', render: (row) => formatCurrency(row.total_contribution) },
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
  deductionTypes = [],
  onPayEmployee,
  payingEmployeeId,
  canPayEmployees = false,
  isPaying = false,
  refreshReport,
  isRefreshing = false,
}) => {
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showDeductionDetails, setShowDeductionDetails] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const handleZoomIn = useCallback(() => setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM)), []);
  const handleZoomOut = useCallback(() => setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM)), []);
  const handleResetZoom = useCallback(() => setZoomLevel(100), []);

  const columns = useMemo(
    () => getColumns(activeReport, chargeColumns, onPayEmployee, payingEmployeeId, canPayEmployees, isPaying, deductionTypes),
    [activeReport, chargeColumns, onPayEmployee, payingEmployeeId, canPayEmployees, isPaying, deductionTypes]
  );

  const visibleRows = useMemo(() => {
    const query = employeeSearch.trim().toLocaleLowerCase();
    if (activeReport !== 'monthly' || !query) return rows;
    return rows.filter((row) => [
      row.employee_name,
      row.employee_code,
      row.employee_id,
      row.id,
    ].some((value) => String(value ?? '').toLocaleLowerCase().includes(query)));
  }, [activeReport, rows, employeeSearch]);

  const sortedRows = useMemo(() => {
    if (activeReport !== 'monthly') return visibleRows;
    const query = employeeSearch.trim().toLocaleLowerCase();
    if (!sort.key && !query) return visibleRows;

    return [...visibleRows].sort((left, right) => {
      if (query) {
        const leftStartsWithQuery = String(left.employee_name ?? '').trim().toLocaleLowerCase().startsWith(query);
        const rightStartsWithQuery = String(right.employee_name ?? '').trim().toLocaleLowerCase().startsWith(query);
        if (leftStartsWithQuery !== rightStartsWithQuery) return leftStartsWithQuery ? -1 : 1;
      }
      if (!sort.key) return 0;

      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      const leftComparable = typeof leftValue === 'string' ? leftValue.toLocaleLowerCase() : leftValue;
      const rightComparable = typeof rightValue === 'string' ? rightValue.toLocaleLowerCase() : rightValue;
      if (leftComparable == null) return 1;
      if (rightComparable == null) return -1;
      return (leftComparable < rightComparable ? -1 : leftComparable > rightComparable ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [activeReport, visibleRows, employeeSearch, sort]);

  if (activeReport === 'monthly') {
    const monthLabel = payrollMonth
      ? new Date(`${payrollMonth}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : 'Selected period';
    const visibleColumns = showDeductionDetails
      ? columns
      : columns.filter((column) => !column.key.startsWith('charge-') && column.key !== 'advance');

    const styledColumns = visibleColumns.map((column) => {
      let headerBg = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
      let bodyBg = 'bg-white dark:bg-slate-900';

      if (column.key === 'regular_hours' || column.key === 'overtime_hours' || column.key === 'total_hours') {
        headerBg = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
        bodyBg = 'bg-slate-50 dark:bg-slate-900';
      } else if (column.key === 'current_salary_pay' || column.key === 'base_salary_pay' || column.key === 'overtime_pay') {
        headerBg = 'bg-indigo-100 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200';
        bodyBg = 'bg-indigo-50/70 dark:bg-indigo-950/50';
      } else if (column.key === 'total_pay' || column.key === 'gross_salary') {
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
            <h2 className="capitalize text-sm font-semibold text-(--color-text)">Monthly salary details</h2>
            <p className="text-[11px] text-(--color-text-muted)">
              {monthLabel} · {employeeSearch.trim() ? `${sortedRows.length} of ${rows.length}` : rows.length} employees
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-7 w-40 items-center gap-1.5 rounded-lg border border-(--color-border) bg-white px-2 text-xs shadow-xs transition-colors focus-within:border-(--color-accent) focus-within:ring-1 focus-within:ring-(--color-accent)/30 dark:bg-slate-900 sm:w-48">
              <Search size={13} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search employees by name, code, or ID"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Name / ID"
                className="min-w-0 flex-1 bg-transparent text-[10px] text-(--color-text) outline-none placeholder:text-(--color-text-muted)"
              />
              {employeeSearch && (
                <button
                  type="button"
                  onClick={() => setEmployeeSearch('')}
                  aria-label="Clear employee search"
                  title="Clear search"
                  className="shrink-0 rounded p-0.5 text-(--color-text-muted) transition-colors hover:text-(--color-text)"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-(--color-border) bg-white p-0.5 text-xs shadow-xs dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowDeductionDetails((visible) => !visible)}
                aria-expanded={showDeductionDetails}
                aria-controls="monthly-salary-table"
                aria-label={showDeductionDetails ? 'Hide deduction details' : 'Show deduction details'}
                title={showDeductionDetails ? 'Hide deduction details' : 'Show deduction details'}
                className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) ${
                  showDeductionDetails
                    ? 'bg-(--color-accent-soft) text-(--color-accent)'
                    : 'text-(--color-text-muted) hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Deductions
                <ChevronDown
                  size={13}
                  aria-hidden="true"
                  className={`transition-transform ${showDeductionDetails ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

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
          id="monthly-salary-table"
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
                    <Feedback
                      type="empty"
                      title={employeeSearch.trim()
                        ? 'No employees match this search.'
                        : 'No active approved employees found for this month and filters.'}
                    />
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, rowIndex) => (
                  <tr key={row.employee_id ?? row.id ?? rowIndex} className="group">
                    {styledColumns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap border-b border-r border-slate-200 dark:border-slate-800 px-[0.7em] py-[0.4em] text-slate-900 dark:text-slate-100 last:border-r-0 transition-shadow duration-200 ${columnIndex === 0 ? 'group-hover:shadow-[inset_3px_0_0_var(--color-accent),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(15,23,42,0.12),0_5px_8px_rgba(15,23,42,0.18)] dark:group-hover:shadow-[inset_3px_0_0_var(--color-accent),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.55),0_5px_8px_rgba(0,0,0,0.45)]' : 'group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(15,23,42,0.12),0_5px_8px_rgba(15,23,42,0.18)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.55),0_5px_8px_rgba(0,0,0,0.45)]'} ${column.bodyBg} ${column.tdClass ?? ''}`}
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
      label={activeReport === 'statutory' ? 'deduction records' : 'payroll records'}
      emptyText={emptyText}
      isLoading={isLoading}
    />
    // </div>
  );
};

export { SalaryReportFilters, SalaryReportSummary, SalaryReportTable, SalaryReportTabs };