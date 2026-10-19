import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  FileCheck2,
  Landmark,
  Pencil,
  ShieldCheck,
  WalletCards,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetEmployeeBankAccountsQuery,
  useGetEmployeeByIdQuery,
  useGetEmployeeDocumentsQuery,
  useGetEmployeeSalaryHistoryQuery,
} from '../../store/api';
import { Feedback, LoadingState } from '../../components/Feedback';
import Button from '../../components/Button';
import GlassCard from '../../components/GlassCard';
import usePermission from '../../hooks/usePermission';
import { useRenderPerformance } from '../../utils/performance';
import EmployeeApprovalActions from './components/EmployeeApprovalActions';
import EmployeeAvatar from './components/EmployeeAvatar';
import EmployeeBarcode from './components/EmployeeBarcode';
import { displayDate } from './utils/employeeForm.utils';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const unwrap = (value) => value?.data ?? value;
const unwrapList = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : [];
};
const formatAmount = (amount) => `₹${Number(amount ?? 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const formatChargeValue = (value, valueType) => (
  valueType === 'percentage' ? `${Number(value ?? 0)}%` : formatAmount(value)
);
const isSafeUrl = (url) => /^https?:\/\//i.test(String(url ?? ''));
const isActive = (value) => value === true || value === 1 || value === '1' || value === 'true';
const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
const getCurrentEffectiveSalary = (salaries, today) => salaries
  .filter((salary) => {
    const effectiveFrom = String(salary.effective_from ?? '').slice(0, 10);
    const effectiveTo = String(salary.effective_to ?? '').slice(0, 10);
    return effectiveFrom
      && effectiveFrom <= today
      && (!effectiveTo || effectiveTo >= today);
  })
  .sort((left, right) =>
    String(right.effective_from ?? '').localeCompare(String(left.effective_from ?? '')),
  )[0] ?? null;

const ProfileSection = ({ icon: Icon, title, description, action, children, className = '' }) => (
  <section className={`rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/70 p-4 sm:p-5 ${className}`}>
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-accent-soft) text-(--color-accent)">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-(--color-text)">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-(--color-text-muted)">{description}</p>}
        </div>
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Detail = ({ label, value, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-xs text-(--color-text-muted)">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium text-(--color-text)">{value || '—'}</dd>
  </div>
);

const EmployeeProfile = ({ employeeId, initialEmployee, embedded = false, onClose }) => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const id = employeeId ?? routeId;
  const { data, isLoading, isError } = useGetEmployeeByIdQuery(id, { skip: !id });
  const fetched = unwrap(data);
  const employee = fetched ?? initialEmployee ?? null;
  const { canEdit, isReadOnly, can } = usePermission('/employees');
  const canViewSalary = can('approve');
  const employeeRecordId = employee?.id;
  const {
    data: documentsResponse,
    isLoading: documentsLoading,
    isError: documentsError,
  } = useGetEmployeeDocumentsQuery(employeeRecordId, { skip: !employeeRecordId });
  const {
    data: accountsResponse,
    isLoading: accountsLoading,
    isError: accountsError,
  } = useGetEmployeeBankAccountsQuery(employeeRecordId, { skip: !employeeRecordId });
  const {
    data: salariesResponse,
    isLoading: salariesLoading,
    isError: salariesError,
  } = useGetEmployeeSalaryHistoryQuery(employeeRecordId, {
    skip: !employeeRecordId || !canViewSalary || Number(employee?.approval_status) !== 1,
  });
  useRenderPerformance('getEmployeeById', data);
  const close = onClose ?? (() => navigate('/employees'));
  const documents = unwrapList(documentsResponse);
  const accounts = unwrapList(accountsResponse);
  const salaries = unwrapList(salariesResponse);
  const currentSalary = getCurrentEffectiveSalary(salaries, getTodayDate());
  const weeklyOffDays = (employee?.weekly_off_days ?? [])
    .map(Number)
    .filter((day) => Number.isInteger(day) && WEEKDAYS[day])
    .map((day) => WEEKDAYS[day])
    .join(', ');

  if (!employee && isLoading) return <LoadingState message="Loading employee profile..." className="min-h-[60vh]" />;
  if (isError || !employee) {
    return (
      <Feedback
        type="error"
        title="Unable to load employee"
        message="The employee may no longer exist."
        action={<Button onClick={close} className="mt-2">Back to employees</Button>}
      />
    );
  }

  const approved = Number(employee.approval_status) === 1;

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-5">
      <div className="mx-auto max-w-6xl space-y-4">
        {!embedded && (
          <Button variant="ghost" onClick={close} className="flex items-center gap-2">
            <ArrowLeft size={16} /> Back to employees
          </Button>
        )}

        <GlassCard className="overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-4 bg-(--color-accent-soft) p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-4">
              <EmployeeAvatar employee={employee} className="h-16 w-16 shrink-0 text-xl" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">Employee profile</p>
                <h1 className="mt-0.5 truncate text-xl font-semibold text-(--color-text)">{employee.name}</h1>
                <p className="text-sm text-(--color-text-muted)">Employee code · {employee.employee_code || '—'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive(employee.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                    {isActive(employee.status) ? 'Active' : 'Inactive'}
                  </span>
                  {employee.approval_status_label && (
                    <span className="rounded-full border border-(--color-border) bg-(--color-bg-elevated) px-2.5 py-1 text-xs font-medium text-(--color-text-muted)">
                      {employee.approval_status_label}
                    </span>
                  )}
                  <EmployeeApprovalActions employee={employee} />
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {employee.employee_code && (
                <EmployeeBarcode
                  employeeCode={employee.employee_code}
                  employeeName={employee.name}
                  height={40}
                  width={2}
                  margin={2}
                  showMetadata={false}
                  className="hidden p-1 sm:block"
                />
              )}
              {canEdit && !isReadOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/employees/${employee.id}/edit`)}
                  className="flex items-center gap-2"
                >
                  <Pencil size={15} /> Edit
                </Button>
              )}
              {embedded && (
                <button
                  type="button"
                  aria-label="Close employee profile"
                  onClick={close}
                  className="rounded p-1 text-(--color-text-muted) hover:bg-(--color-accent-soft)"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </header>

          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
            <div className="rounded-lg border border-(--color-border) px-3 py-2.5">
              <p className="text-xs text-(--color-text-muted)">Department</p>
              <p className="mt-1 truncate text-sm font-semibold text-(--color-text)">{employee.department?.name ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-(--color-border) px-3 py-2.5">
              <p className="text-xs text-(--color-text-muted)">Designation</p>
              <p className="mt-1 truncate text-sm font-semibold text-(--color-text)">{employee.designation?.name ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-(--color-border) px-3 py-2.5">
              <p className="text-xs text-(--color-text-muted)">Plant</p>
              <p className="mt-1 truncate text-sm font-semibold text-(--color-text)">{employee.plant?.name ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-(--color-border) px-3 py-2.5">
              <p className="text-xs text-(--color-text-muted)">Joining date</p>
              <p className="mt-1 text-sm font-semibold text-(--color-text)">{displayDate(employee.joining_date)}</p>
            </div>
          </div>
        </GlassCard>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ProfileSection icon={BriefcaseBusiness} title="Employment details" description="Role, work location and schedule">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
              <Detail label="Department" value={employee.department?.name} />
              <Detail label="Designation" value={employee.designation?.name} />
              <Detail label="Plant" value={employee.plant?.name} />
              <Detail label="Shift" value={employee.shift?.name} />
              <Detail label="Joining date" value={displayDate(employee.joining_date)} />
              <Detail label="Relieving date" value={displayDate(employee.relieving_date)} />
              <Detail label="Weekly offs" value={weeklyOffDays} className="col-span-2" />
            </dl>
          </ProfileSection>

          <ProfileSection icon={ShieldCheck} title="Personal & contact" description="Personal information and contact details">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
              <Detail label="Date of birth" value={displayDate(employee.dob)} />
              <Detail label="Gender" value={employee.gender} />
              <Detail label="Marital status" value={employee.marital_status} />
              <Detail label="Mobile number" value={employee.mobile_number} />
              <Detail label="Email address" value={employee.email} className="col-span-2" />
              <Detail label="Address" value={employee.address} className="col-span-2" />
            </dl>
          </ProfileSection>

          <ProfileSection
            icon={FileCheck2}
            title="KYC documents"
            description={documentsLoading ? 'Loading submitted documents…' : `${documents.length} submitted`}
          >
            {documentsError ? (
              <p role="alert" className="text-sm text-red-600">Unable to load KYC documents.</p>
            ) : documentsLoading ? (
              <p className="text-sm text-(--color-text-muted)">Loading documents…</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-(--color-text-muted)">No KYC documents submitted.</p>
            ) : (
              <ul className="divide-y divide-(--color-border)">
                {documents.map((document) => (
                  <li key={document.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-(--color-text)">{document.document_type || 'Document'}</p>
                      <p className="mt-0.5 truncate text-xs text-(--color-text-muted)">{document.document_number || 'Number not provided'}</p>
                    </div>
                    {document.document_file && isSafeUrl(document.document_file) && (
                      <a
                        href={document.document_file}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-(--color-accent) hover:bg-(--color-accent-soft)"
                      >
                        View file
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ProfileSection>

          <ProfileSection
            icon={Landmark}
            title="Bank details"
            description={accountsLoading ? 'Loading bank accounts…' : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
          >
            {accountsError ? (
              <p role="alert" className="text-sm text-red-600">Unable to load bank accounts.</p>
            ) : accountsLoading ? (
              <p className="text-sm text-(--color-text-muted)">Loading bank accounts…</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-(--color-text-muted)">No bank accounts submitted.</p>
            ) : (
              <ul className="divide-y divide-(--color-border)">
                {accounts.map((account) => (
                  <li key={account.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-(--color-text)">{account.bank_name || 'Bank account'}</p>
                      {isActive(account.is_primary) && (
                        <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[11px] font-medium text-(--color-accent)">Primary</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-(--color-text-muted)">{account.account_holder_name || 'Account holder not provided'}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">
                      Account ••••{String(account.account_number ?? '').slice(-4)}
                      {account.ifsc_code ? ` · IFSC ${account.ifsc_code}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ProfileSection>

          {canViewSalary && (
            <ProfileSection
              icon={WalletCards}
              title="Salary information"
              description={salariesLoading ? 'Loading salary history…' : `${salaries.length} salary entr${salaries.length === 1 ? 'y' : 'ies'}`}
              className="lg:col-span-2"
            >
              {!approved ? (
                <p className="text-sm text-(--color-text-muted)">Salary details are available after employee approval.</p>
              ) : salariesError ? (
                <p role="alert" className="text-sm text-red-600">Unable to load salary information.</p>
              ) : salariesLoading ? (
                <p className="text-sm text-(--color-text-muted)">Loading salary information…</p>
              ) : salaries.length === 0 ? (
                <p className="text-sm text-(--color-text-muted)">No salary records have been added.</p>
              ) : (
                <>
                  {currentSalary ? (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-(--color-accent-soft) px-4 py-3">
                      <div>
                        <p className="text-xs text-(--color-text-muted)">Current monthly salary</p>
                        <p className="mt-0.5 text-xl font-semibold text-(--color-text)">{formatAmount(currentSalary.monthly_salary)}</p>
                      </div>
                      <p className="text-xs text-(--color-text-muted)">
                        Effective {displayDate(currentSalary.effective_from)}
                        {currentSalary.effective_to ? ` – ${displayDate(currentSalary.effective_to)}` : ' · Ongoing'}
                      </p>
                    </div>
                  ) : (
                    <p className="mb-4 rounded-lg bg-(--color-accent-soft) px-4 py-3 text-sm text-(--color-text-muted)">
                      No salary record is effective today.
                    </p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                        <tr>
                          <th scope="col" className="py-2 pr-4 font-medium">Monthly salary</th>
                          <th scope="col" className="py-2 pr-4 font-medium">Effective from</th>
                          <th scope="col" className="py-2 pr-4 font-medium">Effective to</th>
                          <th scope="col" className="py-2 font-medium">Payroll</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-(--color-border)">
                        {salaries.map((salary) => (
                          <tr key={salary.id}>
                            <td className="py-2.5 pr-4 font-medium text-(--color-text)">{formatAmount(salary.monthly_salary)}</td>
                            <td className="py-2.5 pr-4 text-(--color-text-muted)">{displayDate(salary.effective_from)}</td>
                            <td className="py-2.5 pr-4 text-(--color-text-muted)">{salary.effective_to ? displayDate(salary.effective_to) : 'Ongoing'}</td>
                            <td className="py-2.5 text-(--color-text-muted)">{isActive(salary.status) ? 'Included' : 'Excluded'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </ProfileSection>
          )}

          {(employee.charges ?? []).length > 0 && (
            <ProfileSection icon={CalendarDays} title="Assigned charges & allowances" description={`${employee.charges.length} assigned`} className="lg:col-span-2">
              <ul className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                {employee.charges.map((charge) => (
                  <li key={charge.id} className="rounded-lg border border-(--color-border) px-3 py-2.5">
                    <p className="text-sm font-medium text-(--color-text)">{charge.code ? `${charge.code} · ` : ''}{charge.name ?? charge.deduction ?? 'Unnamed charge'}</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">
                      Employee {formatChargeValue(charge.employee_value ?? charge.value, charge.value_type)}
                      {' · '}Employer {formatChargeValue(charge.employer_value, charge.value_type)}
                    </p>
                  </li>
                ))}
              </ul>
            </ProfileSection>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
