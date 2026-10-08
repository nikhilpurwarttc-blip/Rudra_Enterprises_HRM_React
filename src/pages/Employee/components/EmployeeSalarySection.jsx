import { useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Button from '../../../components/Button';
import { InlineError, LoadingState } from '../../../components/Feedback';
import SectionCard from '../../../components/SectionCard';

const toNextDate = (date) => {
  if (!date) return '';
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  return [
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, '0'),
    String(nextDate.getDate()).padStart(2, '0'),
  ].join('-');
};

const getErrorMessage = (error) => {
  const validationErrors = error?.data?.errors;
  if (validationErrors) {
    const firstError = Object.values(validationErrors).flat()[0];
    if (firstError) return firstError;
  }
  return error?.data?.message ?? error?.error ?? 'Unable to save the salary record. Please try again.';
};

const formatAmount = (amount) => Number(amount ?? 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const EmployeeSalarySection = ({
  employeeId,
  salaries,
  isLoading,
  isError,
  saving,
  updating,
  onRefresh,
  onSave,
  onUpdate,
}) => {
  const [monthlySalary, setMonthlySalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [includeInPayroll, setIncludeInPayroll] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const latestEffectiveFrom = useMemo(
    () => salaries.reduce((latest, salary) => (
      salary.effective_from > latest ? salary.effective_from : latest
    ), ''),
    [salaries],
  );
  const minEffectiveFrom = toNextDate(latestEffectiveFrom);

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const amount = Number(monthlySalary);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a monthly salary greater than zero.');
      return;
    }
    if (!effectiveFrom || (minEffectiveFrom && effectiveFrom < minEffectiveFrom)) {
      setError(`Choose an effective-from date on or after ${minEffectiveFrom || 'a valid date'}.`);
      return;
    }

    try {
      await onSave({
        employee_id: employeeId,
        salary_type: 'monthly',
        monthly_salary: amount,
        effective_from: effectiveFrom,
        status: includeInPayroll ? 1 : 0,
      });
      setMonthlySalary('');
      setEffectiveFrom('');
      setIncludeInPayroll(true);
      setSuccess('Salary entry saved.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const handleStatusChange = async (salary, checked) => {
    setError('');
    setSuccess('');
    try {
      await onUpdate({ id: salary.id, status: checked ? 1 : 0 });
      setSuccess('Payroll inclusion updated.');
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Salary history · ${salaries.length} entries`}
        action={(
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-1"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh salary history"
          >
            <RefreshCw size={14} /> Refresh
          </Button>
        )}
      >
        {isLoading ? (
          <LoadingState message="Loading salary history…" />
        ) : isError ? (
          <InlineError message="Salary history could not be loaded. Use refresh to try again." />
        ) : salaries.length === 0 ? (
          <p className="text-sm text-(--color-text-muted)">No salary entries have been submitted for this employee.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-(--color-border) text-xs uppercase text-(--color-text-muted)">
                <tr>
                  <th scope="col" className="py-2 pr-3">Payroll</th>
                  <th scope="col" className="py-2 pr-3">Monthly salary</th>
                  <th scope="col" className="py-2 pr-3">Effective from</th>
                  <th scope="col" className="py-2 pr-3">Effective to</th>
                  <th scope="col" className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {salaries.map((salary) => {
                  const isActive = Number(salary.status) === 1;
                  return (
                    <tr key={salary.id}>
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(event) => handleStatusChange(salary, event.target.checked)}
                          disabled={updating || isLoading || isError}
                          aria-label={`Include salary effective ${salary.effective_from} in payroll charges and deductions`}
                          className="h-4 w-4 accent-primary-600"
                        />
                      </td>
                      <td className="py-3 pr-3 font-medium text-(--color-text)">₹{formatAmount(salary.monthly_salary)}</td>
                      <td className="py-3 pr-3 text-(--color-text-muted)">{salary.effective_from}</td>
                      <td className="py-3 pr-3 text-(--color-text-muted)">{salary.effective_to || 'Ongoing'}</td>
                      <td className="py-3 text-(--color-text-muted)">{isActive ? 'Included' : 'Excluded'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-(--color-text-muted)">
          When a new included salary starts, the previous included salary ends the day before its effective-from date.
        </p>
      </SectionCard>

      <SectionCard title="Add salary / increment">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-(--color-text)">
              Monthly salary (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monthlySalary}
                onChange={(event) => setMonthlySalary(event.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
              />
            </label>
            <label className="block text-sm font-medium text-(--color-text)">
              Effective from
              <input
                type="date"
                min={minEffectiveFrom || undefined}
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-(--color-text)">
            <input
              type="checkbox"
              checked={includeInPayroll}
              onChange={(event) => setIncludeInPayroll(event.target.checked)}
              className="h-4 w-4 accent-primary-600"
            />
            Include this salary in payroll charges and deductions
          </label>
          {error && <InlineError message={error} />}
          {success && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || isLoading || isError} className="flex items-center gap-2">
              <Plus size={15} /> {saving ? 'Saving salary…' : 'Add salary / increment'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};

export default EmployeeSalarySection;
