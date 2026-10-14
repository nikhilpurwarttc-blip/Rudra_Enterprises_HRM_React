import { useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, RefreshCw, WalletCards } from 'lucide-react';
import Button from '../../components/Button';
import GlassCard from '../../components/GlassCard';
import { Feedback, InlineError, LoadingState } from '../../components/Feedback';
import InputField from '../../components/InputField';
import usePermission from '../../hooks/usePermission';
import { useGetMonthlySalaryReportQuery } from '../../store/api';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const formatHours = (value) => `${new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
}).format(Number(value) || 0)} hrs`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
};

const formatPaymentMode = (value) => {
  if (!value) return '—';
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

const SalaryLine = ({ label, value, emphasized = false }) => (
  <div className={`flex items-center justify-between gap-4 py-2 ${emphasized ? 'font-semibold text-(--color-text)' : 'text-(--color-text-muted)'}`}>
    <dt>{label}</dt>
    <dd className="text-right tabular-nums">{value}</dd>
  </div>
);

const EmployeeSalary = ({ employee }) => {
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const { canView: canViewSalaryReport } = usePermission('/reports/salary');
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(payrollMonth);
  const [year, month] = validMonth ? payrollMonth.split('-').map(Number) : [undefined, undefined];
  const reportQuery = useGetMonthlySalaryReportQuery(
    { employee_id: employee?.id, year, month },
    { skip: !employee?.id || !validMonth || !canViewSalaryReport },
  );

  const reportData = reportQuery.data?.data;
  const salary = useMemo(
    () => reportData?.items?.find((item) => String(item.employee_id) === String(employee?.id)) ?? null,
    [reportData, employee?.id],
  );
  const monthLabel = validMonth
    ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
      .format(new Date(`${payrollMonth}-01T00:00:00`))
    : 'Selected month';

  if (!canViewSalaryReport) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-4 sm:p-6">
        <Feedback
          type="error"
          title="Salary report permission required"
          message="You need Salary Report view permission to access paid salary slips."
        />
      </div>
    );
  }

  const deductions = salary?.charge_breakdown?.filter((charge) => Number(charge.amount) > 0) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-accent-soft) text-(--color-accent)">
            <WalletCards size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-(--color-text)">Salary slip</h2>
            <p className="text-xs text-(--color-text-muted)">{employee?.name} · {employee?.employee_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InputField
            label="Payroll month"
            type="month"
            value={payrollMonth}
            onChange={(event) => setPayrollMonth(event.target.value)}
            className="min-w-40"
            max={currentMonth()}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => reportQuery.refetch()}
            disabled={reportQuery.isFetching || !validMonth}
            aria-label="Refresh salary slip"
            title="Refresh salary slip"
            className="h-11 w-11 p-0"
          >
            <RefreshCw size={16} className={reportQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {reportQuery.isError && (
        <InlineError
          message={reportQuery.error?.data?.message ?? 'Unable to load the salary slip. Please try again.'}
        />
      )}

      {reportQuery.isLoading || reportQuery.isFetching ? (
        <LoadingState message="Loading salary slip..." />
      ) : reportQuery.isError ? null : salary?.is_paid ? (
        <GlassCard className="mx-auto w-full max-w-3xl overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-(--color-border) bg-(--color-accent-soft)/40 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Payroll statement</p>
              <h3 className="mt-1 text-xl font-semibold text-(--color-text)">{monthLabel}</h3>
              <p className="mt-1 text-sm text-(--color-text-muted)">
                {salary.employee_name} · {salary.employee_code}
              </p>
              <p className="text-sm text-(--color-text-muted)">
                {salary.designation_name || '—'} · {salary.working_plant_name || salary.home_plant_name || '—'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <BadgeCheck size={14} aria-hidden="true" /> Paid
            </span>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <section className="rounded-lg border border-(--color-border) p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-(--color-text)">
                <CalendarDays size={15} className="text-(--color-accent)" aria-hidden="true" /> Attendance
              </h4>
              <dl className="divide-y divide-(--color-border) text-sm">
                <SalaryLine label="Present days" value={salary.present_days ?? 0} />
                <SalaryLine label="Basic hours" value={formatHours(salary.regular_hours)} />
                <SalaryLine label="Overtime hours" value={formatHours(salary.overtime_hours)} />
                <SalaryLine label="Total hours" value={formatHours(Number(salary.regular_hours || 0) + Number(salary.overtime_hours || 0))} />
              </dl>
            </section>

            <section className="rounded-lg border border-(--color-border) p-4">
              <h4 className="mb-2 text-sm font-semibold text-(--color-text)">Earnings</h4>
              <dl className="divide-y divide-(--color-border) text-sm">
                <SalaryLine label="Base salary" value={formatCurrency(salary.base_salary)} />
                <SalaryLine label="Basic pay" value={formatCurrency(salary.regular_pay)} />
                <SalaryLine label="Overtime pay" value={formatCurrency(salary.overtime_pay)} />
                <SalaryLine label="Auto pay / shutdown pay" value={formatCurrency(Number(salary.furnace_allowance || 0) + Number(salary.shutdown_pay || 0))} />
                {Number(salary.other_additions) > 0 && (
                  <SalaryLine label="Other additions" value={formatCurrency(salary.other_additions)} />
                )}
                <SalaryLine label="Gross pay" value={formatCurrency(salary.gross_salary)} emphasized />
              </dl>
            </section>

            <section className="rounded-lg border border-(--color-border) p-4 sm:col-span-2">
              <h4 className="mb-2 text-sm font-semibold text-(--color-text)">Deductions</h4>
              <dl className="divide-y divide-(--color-border) text-sm">
                {deductions.length ? deductions.map((charge) => (
                  <SalaryLine key={charge.id ?? charge.name} label={charge.name} value={formatCurrency(charge.amount)} />
                )) : (
                  <>
                    {Number(salary.pf_amount) > 0 && <SalaryLine label="Provident Fund" value={formatCurrency(salary.pf_amount)} />}
                    {Number(salary.esi_amount) > 0 && <SalaryLine label="ESI" value={formatCurrency(salary.esi_amount)} />}
                    {Number(salary.other_deductions) > 0 && <SalaryLine label="Other deductions" value={formatCurrency(salary.other_deductions)} />}
                  </>
                )}
                {Number(salary.cash_advance) > 0 && <SalaryLine label="Cash advance" value={formatCurrency(salary.cash_advance)} />}
                {Number(salary.bank_advance) > 0 && <SalaryLine label="Bank advance" value={formatCurrency(salary.bank_advance)} />}
                <SalaryLine label="Total deductions" value={formatCurrency(salary.total_deductions)} emphasized />
              </dl>
            </section>

            <section className="rounded-lg border border-emerald-600/20 bg-emerald-500/5 p-4 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-(--color-text-muted)">Net paid</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(salary.net_salary)}</p>
                </div>
                <div className="text-right text-xs text-(--color-text-muted)">
                  <p>{formatPaymentMode(salary.payment_mode)}</p>
                  {salary.payment_reference && <p>Reference: {salary.payment_reference}</p>}
                  <p>Paid {formatDate(salary.paid_at)}</p>
                </div>
              </div>
            </section>
          </div>
        </GlassCard>
      ) : (
        <Feedback
          type="empty"
          title="No paid salary slip for this month"
          message={`${employee?.name ?? 'This employee'} does not have a recorded paid payroll for ${monthLabel}.`}
        />
      )}
    </div>
  );
};

export default EmployeeSalary;
