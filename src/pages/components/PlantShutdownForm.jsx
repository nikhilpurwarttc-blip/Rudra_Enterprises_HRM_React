import { useMemo, useState } from 'react';
import { UserRoundCheck } from 'lucide-react';
import ConfirmDelete from '../../components/ConfirmDelete';
import SearchableSelect from '../../components/SearchableSelect';
import { useGetEmployeesQuery } from '../../store/api';
import RightModal from './RightModal';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];

const getFormValues = (values = {}) => ({
  reason: values.reason ?? '',
  shutdown_start_date: String(values.shutdown_start_date ?? '').slice(0, 10),
  start_time: String(values.start_time ?? '').slice(0, 5),
  shutdown_end_date: String(values.shutdown_end_date ?? values.shutdown_start_date ?? '').slice(0, 10),
  end_time: String(values.end_time ?? '').slice(0, 5),
});

const PlantShutdownForm = ({
  isOpen,
  mode,
  initialValues,
  plantId,
  hasSelectedDateGaps = false,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => getFormValues(initialValues));
  const [attendeeIds, setAttendeeIds] = useState([]);
  const [confirmAttendanceOpen, setConfirmAttendanceOpen] = useState(false);
  const employeesQuery = useGetEmployeesQuery(
    { all: true, per_page: 100, ...(plantId ? { plant_id: plantId } : {}) },
    { skip: mode !== 'request' },
  );
  const employees = unwrap(employeesQuery.data);
  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id),
    label: employee.name,
    searchText: `${employee.name ?? ''} ${employee.employee_code ?? ''}`,
  })), [employees]);
  const selectedAttendees = employees.filter((employee) => attendeeIds.includes(String(employee.id)));
  const initialStartDate = String(initialValues.shutdown_start_date ?? '').slice(0, 10);
  const initialEndDate = String(initialValues.shutdown_end_date ?? initialValues.shutdown_start_date ?? '').slice(0, 10);
  const [previousInitialDates, setPreviousInitialDates] = useState(() => ({
    start: initialStartDate,
    end: initialEndDate,
  }));
  const isApproval = mode === 'approve';
  const isRequest = mode === 'request';
  if (!isApproval && (
    previousInitialDates.start !== initialStartDate
    || previousInitialDates.end !== initialEndDate
  )) {
    setPreviousInitialDates({ start: initialStartDate, end: initialEndDate });
    setForm((current) => ({
      ...current,
      shutdown_start_date: initialStartDate,
      shutdown_end_date: initialEndDate,
    }));
  }
  const isValid = Boolean(
    form.reason.trim()
    && form.shutdown_start_date
    && form.start_time
    && form.shutdown_end_date
    && form.end_time
    && `${form.shutdown_start_date}T${form.start_time}` < `${form.shutdown_end_date}T${form.end_time}`,
  );
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submitRequest = (markAttendees) => onSubmit({
    ...form,
    attendees: selectedAttendees,
    markAttendees,
  });

  return (
    <RightModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={() => {
        if (isRequest && selectedAttendees.length > 0) {
          setConfirmAttendanceOpen(true);
          return;
        }
        onSubmit(form);
      }}
      title={isApproval ? 'Review shutdown request' : 'Request plant shutdown'}
      saving={saving}
      submitDisabled={!isValid}
      submitLabel={isApproval ? 'Update & approve' : 'Submit for approval'}
      submitLoadingLabel={isApproval ? 'Updating and approving...' : 'Submitting request...'}
      className="w-screen md:w-[min(36rem,90vw)]"
    >
      <p className="text-sm text-(--color-text-muted) max-w-sm">
        {isApproval
          ? 'Review and update the shutdown details before approving this request.'
          : hasSelectedDateGaps
            ? 'This request applies only to the selected plant. It covers the full date range shown below, including any days between selected calendar cells. Attendance punching is paused for those dates after approval.'
            : 'This request applies only to the selected plant. Attendance punching is paused for the requested dates until an authorized user approves or rejects it.'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-sm">
        <label className="sm:col-span-2 text-sm font-medium text-(--color-text)">
          Reason
          <textarea
            value={form.reason}
            onChange={update('reason')}
            rows={3}
            required
            className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text) focus:border-(--color-accent) focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-(--color-text)">
          Start date
          <input type="date" value={form.shutdown_start_date} onChange={update('shutdown_start_date')} required className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text)" />
        </label>
        <label className="text-sm font-medium text-(--color-text)">
          Start time
          <input type="time" value={form.start_time} onChange={update('start_time')} required className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text)" />
        </label>
        <label className="text-sm font-medium text-(--color-text)">
          End date
          <input type="date" value={form.shutdown_end_date} onChange={update('shutdown_end_date')} required className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text)" />
        </label>
        <label className="text-sm font-medium text-(--color-text)">
          End time
          <input type="time" value={form.end_time} onChange={update('end_time')} required className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text)" />
        </label>
      </div>
      {isRequest && (
        <>
          <SearchableSelect
            label="Employees coming (optional)"
            ariaLabel="Select employees coming during shutdown"
            options={employeeOptions}
            value={attendeeIds}
            onChange={setAttendeeIds}
            placeholder="Select employees"
            multiSelect
            isLoading={employeesQuery.isLoading}
          />
          {employeesQuery.isError && (
            <p role="alert" className="text-sm text-(--color-danger)">
              Unable to load employees. You can still submit the shutdown request without selecting attendees.
            </p>
          )}
        </>
      )}
      <ConfirmDelete
        isOpen={confirmAttendanceOpen}
        title="Mark these employees present?"
        message="Attendance will be marked for the first shutdown date. Anyone already present or punched in will be skipped."
        confirmLabel="Yes, mark present"
        confirmLoadingLabel="Submitting..."
        confirmClass="bg-emerald-700 hover:bg-emerald-800"
        rejectLabel="No, submit only"
        rejectClass="bg-slate-600 hover:bg-slate-700"
        icon={UserRoundCheck}
        className="max-w-xl"
        onConfirm={() => submitRequest(true)}
        onReject={() => {
          setConfirmAttendanceOpen(false);
          submitRequest(false);
        }}
        onCancel={() => setConfirmAttendanceOpen(false)}
      >
        <div className="rounded-lg border border-(--color-border) bg-(--color-bg-elevated) p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Attendance date</p>
          <p className="mt-1 text-sm font-semibold text-(--color-text)">{form.shutdown_start_date}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Employees selected ({selectedAttendees.length})
          </p>
          <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {selectedAttendees.map((employee) => (
              <span key={employee.id} className="rounded-full bg-(--color-accent-soft) px-2.5 py-1 text-xs font-medium text-(--color-text)">
                {employee.name}
              </span>
            ))}
          </div>
        </div>
      </ConfirmDelete>
    </RightModal>
  );
};

export default PlantShutdownForm;
