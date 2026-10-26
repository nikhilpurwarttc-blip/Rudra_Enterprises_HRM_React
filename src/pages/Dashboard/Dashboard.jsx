import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Layers,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AccessDenied from '../../components/AccessDenied';
import Button from '../../components/Button';
import { Feedback } from '../../components/Feedback';
import GlassCard from '../../components/GlassCard';
import usePermission from '../../hooks/usePermission';
import { selectUser } from '../../store/authSlice';
import { useGetDashboardQuery, useGetPlantsQuery } from '../../store/api';
import { useSelector } from 'react-redux';
import {
  AttendanceDonutChart,
  DailyPlantAttendanceVisualizer,
  DashboardBarList,
  DashboardEmpty,
  DashboardMetric,
  DashboardPanel,
  DashboardSkeleton,
  DashboardStatCard,
  MonthlyDailyPlantAttendanceChart,
} from './components/DashboardComponents';
import SearchableSelect from '../../components/SearchableSelect';
import InputField from '../../components/InputField';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const currentFinancialYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDateRangeDays = (start, end) => {
  if (!start || !end || start > end) return 0;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((endTime - startTime) / 86400000) + 1;
};

const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatNumber = (value) => numberFormat.format(Number(value) || 0);
const formatCurrency = (value) => currencyFormat.format(Number(value) || 0);
const getErrorMessage = (error) => (
  error?.data?.message
  ?? error?.error
  ?? error?.message
  ?? 'The dashboard could not be loaded. Please try again.'
);

const permissionCheck = (can, modules) => modules.some((module) => can(module, 'view'));

const ACTION_LINKS = {
  attendance_verification: {
    path: '/attendance',
    modules: ['attendance', 'attendance-report', 'attendances'],
    linkModules: ['attendance'],
  },
  employee_approval: {
    path: '/employees',
    modules: ['employees', 'employee', 'employee-view'],
    linkModules: ['employees'],
  },
  payroll_approval: {
    path: '/reports/salary',
    modules: ['payrolls', 'salary-report', 'salary-reports', 'salaries'],
    linkModules: ['salary-report'],
  },
  advance_recovery: {
    path: '/advances',
    modules: ['advances', 'employee-advances'],
    linkModules: ['advances'],
  },
  shutdown_approval: {
    path: '/reports/maintenance',
    modules: ['plant-shutdowns', 'maintenance-report', 'plants'],
    linkModules: ['maintenance-report'],
  },
  deputation_approval: { modules: ['employee-deputations', 'deputations'] },
};

const DashboardFilters = ({
  period,
  onPeriodChange,
  month,
  onMonthChange,
  financialYear,
  onFinancialYearChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  plantIds,
  onPlantIdsChange,
  plantOptions,
  plantsLoading,
  plantsError,
  canSelectPlants,
}) => {
  const customRangeTooLong = period === 'custom' && getDateRangeDays(startDate, endDate) > 365;
  const currentMonthValue = currentMonth();
  const currentDateValue = today();
  const currentFinancialYearValue = currentFinancialYear();

  return (
    <div className="flex flex-col gap-2" >
      {customRangeTooLong && (
        <p role="alert" className="px-2 text-xs font-medium text-[var(--color-danger)]">
          Custom date range is limited to 365 days. Please choose a shorter range.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2"> 

        {period === 'month' && (
          <div>
            <InputField
              label="Month"
              aria-label="Dashboard month"
              type="month"
              value={month}
              max={currentMonthValue}
              onChange={(event) => {
                if (event.target.value && event.target.value <= currentMonth()) {
                  onMonthChange(event.target.value);
                }
              }}
              className="h-10 min-h-10 rounded-xl bg-white/15 dark:bg-white/[0.04] border border-white/20 dark:border-white/10 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.2)]"
            />
          </div>
        )}

        {period === 'financial_year' && (
          <div>
            <SearchableSelect
              label="Financial year"
              ariaLabel="Financial year start"
              options={Array.from({ length: 8 }, (_, index) => {
                const year = Number(currentFinancialYearValue.slice(0, 4)) - index;
                return {
                  value: `${year}-${String((year + 1) % 100).padStart(2, '0')}`,
                  label: `${year}-${String((year + 1) % 100).padStart(2, '0')}`,
                };
              })}
              value={financialYear}
              onChange={(value) => {
                if (value <= currentFinancialYear()) onFinancialYearChange(value);
              }}
              className="min-w-38"
              btnClass="h-10 min-h-10 rounded-xl bg-white/15 dark:bg-white/[0.04] border border-white/20 dark:border-white/10 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.2)]"
            />
          </div>
        )}

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <InputField
              label="From"
              aria-label="Custom range start date"
              type="date"
              value={startDate}
              max={endDate && endDate < currentDateValue ? endDate : currentDateValue}
              onChange={(event) => {
                if (
                  event.target.value
                  && event.target.value <= currentDateValue
                  && (!endDate || event.target.value <= endDate)
                ) {
                  onStartDateChange(event.target.value);
                }
              }}
              className="h-10 min-h-10 rounded-xl bg-white/15 dark:bg-white/[0.04] border border-white/20 dark:border-white/10 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.2)]"
            />
            <InputField
              label="To"
              aria-label="Custom range end date"
              type="date"
              value={endDate}
              min={startDate}
              max={currentDateValue}
              onChange={(event) => {
                if (
                  event.target.value
                  && event.target.value <= currentDateValue
                  && (!startDate || event.target.value >= startDate)
                ) {
                  onEndDateChange(event.target.value);
                }
              }}
              className="h-10 min-h-10 rounded-xl bg-white/15 dark:bg-white/[0.04] border border-white/20 dark:border-white/10 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.2)]"
            />
          </div>
        )}        

        {canSelectPlants && (
          <div className="min-w-44 flex-1 sm:flex-none">
            <SearchableSelect
              label="Filter Plants"
              ariaLabel="Filter dashboard by plants"
              options={plantOptions}
              value={plantIds}
              onChange={onPlantIdsChange}
              placeholder="All operating plants"
              isLoading={plantsLoading}
              disabled={Boolean(plantsError)}
              multiSelect
              showSearch
              btnClass="h-10 min-h-10 rounded-xl bg-white/15 dark:bg-white/[0.04] border border-white/20 dark:border-white/10 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.2)]"
            />
            {plantsError && (
              <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">
                {getErrorMessage(plantsError)}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 dark:border-white/10 bg-black/[0.04] dark:bg-black/30 p-0.5 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.06)] backdrop-blur-md">
          {/* Quick Period Presets */}
          <div className="inline-flex rounded-xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] p-0.5">
            {[
              { value: 'today', label: 'Today' },
              { value: 'month', label: 'Month' },
              { value: 'financial_year', label: 'FY' },
              { value: 'custom', label: 'Custom' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onPeriodChange(tab.value)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${period === tab.value
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

const getFirstName = (user) => {
  const name = user?.name ?? user?.full_name ?? '';
  return name.trim().split(/\s+/)[0] || 'there';
};

const Dashboard = () => {
  const user = useSelector(selectUser);
  const { canView } = usePermission('/');
  const { can: canModule } = usePermission();
  const [period, setPeriod] = useState('today');
  const [month, setMonth] = useState(currentMonth);
  const [financialYear, setFinancialYear] = useState(currentFinancialYear);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [plantIds, setPlantIds] = useState([]);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const canSelectPlants = canModule('plants', 'view');

  const {
    data: plantsResponse,
    isLoading: plantsLoading,
    error: plantsError,
  } = useGetPlantsQuery({ per_page: 100 }, { skip: !canView || !canSelectPlants });

  const plantOptions = useMemo(() => {
    const plants = Array.isArray(plantsResponse?.data)
      ? plantsResponse.data
      : Array.isArray(plantsResponse) ? plantsResponse : [];
    return plants.map((plant) => ({ value: String(plant.id), label: plant.name }));
  }, [plantsResponse]);

  const queryParams = useMemo(() => {
    const dateFilters = period === 'month'
      ? { period, month }
      : period === 'financial_year'
        ? { period, financial_year: financialYear }
        : period === 'custom'
          ? { period, start_date: startDate, end_date: endDate }
          : { period: 'today' };

    return {
      ...dateFilters,
      ...(plantIds.length ? { plant_ids: plantIds } : {}),
    };
  }, [period, month, financialYear, startDate, endDate, plantIds]);

  const {
    data: response,
    error,
    isError,
    isLoading,
    refetch,
  } = useGetDashboardQuery(queryParams, {
    skip: !canView || (period === 'custom' && (
      !startDate
      || !endDate
      || startDate > endDate
      || startDate > today()
      || endDate > today()
      || getDateRangeDays(startDate, endDate) > 365
    ))
      || (period === 'month' && month > currentMonth())
      || (period === 'financial_year' && financialYear > currentFinancialYear()),
    refetchOnMountOrArgChange: true,
  });

  const refreshDashboard = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const dashboard = response?.data;
  console.log('dashboard', dashboard)
  // Strict Permission Verification
  const capabilities = dashboard?.capabilities;
  const canViewEmployees = capabilities?.can_view_employees ?? permissionCheck(canModule, ['employees', 'employee', 'employee-view']);
  const canViewAttendance = capabilities?.can_view_attendance ?? permissionCheck(canModule, ['attendance', 'attendance-report', 'attendances']);
  const canViewPayroll = capabilities?.can_view_payroll ?? permissionCheck(canModule, ['payrolls', 'salary-report', 'salary-reports', 'salaries']);
  const canViewStatutory = capabilities?.can_view_statutory ?? permissionCheck(canModule, ['statutory-reports', 'salary-report', 'salary-reports']);
  const canViewAdvances = capabilities?.can_view_advances ?? permissionCheck(canModule, ['advances', 'employee-advances']);
  const canViewDeputation = capabilities?.can_view_deputation ?? permissionCheck(canModule, ['employee-deputations', 'deputations']);
  const canViewDowntime = capabilities?.can_view_downtime ?? permissionCheck(canModule, ['plant-shutdowns', 'maintenance-report', 'plants']);

  const missingDashboardModules = [
    !canViewEmployees && { label: 'Employees', permission: 'employees: view' },
    !canViewAttendance && { label: 'Attendance', permission: 'attendance: view' },
    !canViewPayroll && { label: 'Payroll', permission: 'salary-report or payrolls: view' },
    !canViewStatutory && { label: 'Statutory reports', permission: 'statutory-reports: view' },
    !canViewAdvances && { label: 'Advances', permission: 'advances: view' },
    !canViewDeputation && { label: 'Deputations', permission: 'employee-deputations: view' },
    !canViewDowntime && { label: 'Plant downtime', permission: 'plant-shutdowns or maintenance-report: view' },
  ].filter(Boolean);

  const pendingActions = (dashboard?.pending_actions ?? []).filter((action) => ACTION_LINKS[action.type]);
  const pendingTotal = pendingActions.reduce((total, action) => total + (Number(action.count) || 0), 0);
  const attendanceSummary = dashboard?.attendance?.status_wise ?? [];
  const attendanceTotal = attendanceSummary.reduce((total, item) => total + (Number(item.count) || 0), 0);
  const attendanceRate = attendanceTotal
    ? Math.round(((Number(dashboard?.summary?.present) || 0) / attendanceTotal) * 100)
    : 0;

  if (!canView) return <AccessDenied pageName="the dashboard" routePath="/" />;

  const quickLinks = [
    canModule('employees', 'view') && { label: 'Employees', detail: 'Workforce directory', path: '/employees', icon: Users },
    canModule('attendance', 'view') && { label: 'Attendance', detail: 'Daily attendance logs', path: '/attendance', icon: CalendarDays },
    canModule('salary-report', 'view') && { label: 'Payroll reports', detail: 'Wage & salary register', path: '/reports/salary', icon: WalletCards },
    canModule('advances', 'view') && { label: 'Advances', detail: 'Employee advance tracking', path: '/advances', icon: Banknote },
  ].filter(Boolean);

  if (isLoading && !dashboard) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="h-28 animate-pulse rounded-2xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] shadow-lg backdrop-blur-xl motion-reduce:animate-none" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (!dashboard && isError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Feedback
          type="error"
          title="Dashboard unavailable"
          message={getErrorMessage(error)}
          action={
            <Button variant="ghost" onClick={() => refetch()} className="rounded-xl shadow-sm">
              <RefreshCw size={15} /> Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6 lg:p-8 bg-black/5 dark:bg-black/20">
      {/* ── Tier 1: Command Header & Quick Filter Presets ─────────────────────── */}
      <GlassCard className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 border-t-white/40 dark:border-t-white/20 bg-gradient-to-b from-white/15 via-white/5 to-black/5 dark:from-white/10 dark:via-white/[0.02] dark:to-black/35 p-6 sm:p-7 backdrop-blur-xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.35)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-(--color-accent-soft) blur-3xl opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -bottom-24 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl opacity-50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/35 to-transparent"
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-xl">
            {/* <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold tracking-wide uppercase text-(--color-text-muted)">
                Executive Pulse &amp; Operations
              </span>
            </div> */}

            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-(--color-text) sm:text-3xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-(--color-accent)/25 via-(--color-accent)/15 to-(--color-accent)/5 text-(--color-accent) ring-1 ring-white/35 dark:ring-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1.5px_1px_rgba(255,255,255,0.5)]">
                <Activity size={20} aria-hidden="true" />
              </span>
              Good Day, {getFirstName(user)}
            </h1>

            {dashboard?.filters?.label && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] px-3 py-1 text-xs font-bold text-(--color-text-muted) shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <CalendarDays size={13} aria-hidden="true" className="text-(--color-accent)" />
                  {dashboard.filters.label}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between xl:justify-end">
            <DashboardFilters
              period={period}
              onPeriodChange={setPeriod}
              month={month}
              onMonthChange={setMonth}
              financialYear={financialYear}
              onFinancialYearChange={setFinancialYear}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              plantIds={plantIds}
              onPlantIdsChange={setPlantIds}
              plantOptions={plantOptions}
              plantsLoading={plantsLoading}
              plantsError={plantsError}
              canSelectPlants={canSelectPlants}
            />

            <Button
              variant="ghost"
              onClick={refreshDashboard}
              disabled={manualRefreshing || isLoading}
              aria-label="Refresh dashboard metrics"
              className=" shrink-0 p-2.5 mb-1 rounded-xl border border-white/20 dark:border-white/10 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/10 dark:to-white/[0.02] shadow-[0_4px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all text-xs font-bold text-(--color-text)"
            >
              <RefreshCw
                size={17}
                className={manualRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}
                aria-hidden="true"
              />
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>

        {isLoading && (
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-(--color-accent) to-transparent animate-pulse motion-reduce:animate-none"
            aria-label="Updating dashboard metrics"
          />
        )}
      </GlassCard>

      {isError && dashboard && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-amber-500/5 px-4 py-3.5 text-sm font-semibold text-amber-900 dark:text-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md"
        >
          Dashboard refresh failed: {getErrorMessage(error)}. The last loaded data is still shown.
        </div>
      )}

      {/* ── Tier 2: The Executive Pulse (Hero KPI Metrics) ───────────────────── */}
      <section
        aria-label="Core operational KPIs"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {canViewEmployees && (
          <DashboardMetric
            icon={Users}
            label="Total workforce"
            value={formatNumber(dashboard?.summary?.workforce_total_employees ?? dashboard?.summary?.total_employees)}
            breakdown={[
              { label: 'Active', value: formatNumber(dashboard?.summary?.active_employees ?? dashboard?.summary?.total_employees) },
              { label: 'Inactive/Unapproved', value: formatNumber(dashboard?.summary?.inactive_employees) },
            ]}
            tone="accent"
          />
        )}

        {canViewAttendance && (
          <DashboardMetric
            icon={CheckCircle2}
            label="Present"
            value={formatNumber(dashboard?.summary?.present)}
            detail={attendanceTotal ? `${attendanceRate}% verified attendance` : 'No logs recorded'}
            tone="teal"
          />
        )}

        {canViewAttendance && (
          <DashboardMetric
            icon={Clock3}
            label="Verification queue"
            value={formatNumber(dashboard?.summary?.pending_verification)}
            detail="Requires supervisor action"
            tone="amber"
          />
        )}

        {canViewPayroll && dashboard?.payroll && (
          <DashboardMetric
            icon={Banknote}
            label={dashboard.payroll.net !== undefined ? 'Net disbursement' : 'Overtime cost'}
            value={formatCurrency(dashboard.payroll.net ?? dashboard.payroll.ot_amount)}
            detail={dashboard.payroll.net !== undefined ? `Gross: ${formatCurrency(dashboard.payroll.gross)}` : 'Operational estimate'}
            tone="blue"
          />
        )}

        {canViewAttendance && dashboard?.summary?.total_ot_hours !== undefined && (
          <DashboardMetric
            icon={Sparkles}
            label="Overtime logged"
            value={formatNumber(dashboard.summary.total_ot_hours)}
            detail="Total approved hours"
            tone="violet"
          />
        )}

        {canViewDowntime && dashboard?.downtime && (
          <DashboardMetric
            icon={Wrench}
            label="Shutdown events"
            value={formatNumber(dashboard.downtime.events)}
            detail={`${formatNumber(dashboard.downtime.hours)} guaranteed hours`}
            tone="amber"
          />
        )}
      </section>

      {/* ── Monthly Daily Plant Attendance Trend Graph ──────────────────────── */}
      {canViewAttendance && dashboard?.attendance && !(period === 'custom' && getDateRangeDays(startDate, endDate) > 365) && (
        <MonthlyDailyPlantAttendanceChart
          dailyPlantWise={dashboard.attendance.daily_plant_wise ?? []}
          hourlyPlantWise={dashboard.attendance.hourly_plant_wise ?? []}
          period={period}
          todayDate={dashboard.filters?.start_date}
          selectedMonth={month}
          financialYear={financialYear}
          startDate={startDate}
          endDate={endDate}
          plantIds={plantIds}
          formatter={formatNumber}
        />
      )}

      {/* ── Tier 3: Primary Operations Arena (Per-Day Attendance & Distribution) ─ */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-6 items-start">
        {/* Main Operational Focal Point: Daily Attendance Per Plant (4 cols) */}
        {canViewAttendance && dashboard?.attendance && (
          <div className="xl:col-span-4">
            <DashboardPanel
              title="Daily Plant Attendance &amp; Operations"
              description="Visual headcount distribution across permitted operating facilities"
              icon={Building2}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {dashboard.attendance.plant_wise?.length ?? 0} Active Facilities
                </span>
              }
            >
              <DailyPlantAttendanceVisualizer
                plants={dashboard.attendance.plant_wise ?? []}
                formatter={formatNumber}
              />
            </DashboardPanel>
          </div>
        )}

        {/* Supporting Analytics: Status Distribution Donut & Shifts (2 cols) */}
        {canViewAttendance && dashboard?.attendance && (
          <div className="xl:col-span-2">
            <DashboardPanel
              title="Workforce Distribution"
              description="Status breakdown &amp; shift balance"
              icon={PieChart}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                  {attendanceRate}% present
                </span>
              }
            >
              {attendanceTotal ? (
                <AttendanceDonutChart
                  summary={attendanceSummary}
                  total={attendanceTotal}
                  rate={attendanceRate}
                  dayShiftPresent={dashboard.attendance.day_shift_present ?? 0}
                  nightShiftPresent={dashboard.attendance.night_shift_present ?? 0}
                  formatter={formatNumber}
                />
              ) : (
                <DashboardEmpty message="No attendance activity logged for this period." />
              )}
            </DashboardPanel>
          </div>
        )}
      </div>

      {/* ── Tier 4: Action Queue & Secondary Intelligence ─────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-6 items-start">
        {/* Needs Attention Approval Queue (Spans 2 cols or 3 cols depending on content) */}
        {pendingActions.length > 0 && (
          <div className="xl:col-span-2">
            <DashboardPanel
              title="Needs Your Attention"
              description="Workflows awaiting authorization"
              icon={ClipboardCheck}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {formatNumber(pendingTotal)} pending
                </span>
              }
            >
              <ul className="space-y-2.5">
                {pendingActions.map((action) => {
                  const link = ACTION_LINKS[action.type];
                  const accessibleLink = link?.path && permissionCheck(canModule, link.linkModules ?? link.modules);

                  const content = (
                    <>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-amber-600/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/35 dark:ring-amber-400/20 shadow-[0_4px_14px_rgba(245,158,11,0.15),inset_0_1.5px_1px_rgba(255,255,255,0.5)]">
                        <ClipboardCheck size={20} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-(--color-text)">
                          {action.title}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {formatNumber(action.count)} pending item{Number(action.count) === 1 ? '' : 's'}
                        </span>
                      </div>
                      {accessibleLink && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 dark:border-white/10 bg-white/10 text-(--color-text-muted) shadow-xs transition-all duration-200 group-hover:translate-x-1 group-hover:text-(--color-accent) group-hover:bg-white/20">
                          <ArrowRight size={15} aria-hidden="true" />
                        </span>
                      )}
                    </>
                  );

                  return (
                    <li key={action.type}>
                      {accessibleLink ? (
                        <Link
                          to={link.path}
                          className="group flex items-center gap-3.5 rounded-2xl border border-white/15 dark:border-white/10 border-t-white/30 dark:border-t-white/20 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/[0.04] dark:to-white/[0.01] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-3">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </DashboardPanel>
          </div>
        )}

        {/* Payroll Overview (Adjusts span if Action Queue is present) */}
        {canViewPayroll && dashboard?.payroll && (
          <div className={pendingActions.length > 0 ? 'xl:col-span-4' : 'xl:col-span-3'}>
            <DashboardPanel
              title="Payroll overview"
              description="Authorized payroll distribution for current cycle"
              icon={WalletCards}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Gross', dashboard.payroll.gross, 'Total earnings', 'blue'],
                  ['Net', dashboard.payroll.net, 'Take-home total', 'teal'],
                  ['Overtime', dashboard.payroll.ot_amount, 'Extra hours', 'violet'],
                  ['Deductions', dashboard.payroll.total_deductions, 'Statutory & tax', 'amber'],
                ].filter(([, value]) => value !== undefined).map(([label, value, subtext, tone]) => (
                  <DashboardStatCard
                    key={label}
                    label={label}
                    value={formatCurrency(value)}
                    subtext={subtext}
                    tone={tone}
                  />
                ))}
              </div>

              {dashboard.payroll.plant_wise?.length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="mb-3 uppercase text-[11px] font-bold tracking-wider text-(--color-text-muted)">
                    Gross payroll by operational plant
                  </p>
                  <DashboardBarList
                    items={dashboard.payroll.plant_wise.map((item) => ({ ...item, label: item.plant_name }))}
                    valueKey="gross"
                    formatter={formatCurrency}
                    tone="blue"
                  />
                </div>
              )}
            </DashboardPanel>
          </div>
        )}

        {/* Statutory Contributions */}
        {canViewStatutory && dashboard?.statutory && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel
              title="Statutory contributions"
              description="PF, ESI and labor welfare compliance"
              icon={ShieldCheck}
            >
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {[
                  ['ESI', dashboard.statutory.esi, 'Medical insurance', 'teal'],
                  ['PF', dashboard.statutory.pf, 'Provident fund', 'blue'],
                  ['LWF', dashboard.statutory.lwf, 'Labor welfare', 'amber'],
                ].map(([label, metric, subtext, tone]) => {
                  const badgeToneStyles = {
                    teal: 'bg-gradient-to-br from-emerald-400/30 to-teal-500/10 text-teal-700 dark:text-teal-300 ring-emerald-400/30',
                    blue: 'bg-gradient-to-br from-sky-400/30 to-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-400/30',
                    amber: 'bg-gradient-to-br from-amber-400/30 to-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-400/30',
                  };

                  return (
                    <div
                      key={label}
                      className="group relative overflow-hidden rounded-2xl border border-white/15 dark:border-white/10 border-t-white/30 dark:border-t-white/20 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/[0.04] dark:to-white/[0.01] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent"
                      />
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="uppercase text-[11px] font-bold tracking-wider text-(--color-text-muted)">
                          {label}
                        </span>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 shadow-xs ${badgeToneStyles[tone] ?? 'bg-white/20 text-(--color-accent) ring-white/20'}`}>
                          <ShieldCheck size={14} aria-hidden="true" />
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-black tracking-tight text-(--color-text) tabular-nums">
                        {formatCurrency(metric?.total_amount)}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-xs font-medium text-(--color-text-muted)">
                        <span>{formatNumber(metric?.employee_count)} employees</span>
                        <span className="text-[10px] uppercase font-bold text-(--color-text-muted)/70">{subtext}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>
          </div>
        )}

        {/* Employee Deputations */}
        {canViewDeputation && dashboard?.deputation && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel
              title="Employee deputations"
              description="Cross-plant movements in this cycle"
              icon={Layers}
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Total deputations', dashboard.deputation.total, 'All transfers', 'accent'],
                  ['Active assignments', dashboard.deputation.active, 'In progress', 'teal'],
                  ['Pending action', dashboard.deputation.pending_verification, 'Awaiting approval', 'amber'],
                ].map(([label, value, subtext, tone]) => (
                  <DashboardStatCard
                    key={label}
                    label={label}
                    value={formatNumber(value)}
                    subtext={subtext}
                    tone={tone}
                  />
                ))}
              </div>

              {dashboard.deputation.plant_wise?.length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="mb-3 uppercase text-[11px] font-bold tracking-wider text-(--color-text-muted)">
                    Deputations by destination plant
                  </p>
                  <DashboardBarList
                    items={dashboard.deputation.plant_wise.map((item) => ({
                      ...item,
                      label: item.plant_name,
                      count: item.total,
                    }))}
                    formatter={formatNumber}
                    tone="accent"
                  />
                </div>
              )}
            </DashboardPanel>
          </div>
        )}

        {/* Plant Downtime */}
        {canViewDowntime && dashboard?.downtime && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel
              title="Plant downtime &amp; maintenance"
              description="Approved shutdown and maintenance events"
              icon={Wrench}
            >
              <div className="grid grid-cols-3 gap-3">
                <DashboardStatCard
                  label="Shutdown events"
                  value={formatNumber(dashboard.downtime.events)}
                  subtext="Logged stops"
                  tone="amber"
                />
                <DashboardStatCard
                  label="Total hours"
                  value={formatNumber(dashboard.downtime.hours)}
                  subtext="Guaranteed hours"
                  tone="violet"
                />
                <DashboardStatCard
                  label="Compensation"
                  value={formatCurrency(dashboard.downtime.compensation)}
                  subtext="Stipend sum"
                  tone="blue"
                />
              </div>

              {dashboard.downtime.plant_wise?.length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="mb-3 uppercase text-[11px] font-bold tracking-wider text-(--color-text-muted)">
                    Events by plant facility
                  </p>
                  <DashboardBarList
                    items={(dashboard.downtime.plant_wise ?? []).map((item) => ({
                      ...item,
                      label: item.plant_name,
                      count: item.events,
                    }))}
                    formatter={(value) => `${formatNumber(value)} events`}
                    tone="amber"
                  />
                </div>
              )}
            </DashboardPanel>
          </div>
        )}
      </div>

      {/* ── Tier 5: Quick Navigation Shortcuts (Footer Strip) ─────────────────── */}
      {quickLinks.length > 0 && (
        <DashboardPanel
          title="Quick Navigation"
          description="Direct access to primary workforce modules"
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(({ label, detail, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 border-t-white/40 dark:border-t-white/20 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/10 dark:to-white/[0.02] p-4 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-white/35 hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) motion-reduce:transform-none"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
                />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-(--color-accent)/25 via-(--color-accent)/15 to-(--color-accent)/5 text-(--color-accent) ring-1 ring-white/30 dark:ring-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1.5px_1px_rgba(255,255,255,0.5)] transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-(--color-text)">{label}</span>
                  <span className="block truncate text-xs font-medium text-(--color-text-muted)">{detail}</span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 dark:border-white/10 bg-white/10 text-(--color-text-muted) shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-white/25 group-hover:text-(--color-accent)">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </DashboardPanel>
      )}

      {/* Restricted Access Fallback */}
      {!canViewEmployees && !canViewAttendance && !canViewPayroll && !canViewStatutory && !canViewAdvances && !canViewDeputation && !canViewDowntime && pendingActions.length === 0 && (
        <GlassCard className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 border-t-white/35 bg-gradient-to-b from-white/15 to-white/5 dark:from-white/10 dark:to-black/35 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-(--color-accent)/25 to-(--color-accent)/10 text-(--color-accent) ring-1 ring-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1.5px_1px_rgba(255,255,255,0.5)]">
            <ShieldCheck size={26} aria-hidden="true" />
          </div>
          <div className="mx-auto mt-4 max-w-2xl text-center">
            <h2 className="text-lg font-black tracking-tight text-(--color-text)">
              Dashboard access active; workforce modules restricted
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-(--color-text-muted)">
              Your account has view access to this dashboard, but specific workforce submodules (Attendance, Payroll, Employees) require additional permissions. Contact your system administrator to activate view access for the modules below:
            </p>
          </div>
          <ul className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missingDashboardModules.map(({ label, permission }) => (
              <li
                key={label}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/[0.02] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                <span className="truncate text-sm font-bold text-(--color-text)">{label}</span>
                <code className="shrink-0 rounded-lg bg-black/10 dark:bg-black/40 px-2 py-0.5 text-right text-[11px] font-mono text-(--color-text-muted)">
                  {permission}
                </code>
              </li>
            ))}
          </ul>
          {canModule('roles', 'view') && (
            <div className="mt-6 flex justify-center">
              <Link
                to="/roles"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-gradient-to-b from-white/20 to-white/10 px-5 py-2.5 text-sm font-extrabold text-(--color-accent) shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
              >
                <FileCheck2 size={16} aria-hidden="true" />
                Manage Roles &amp; Permissions
              </Link>
            </div>
          )}
        </GlassCard>
      )}

      {/* Scoped Access Footer Notice */}
      {dashboard && quickLinks.length > 0 && (
        <p className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-(--color-text-muted)">
          <Building2 size={14} aria-hidden="true" className="text-(--color-accent)" />
          Data is scoped by your assigned plant permissions and active role authorizations.
          <span className="sr-only">Current user scope applies to all displayed metrics.</span>
        </p>
      )}
    </div>
  );
};

export default Dashboard;
