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
  RefreshCw,
  ShieldCheck,
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
  DashboardBarList,
  DashboardEmpty,
  DashboardMetric,
  DashboardPanel,
  DashboardSkeleton,
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
}) => (
  <div className="flex flex-wrap items-end gap-2">
    <div className="min-w-36 flex-1 sm:flex-none">
      <SearchableSelect
        label="Overview period"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'month', label: 'Month' },
          { value: 'financial_year', label: 'Financial year' },
          { value: 'custom', label: 'Custom range' },
        ]}
        value={period}
        onChange={onPeriodChange}
        btnClass="min-h-10 rounded-lg"
      />
    </div>

    {canSelectPlants && (
      <div className="min-w-44 flex-1 sm:flex-none">
        <SearchableSelect
          label="Plants"
          ariaLabel="Filter dashboard by plants"
          options={plantOptions}
          value={plantIds}
          onChange={onPlantIdsChange}
          placeholder="All accessible plants"
          isLoading={plantsLoading}
          disabled={Boolean(plantsError)}
          multiSelect
          showSearch
          btnClass="min-h-10 rounded-lg"
        />
        {plantsError && (
          <p role="alert" className="mt-1 text-xs text-(--color-danger)">
            {getErrorMessage(plantsError)}
          </p>
        )}
      </div>
    )}

    {period === 'month' && (
      <div>
        <InputField
          label="Month"
          aria-label="Dashboard month"
          type="month"
          value={month}
          onChange={(event) => {
            if (event.target.value) onMonthChange(event.target.value);
          }}
          className="h-10"
        />
      </div>
    )}

    {period === 'financial_year' && (
      <div>
        <SearchableSelect
          label="Financial year"
          ariaLabel="Financial year start"
          options={Array.from({ length: 8 }, (_, index) => {
            const year = new Date().getFullYear() - index;
            return {
              value: `${year}-${String((year + 1) % 100).padStart(2, '0')}`,
              label: `${year}-${String((year + 1) % 100).padStart(2, '0')}`,
            };
          })}
          value={financialYear}
          onChange={onFinancialYearChange}
          btnClass="min-h-10 rounded-lg"
        />
      </div>
    )}

    {period === 'custom' && (
      <>
        <div>
          <InputField
            label="From"
            aria-label="Custom range start date"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => {
              if (event.target.value) onStartDateChange(event.target.value);
            }}
            className="h-10"
          />
        </div>
        <div>
          <InputField
            label="To"
            aria-label="Custom range end date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => {
              if (event.target.value) onEndDateChange(event.target.value);
            }}
            className="h-10"
          />
        </div>
      </>
    )}
  </div>
);

const getFirstName = (user) => {
  const name = user?.name ?? user?.full_name ?? '';
  return name.trim().split(/\s+/)[0] || 'there';
};

const Dashboard = () => {
  const user = useSelector(selectUser);
  const { canView } = usePermission('/');
  const { can: canModule } = usePermission();
  const [period, setPeriod] = useState('month');
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
  const plantOptions = useMemo(
    () => {
      const plants = Array.isArray(plantsResponse?.data)
        ? plantsResponse.data
        : Array.isArray(plantsResponse) ? plantsResponse : [];
      return plants.map((plant) => ({ value: String(plant.id), label: plant.name }));
    },
    [plantsResponse],
  );

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
    skip: !canView || (period === 'custom' && (!startDate || !endDate || startDate > endDate)),
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
  // console.log('dashboard', dashboard);
  // console.log('attendanceSummary', attendanceSummary);
  const attendanceTotal = attendanceSummary.reduce((total, item) => total + (Number(item.count) || 0), 0);
  // console.log('attendanceTotal', attendanceTotal, 'dashboard?.summary?.present', dashboard?.summary?.present);
  const attendanceRate = attendanceTotal
    ? Math.round(((Number(dashboard?.summary?.present) || 0) / attendanceTotal) * 100)
    : 0;
// console.log('attendanceRate', attendanceRate, 'dashboard?.summary?.present', dashboard?.summary?.present, 'attendanceTotal', attendanceTotal);
  if (!canView) return <AccessDenied pageName="the dashboard" routePath="/" />;

  const quickLinks = [
    canModule('employees', 'view') && { label: 'Employees', detail: 'Workforce directory', path: '/employees', icon: Users },
    canModule('attendance', 'view') && { label: 'Attendance', detail: 'Daily attendance', path: '/attendance', icon: CalendarDays },
    canModule('salary-report', 'view') && { label: 'Payroll reports', detail: 'Salary and payroll', path: '/reports/salary', icon: WalletCards },
    canModule('advances', 'view') && { label: 'Advances', detail: 'Employee advances', path: '/advances', icon: Banknote },
  ].filter(Boolean);

  if (isLoading && !dashboard) {
    return (
      <div className="space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="h-20 animate-pulse rounded-2xl bg-(--color-accent-soft) motion-reduce:animate-none" />
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
          action={<Button variant="ghost" onClick={() => refetch()}><RefreshCw size={15} /> Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-8 sm:p-6 lg:p-8">
      <GlassCard className="relative overflow-hidden p-5 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full bg-(--color-accent-soft) blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-xl">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-(--color-text) sm:text-3xl">
              <Activity size={20} aria-hidden="true" /> Good Day, {getFirstName(user)}
            </h1>
            {dashboard?.filters?.label && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-(--color-text-muted)">
                <CalendarDays size={14} aria-hidden="true" /> {dashboard.filters.label}
                {/* {dashboard?.user_role && <span className="ml-1 rounded-full bg-(--color-accent-soft) px-2 py-0.5 capitalize text-(--color-accent)">{dashboard.user_role}</span>} */}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between xl:justify-end">
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
              aria-label="Refresh dashboard"
              className="h-10 min-h-10 shrink-0 px-3"
            >
              <RefreshCw size={15} className={manualRefreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>
        {isLoading && <div className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-(--color-accent) motion-reduce:animate-none" aria-label="Loading dashboard" />}
      </GlassCard>

      {isError && dashboard && (
        <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Dashboard refresh failed: {getErrorMessage(error)} The last loaded data is still shown.
        </div>
      )}

      <section aria-label="Key workforce metrics" className="grid grid-cols-1 gap-3 :grid-cols-4 xl:grid-cols-6">
        {canViewEmployees && (
          <DashboardMetric
            icon={Users}
            label="Total employees"
            value={formatNumber(dashboard?.summary?.workforce_total_employees ?? dashboard?.summary?.total_employees)}
            breakdown={[
              { label: 'Active', value: formatNumber(dashboard?.summary?.active_employees ?? dashboard?.summary?.total_employees) },
              { label: 'Inactive', value: formatNumber(dashboard?.summary?.inactive_employees) },
            ]}
            tone="accent"
          />
        )}
        {canViewAttendance && (
          <DashboardMetric
            icon={CheckCircle2}
            label="Present"
            value={formatNumber(dashboard?.summary?.present)}
            detail={attendanceTotal ? `${attendanceRate}% of attendance records` : 'No attendance recorded'}
            tone="teal"
          />
        )}
        {canViewAttendance && (
          <DashboardMetric
            icon={Clock3}
            label="Pending verification"
            value={formatNumber(dashboard?.summary?.pending_verification)}
            detail="Attendance records to review"
            tone="amber"
          />
        )}
        {canViewPayroll && dashboard?.payroll && (
          <DashboardMetric
            icon={Banknote}
            label={dashboard.payroll.net !== undefined ? 'Net payroll' : 'Overtime cost'}
            value={formatCurrency(dashboard.payroll.net ?? dashboard.payroll.ot_amount)}
            detail={dashboard.payroll.net !== undefined ? `Gross ${formatCurrency(dashboard.payroll.gross)}` : 'Operational estimate'}
            tone="blue"
          />
        )}
        {canViewAttendance && dashboard?.summary?.total_ot_hours !== undefined && (
          <DashboardMetric
            icon={Activity}
            label="Overtime hours"
            value={formatNumber(dashboard.summary.total_ot_hours)}
            detail="Recorded in this period"
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">

        {canViewAttendance && dashboard?.attendance && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-2">
            <DashboardPanel
              title="Attendance snapshot"
              description="Status distribution across your permitted workforce"
              action={<span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">{attendanceRate}% present</span>}
            >
              {attendanceTotal ? (
                <>
                  <div
                    className="mb-5 flex h-3 overflow-hidden rounded-full bg-(--color-accent-soft)"
                    role="img"
                    aria-label={attendanceSummary.map((item) => `${item.label}: ${formatNumber(item.count)}`).join(', ')}
                  >
                    {attendanceSummary.filter((item) => Number(item.count) > 0).map((item) => {
                      const styles = {
                        present: 'bg-teal-500',
                        absent: 'bg-rose-500',
                        partial: 'bg-amber-500',
                        on_leave: 'bg-violet-500',
                        holiday: 'bg-sky-500',
                        weekly_off: 'bg-slate-400',
                      };
                      return (
                        <span
                          key={item.status}
                          className={`${styles[item.status] ?? 'bg-(--color-accent)'} transition-[width] duration-500 motion-reduce:transition-none`}
                          style={{ width: `${(Number(item.count) / attendanceTotal) * 100}%` }}
                          title={`${item.label}: ${formatNumber(item.count)}`}
                        />
                      );
                    })}
                  </div>
                  <DashboardBarList
                    items={attendanceSummary
                      .filter((item) => Number(item.count) > 0)
                      .map((item) => ({ ...item, label: item.label, count: Number(item.count) }))}
                    formatter={formatNumber}
                  />
                </>
              ) : <DashboardEmpty message="No attendance activity for the selected period." />}
            </DashboardPanel>
          </div>
        )}
        {canViewAttendance && dashboard?.attendance && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-2">
            <DashboardPanel title="Plant attendance" description="Attendance records grouped by working plant">
              <DashboardBarList
                items={(dashboard.attendance.plant_wise ?? []).map((item) => ({ ...item, label: item.plant_name, count: item.present }))}
                formatter={(value) => `${formatNumber(value)} present`}
              />
            </DashboardPanel>
          </div>
        )}
        {pendingActions.length > 0 && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-2">
            <DashboardPanel
              title="Needs your attention"
              description="Pending workflows visible to your role"
              action={<span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">{formatNumber(pendingTotal)} pending</span>}
              className="p-0 sm:p-0 pb-2 sm:pb-2"
            >
              <ul className="divide-y divide-(--color-border)">
                {pendingActions.map((action) => {
                  const link = ACTION_LINKS[action.type];
                  const accessibleLink = link?.path && permissionCheck(canModule, link.linkModules ?? link.modules);
                  const content = (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <ClipboardCheck size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-(--color-text)">{action.title}</span>
                        <span className="mt-0.5 block text-xs text-(--color-text-muted)">{formatNumber(action.count)} item{Number(action.count) === 1 ? '' : 's'}</span>
                      </span>
                      {accessibleLink && <ArrowRight size={16} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />}
                    </>
                  );

                  return (
                    <li key={action.type} >
                      {accessibleLink ? (
                        <Link to={link.path} className="flex items-center gap-3 p-2 px-4 transition-colors hover:bg-(--color-accent-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)">
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg p-2">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </DashboardPanel>
          </div>
        )}

        {canViewPayroll && dashboard?.payroll && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel title="Payroll overview" description="Authorized payroll totals for the selected period">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Gross', dashboard.payroll.gross],
                  ['Net', dashboard.payroll.net],
                  ['Overtime', dashboard.payroll.ot_amount],
                  ['Deductions', dashboard.payroll.total_deductions],
                ].filter(([, value]) => value !== undefined).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/70 p-3">
                    <p className="text-xs text-(--color-text-muted)">{label}</p>
                    <p className="mt-1 truncate text-sm font-bold text-(--color-text)" title={formatCurrency(value)}>{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>
              {dashboard.payroll.plant_wise?.length > 0 && (
                <div className="mt-5 border-t border-(--color-border) pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Gross payroll by plant</p>
                  <DashboardBarList
                    items={dashboard.payroll.plant_wise.map((item) => ({ ...item, label: item.plant_name }))}
                    valueKey="gross"
                    formatter={formatCurrency}
                  />
                </div>
              )}
              {!dashboard.payroll.plant_wise?.length && dashboard.payroll.net === undefined && (
                <p className="mt-4 text-xs text-(--color-text-muted)">Payroll totals are not available for this operational period.</p>
              )}
            </DashboardPanel>
          </div>
        )}

        {canViewStatutory && dashboard?.statutory && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel title="Statutory contributions" description="PF and ESI totals for the selected period">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['ESI', dashboard.statutory.esi],
                  ['PF', dashboard.statutory.pf],
                ].map(([label, metric]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/70 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-accent-soft) text-(--color-accent)">
                        <ShieldCheck size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-(--color-text)">{label}</p>
                        <p className="text-xs text-(--color-text-muted)">{formatNumber(metric?.employee_count)} employees</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-(--color-text)">{formatCurrency(metric?.total_amount)}</p>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>
        )}

        {canViewDeputation && dashboard?.deputation && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-2">
            <DashboardPanel title="Employee deputations" description="Cross-plant workforce movement in the selected period">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Total', dashboard.deputation.total],
                  ['Active', dashboard.deputation.active],
                  ['Pending', dashboard.deputation.pending_verification],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-(--color-accent-soft) p-3 text-center">
                    <p className="text-lg font-bold text-(--color-text)">{formatNumber(value)}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">{label}</p>
                  </div>
                ))}
              </div>
              {dashboard.deputation.plant_wise?.length > 0 && (
                <div className="mt-4">
                  <DashboardBarList
                    items={dashboard.deputation.plant_wise.map((item) => ({ ...item, label: item.plant_name, count: item.total }))}
                    formatter={formatNumber}
                  />
                </div>
              )}
            </DashboardPanel>
          </div>
        )}

        {canViewDowntime && dashboard?.downtime && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel title="Plant downtime" description="Approved shutdown activity within this period">
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                  ['Events', dashboard.downtime.events],
                  ['Hours', dashboard.downtime.hours],
                  ['Compensation', formatCurrency(dashboard.downtime.compensation)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-(--color-accent-soft) p-3">
                    <p className="truncate text-base font-bold text-(--color-text)">{typeof value === 'string' ? value : formatNumber(value)}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">{label}</p>
                  </div>
                ))}
              </div>
              <DashboardBarList
                items={(dashboard.downtime.plant_wise ?? []).map((item) => ({ ...item, label: item.plant_name, count: item.events }))}
                formatter={(value) => `${formatNumber(value)} events`}
              />
            </DashboardPanel>
          </div>
        )}

        {quickLinks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 xl:col-span-3">
            <DashboardPanel title="Quick access" description="Go directly to the areas available to your role">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {quickLinks.map(({ label, detail, path, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className="group flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/60 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-(--color-border-strong) hover:bg-(--color-accent-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) motion-reduce:transform-none"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-accent-soft) text-(--color-accent)">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-(--color-text)">{label}</span>
                      <span className="block truncate text-xs text-(--color-text-muted)">{detail}</span>
                    </span>
                    <ArrowUpRight size={16} className="shrink-0 text-(--color-text-muted) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </DashboardPanel>
          </div>
        )}
      </div>


      {!canViewEmployees && !canViewAttendance && !canViewPayroll && !canViewStatutory && !canViewAdvances && !canViewDeputation && !canViewDowntime && pendingActions.length === 0 && (
        <GlassCard className="p-5 sm:p-7">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className="mx-auto mt-3 max-w-2xl text-center">
            <h2 className="text-base font-semibold text-(--color-text)">Dashboard access is active; workforce data is restricted</h2>
            <p className="mt-2 text-sm leading-relaxed text-(--color-text-muted)">
              The Dashboard permission lets you open this page. It does not grant access to employee, attendance, payroll, or other module data.
              Ask an administrator to assign the relevant <strong className="font-semibold text-(--color-text)">View</strong> permissions below.
            </p>
          </div>
          <ul className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {missingDashboardModules.map(({ label, permission }) => (
              <li key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/60 px-3 py-2.5">
                <span className="truncate text-sm font-medium text-(--color-text)">{label}</span>
                <code className="shrink-0 text-right text-[10px] text-(--color-text-muted)">{permission}</code>
              </li>
            ))}
          </ul>
          {canModule('roles', 'view') && (
            <div className="mt-5 flex justify-center">
              <Link
                to="/roles"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-accent) transition-colors hover:bg-(--color-accent-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
              >
                <FileCheck2 size={16} aria-hidden="true" />
                Open Roles &amp; Permissions
              </Link>
            </div>
          )}
        </GlassCard>
      )}

      {dashboard && quickLinks.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-(--color-text-muted)">
          <Building2 size={13} aria-hidden="true" />
          Data is scoped by your account permissions and assigned plant access.
          <span className="sr-only">Current user scope applies to all displayed metrics.</span>
        </p>
      )}
    </div>
  );
};

export default Dashboard;
