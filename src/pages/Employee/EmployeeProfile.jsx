import { ArrowLeft, BriefcaseBusiness, CalendarDays, IdCard, Mail, MapPin, Pencil, Phone, ShieldCheck, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetEmployeeByIdQuery } from '../../store/api';
import { Feedback, LoadingState } from '../../components/Feedback';
import Button from '../../components/Button';
import GlassCard from '../../components/GlassCard';
import usePermission from '../../hooks/usePermission';
import { useRenderPerformance } from '../../utils/performance';
import EmployeeApprovalActions from './components/EmployeeApprovalActions';
import EmployeeAvatar from './components/EmployeeAvatar';
import { displayDate } from './utils/employeeForm.utils';

const unwrap = (value) => value?.data ?? value;

const EmployeeProfile = ({ employeeId, initialEmployee, embedded = false, onClose }) => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const id = employeeId ?? routeId;
  // Skip the fetch when the parent already passed a cached employee object.
  // The query still runs in the background to get fresh data, but we render
  // immediately from initialEmployee so there is zero loading flash.
  const { data, isLoading, isError } = useGetEmployeeByIdQuery(id, { skip: !id });
  const fetched = unwrap(data);
  const employee = fetched ?? initialEmployee ?? null;
  const { canEdit, isReadOnly } = usePermission('/employees');
  useRenderPerformance('getEmployeeById', data);
  const close = onClose ?? (() => navigate('/employees'));

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

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      {!embedded && (
        <Button variant="ghost" onClick={close} className="mb-4 flex items-center gap-2">
          <ArrowLeft size={16} /> Back to employees
        </Button>
      )}
      <GlassCard className="mx-auto max-w-4xl overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-(--color-accent-soft) p-6 sm:p-8">
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <EmployeeAvatar employee={employee} className="h-20 w-20 text-2xl" />
            <div>
              <p className="text-sm text-(--color-text-muted)">Employee profile</p>
              <h1 className="text-2xl font-semibold text-(--color-text)">{employee.name}</h1>
              <p className="text-sm text-(--color-text-muted)">
                {employee.employee_code} {employee.barcode ? `· ${employee.barcode}` : ''}
              </p>
              <div className="mt-2">
                <EmployeeApprovalActions employee={employee} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.status ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
              {employee.status ? 'Active' : 'Inactive'}
            </span>
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
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-lg border border-(--color-border) p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-(--color-text)">
              <BriefcaseBusiness size={16} className="text-(--color-accent)" /> Work details
            </div>
            <p className="text-sm text-(--color-text-muted)">{employee.designation?.name ?? 'No designation'}</p>
            <p className="text-sm text-(--color-text-muted)">
              {employee.department?.name ?? 'No department'} · {employee.plant?.name ?? 'No plant'}
            </p>
            <p className="text-sm text-(--color-text-muted)">{employee.shift?.name ?? 'No shift'}</p>
          </div>
          <div className="rounded-lg border border-(--color-border) p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-(--color-text)">
              <Phone size={16} className="text-(--color-accent)" /> Contact
            </div>
            <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
              <Mail size={14} /> {employee.email ?? 'No email provided'}
            </p>
            <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
              <Phone size={14} /> {employee.mobile_number ?? 'No mobile provided'}
            </p>
            <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
              <MapPin size={14} /> {employee.address ?? 'No address provided'}
            </p>
          </div>
          <div className="rounded-lg border border-(--color-border) p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-(--color-text)">
              <CalendarDays size={16} className="text-(--color-accent)" /> Dates
            </div>
            <p className="text-sm text-(--color-text-muted)">DOB: {displayDate(employee.dob)}</p>
            <p className="text-sm text-(--color-text-muted)">Joining: {displayDate(employee.joining_date)}</p>
          </div>
          <div className="rounded-lg border border-(--color-border) p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-(--color-text)">
              <ShieldCheck size={16} className="text-(--color-accent)" /> Personal
            </div>
            <p className="text-sm text-(--color-text-muted)">Gender: {employee.gender ?? '—'}</p>
            <p className="text-sm text-(--color-text-muted)">Marital status: {employee.marital_status ?? '—'}</p>
            <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
              <IdCard size={14} /> Charges: {employee.charges?.length ?? 0}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default EmployeeProfile;
