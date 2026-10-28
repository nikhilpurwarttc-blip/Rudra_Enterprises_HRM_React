import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Calendar,
  FileCheck2,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserCheck,
  UserX,
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
  <section className={`group relative min-w-0 overflow-hidden rounded-2xl border border-(--color-border)/80 bg-(--color-bg-elevated)/60 p-4 backdrop-blur-xl transition-all duration-300 hover:border-(--color-accent)/30 hover:shadow-lg hover:shadow-(--color-accent)/5 sm:p-6 ${className}`}>
    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-(--color-accent)/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <header className="mb-5 flex items-start justify-between gap-3 sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent) shadow-sm ring-1 ring-(--color-accent)/20">
          <Icon size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-(--color-text)">{title}</h2>
          {description && <p className="text-xs leading-relaxed text-(--color-text-muted)">{description}</p>}
        </div>
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Detail = ({ label, value, icon: Icon, className = '' }) => (
  <div className={`min-w-0 rounded-xl border border-(--color-border)/50 bg-(--color-bg)/40 p-3 transition-colors hover:bg-(--color-bg)/80 sm:p-3.5 ${className}`}>
    <div className="flex items-center gap-1.5 text-xs font-medium text-(--color-text-muted) mb-1">
      {Icon && <Icon size={13} className="text-(--color-accent)" />}
      <span>{label}</span>
    </div>
    <div className="break-words text-sm font-semibold text-(--color-text)">{value || '—'}</div>
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
        action={<Button onClick={close} className="mt-2">Back to Employees</Button>}
      />
    );
  }

  const approved = Number(employee.approval_status) === 1;
  const active = isActive(employee.status);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-(--color-bg) to-(--color-bg-elevated)/30">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-7xl space-y-5 p-3 sm:space-y-6 sm:p-6 lg:p-8">

          {/* Navigation & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {embedded &&
              <Button variant="ghost" onClick={close} className="group flex items-center gap-2 rounded-full text-xs font-medium text-(--color-text-muted) hover:text-(--color-text)">
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Employees
              </Button>
            }
            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
              <EmployeeApprovalActions employee={employee} />
              <div className="flex shrink-0 items-center rounded-full border border-(--color-border) text-(--color-text-muted) shadow-sm transition-colors">

                {canEdit && !isReadOnly && (
                  <button
                    type="button"
                    aria-label="Edit employee"
                    onClick={() => navigate(`/employees/${employee.id}/edit`)}
                    className="rounded-l-full px-3 py-2 text-(--color-text-muted) transition-colors hover:bg-(--color-accent-soft) hover:text-(--color-accent)"
                  >
                    <Pencil size={16.5} />
                  </button>
                )}
                {embedded && (
                  <button
                    type="button"
                    aria-label="Close employee profile"
                    onClick={close}
                    className="rounded-r-full px-3 py-2 text-(--color-text-muted) transition-colors hover:bg-(--color-accent-soft) hover:text-(--color-accent)"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:items-start">
            {/* CR80 ID Card Centerpiece Container */}
            <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-(--color-border) bg-(--color-bg-elevated) shadow-2xl transition-transform duration-300 hover:scale-[1.01] xl:mx-0 xl:sticky xl:top-6">

              {/* ID Card Top Accent Bar / Lanyard Slot Visual */}
              <div className="relative bg-gradient-to-r from-(--color-accent) via-indigo-600 to-(--color-accent) p-4 text-white text-center">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-black/30 rounded-full" />
                <div className="flex items-center justify-between mt-1">
                  {/* <img
                    src="/icon.png"
                    alt="Rudra Alloys logo"
                    className="h-9 w-9 rounded-lg bg-white p-1 object-contain shadow-sm"
                  /> */}
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">Riya Enterprises</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-white/20 backdrop-blur-md text-white`}>
                    {active ? <UserCheck size={10} /> : <UserX size={10} />}
                    {active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <h3 className="text-start text-xs font-medium tracking-wide mt-1 opacity-90 truncate">{employee.plant?.name || 'Corporate Headquarters'}</h3>

              </div>

              {/* ID Card Body */}
              <div className="relative isolate overflow-hidden bg-gradient-to-b from-(--color-bg-elevated) to-(--color-bg)/80">
                <img
                  src="/icon.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 bottom-0 z-0 w-200 max-w-[94%] -translate-x-1/2 object-contain opacity-[0.15] select-none dark:grayscale dark:invert"
                />
                <div className="relative z-10 flex flex-col items-center p-5 text-center sm:p-6">

                {/* Profile Avatar with Ring */}
                <div className="relative -mt-2 mb-3">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-(--color-accent) to-indigo-500 opacity-50 blur-xs" />
                  <EmployeeAvatar employee={employee} className="relative h-24 w-24 rounded-full text-2xl shadow-md border-4 border-(--color-bg-elevated) object-cover" />
                </div>

                {/* Name & Designation */}
                <h1 className="uppercase text-lg font-bold tracking-wide text-(--color-text) truncate w-full">{employee.name}</h1>
                <p className="text-xs font-semibold text-(--color-accent) mt-0.5">{employee.designation?.name || 'Team Member'}</p>

                <div className="mt-1 text-[11px] text-(--color-text-muted) font-medium">
                  {employee.department?.name || 'General Department'}
                </div>

                {/* Quick Info Grid inside ID Card */}
                <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-(--color-border)/60 text-left">
                  <div className="bg-(--color-bg)/50 p-2 rounded-lg border border-(--color-border)/40">
                    <span className="block text-[10px] text-(--color-text-muted) uppercase tracking-wider font-semibold">EMP Code</span>
                    <span className="text-xs font-mono font-bold text-(--color-text)">{employee.employee_code || '—'}</span>
                  </div>
                  <div className="bg-(--color-bg)/50 p-2 rounded-lg border border-(--color-border)/40">
                    <span className="block text-[10px] text-(--color-text-muted) uppercase tracking-wider font-semibold">Joined</span>
                    <span className="text-xs font-semibold text-(--color-text)">{displayDate(employee.joining_date) || '—'}</span>
                  </div>
                </div>

                {/* Barcode Footer section */}
                {employee.employee_code && (
                  <div className="w-full mt-4 pt-3 bg-white p-2 rounded-xl border border-black/5 shadow-inner flex flex-col items-center justify-center">
                    <EmployeeBarcode
                      employeeCode={employee.employee_code}
                      employeeName={employee.name}
                      height={46}
                      width={2}
                      margin={0}
                      showMetadata={false}
                      className="border-none"
                    />
                  </div>
                )}

                {/* Approval status badge inside card footer */}
                {/* {employee.approval_status_label && (
                <div className="mt-3">
                  <span className="rounded-full border border-(--color-border) bg-(--color-bg)/80 px-2.5 py-0.5 text-[10px] font-medium text-(--color-text-muted)">
                    Status: {employee.approval_status_label}
                  </span>
                </div>
              )} */}

              </div>
              </div>


            </div>

            <div className="grid min-w-0 gap-4">

              {/* Employment Details */}
              <ProfileSection icon={BriefcaseBusiness} title="Employment Details" description="Work role, corporate placement, and scheduling info">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Detail label="Department" value={employee.department?.name} icon={Building2} />
                  <Detail label="Designation" value={employee.designation?.name} icon={BriefcaseBusiness} />
                  <Detail label="Plant / Location" value={employee.plant?.name} icon={MapPin} />
                  <Detail label="Shift Schedule" value={employee.shift?.name} icon={Calendar} />
                  <Detail label="Joining Date" value={displayDate(employee.joining_date)} icon={Calendar} />
                  <Detail label="Relieving Date" value={displayDate(employee.relieving_date)} icon={Calendar} />
                  <Detail label="Weekly Offs" value={weeklyOffDays} icon={Calendar} className="sm:col-span-2" />
                </div>
              </ProfileSection>

              {/* Personal & Contact */}
              <ProfileSection icon={ShieldCheck} title="Personal & Contact" description="Identity records, direct line, and residential address">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Detail label="Date of Birth" value={displayDate(employee.dob)} icon={Calendar} />
                  <Detail label="Gender" value={employee.gender} />
                  <Detail label="Marital Status" value={employee.marital_status} />
                  <Detail label="Mobile Number" value={employee.mobile_number} icon={Phone} />
                  <Detail label="Email Address" value={employee.email} icon={Mail} className="sm:col-span-2" />
                  <Detail label="Residential Address" value={employee.address} icon={MapPin} className="sm:col-span-2" />
                </div>
              </ProfileSection>
            </div>
          </div>

          {/* Supporting Information */}
          <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2">

            {/* KYC Documents */}
            <ProfileSection
              icon={FileCheck2}
              title="KYC Documents"
              description={documentsLoading ? 'Loading submitted records…' : `${documents.length} document${documents.length === 1 ? '' : 's'} verified`}
            >
              {documentsError ? (
                <p role="alert" className="text-sm text-red-500 py-3">Unable to load KYC documents.</p>
              ) : documentsLoading ? (
                <p className="text-sm text-(--color-text-muted) py-3">Loading documents…</p>
              ) : documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-(--color-border) p-6 text-center">
                  <p className="text-sm text-(--color-text-muted)">No KYC documents submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-(--color-border)/60 bg-(--color-bg)/40 p-3.5 transition-colors hover:bg-(--color-bg)">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-(--color-text)">{document.document_type || 'Official Document'}</p>
                        <p className="mt-0.5 truncate text-xs text-(--color-text-muted) font-mono">{document.document_number || 'Number not provided'}</p>
                      </div>
                      {document.document_file && isSafeUrl(document.document_file) && (
                        <a
                          href={document.document_file}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg bg-(--color-accent-soft) px-3 py-1.5 text-xs font-semibold text-(--color-accent) hover:bg-(--color-accent) hover:text-white transition-colors"
                        >
                          View File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ProfileSection>

            {/* Bank Accounts */}
            <ProfileSection
              icon={Landmark}
              title="Bank Accounts"
              description={accountsLoading ? 'Loading banking details…' : `${accounts.length} account${accounts.length === 1 ? '' : 's'} linked`}
            >
              {accountsError ? (
                <p role="alert" className="text-sm text-red-500 py-3">Unable to load bank accounts.</p>
              ) : accountsLoading ? (
                <p className="text-sm text-(--color-text-muted) py-3">Loading bank accounts…</p>
              ) : accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-(--color-border) p-6 text-center">
                  <p className="text-sm text-(--color-text-muted)">No bank accounts added.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {accounts.map((account) => (
                    <div key={account.id} className="rounded-xl border border-(--color-border)/60 bg-(--color-bg)/40 p-3.5 transition-colors hover:bg-(--color-bg)">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-(--color-text)">{account.bank_name || 'Primary Institution'}</p>
                        {isActive(account.is_primary) && (
                          <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-0.5 text-[11px] font-bold text-(--color-accent) uppercase tracking-wide">Primary</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-(--color-text-muted)">{account.account_holder_name || 'Holder name unavailable'}</p>
                      <p className="mt-1 font-mono text-xs text-(--color-text-muted)">
                        A/C ••••{String(account.account_number ?? '').slice(-4)}
                        {account.ifsc_code ? ` · IFSC: ${account.ifsc_code}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ProfileSection>

            {/* Salary Information */}
            {canViewSalary && (
              <ProfileSection
                icon={WalletCards}
                title="Salary & Compensation"
                description={salariesLoading ? 'Loading compensation history…' : `${salaries.length} active tier records`}
                className="lg:col-span-2"
              >
                {!approved ? (
                  <div className="rounded-xl bg-(--color-bg)/40 p-6 text-center border border-(--color-border)/50">
                    <p className="text-sm text-(--color-text-muted)">Salary details are securely unlocked after full employee approval status is completed.</p>
                  </div>
                ) : salariesError ? (
                  <p role="alert" className="text-sm text-red-500 py-3">Unable to load salary information.</p>
                ) : salariesLoading ? (
                  <p className="text-sm text-(--color-text-muted) py-3">Loading salary data…</p>
                ) : salaries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-(--color-border) p-6 text-center">
                    <p className="text-sm text-(--color-text-muted)">No salary logs have been registered.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {currentSalary ? (
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-(--color-accent-soft) to-indigo-500/10 p-5 border border-(--color-accent)/20 shadow-sm">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Current Active Monthly Compensation</span>
                          <p className="mt-1 text-2xl font-extrabold text-(--color-text)">{formatAmount(currentSalary.monthly_salary)}</p>
                        </div>
                        <span className="rounded-xl bg-(--color-bg)/60 px-3 py-1.5 text-xs font-semibold text-(--color-text-muted) border border-(--color-border)/50 backdrop-blur-md">
                          Effective from {displayDate(currentSalary.effective_from)}
                          {currentSalary.effective_to ? ` – ${displayDate(currentSalary.effective_to)}` : ' · Ongoing'}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-(--color-bg)/40 p-4 border border-(--color-border)/50">
                        <p className="text-sm text-(--color-text-muted)">No active salary structure is currently effective for today's date.</p>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-(--color-border)/60 bg-(--color-bg)/30">
                      <table className="w-full min-w-[500px] text-left text-sm">
                        <thead className="border-b border-(--color-border)/60 bg-(--color-bg)/60 text-xs font-semibold text-(--color-text-muted)">
                          <tr>
                            <th scope="col" className="py-3 px-4">Monthly Salary</th>
                            <th scope="col" className="py-3 px-4">Effective From</th>
                            <th scope="col" className="py-3 px-4">Effective To</th>
                            <th scope="col" className="py-3 px-4">Payroll Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)/40">
                          {salaries.map((salary) => (
                            <tr key={salary.id} className="transition-colors hover:bg-(--color-bg)/50">
                              <td className="py-3 px-4 font-semibold text-(--color-text)">{formatAmount(salary.monthly_salary)}</td>
                              <td className="py-3 px-4 text-(--color-text-muted)">{displayDate(salary.effective_from)}</td>
                              <td className="py-3 px-4 text-(--color-text-muted)">{salary.effective_to ? displayDate(salary.effective_to) : 'Ongoing'}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive(salary.status) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500'}`}>
                                  {isActive(salary.status) ? 'Included' : 'Excluded'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </ProfileSection>
            )}

            {/* Assigned Charges & Allowances */}
            {(employee.charges ?? []).length > 0 && (
              <ProfileSection icon={Calendar} title="Assigned Charges & Allowances" description={`${employee.charges.length} items configured`} className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {employee.charges.map((charge) => (
                    <div key={charge.id} className="rounded-xl border border-(--color-border)/60 bg-(--color-bg)/40 p-4 transition-all hover:bg-(--color-bg)">
                      <p className="text-sm font-semibold text-(--color-text)">{charge.code ? `${charge.code} · ` : ''}{charge.name ?? charge.deduction ?? 'Unnamed Charge'}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-(--color-text-muted) pt-2 border-t border-(--color-border)/40">
                        <span>Employee: <strong className="text-(--color-text)">{formatChargeValue(charge.employee_value ?? charge.value, charge.value_type)}</strong></span>
                        <span>Employer: <strong className="text-(--color-text)">{formatChargeValue(charge.employer_value, charge.value_type)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </ProfileSection>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;