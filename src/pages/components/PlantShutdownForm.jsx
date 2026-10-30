import { useMemo, useState } from 'react';
import { UserRoundCheck } from 'lucide-react';
import ConfirmDelete from '../../components/ConfirmDelete';
import SearchableSelect from '../../components/SearchableSelect';
import ChoiceChips from '../../components/ChoiceChips';
import { useGetEmployeesQuery } from '../../store/api';
import RightModal from './RightModal';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];

const getFormValues = (values = {}) => ({
  reason: values.reason ?? '',
  shutdown_start_date: String(values.shutdown_start_date ?? '').slice(0, 10),
  shutdown_end_date: String(values.shutdown_end_date ?? values.shutdown_start_date ?? '').slice(0, 10),
  shift_ids: (values.shift_ids ?? values.shifts?.map((shift) => shift.id) ?? []).map(String),
});

const PlantShutdownForm = ({
  isOpen,
  mode,
  initialValues = {},
  plantId,
  shifts = [],
  hasSelectedDateGaps = false,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => getFormValues(initialValues));
  const [attendeeIds, setAttendeeIds] = useState([]);
  const [confirmAttendanceOpen, setConfirmAttendanceOpen] = useState(false);
  const employeesQuery = useGetEmployeesQuery(
    {
      all: true,
      per_page: 100,
      approval_status: 1,
      status: 1,
      ...(plantId ? { plant_id: plantId } : {}),
    },
    { skip: mode !== 'request' },
  );
  const employees = unwrap(employeesQuery.data);
  const isApproval = mode === 'approve';
  const isRequest = mode === 'request';
  const eligibleEmployees = useMemo(
    () => employees.filter((employee) => form.shift_ids.includes(String(employee.shift_id))),
    [employees, form.shift_ids],
  );
  const employeeOptions = useMemo(() => eligibleEmployees.map((employee) => ({
    value: String(employee.id),
    label: employee.name,
    searchText: `${employee.name ?? ''} ${employee.employee_code ?? ''}`,
  })), [eligibleEmployees]);
  const selectedAttendees = eligibleEmployees.filter((employee) => attendeeIds.includes(String(employee.id)));
  const allAvailableShifts = [...shifts, ...(initialValues.shifts ?? [])]
    .filter((shift, index, available) => available.findIndex((candidate) => String(candidate.id) === String(shift.id)) === index);
  const availableShifts = isRequest
    ? allAvailableShifts.filter((shift) => Number(shift.status) === 1)
    : allAvailableShifts;
  const shiftOptions = availableShifts.map((shift) => {
    const timeRange = [shift.start_time, shift.end_time]
      .map((time) => String(time ?? '').slice(0, 5))
      .filter(Boolean)
      .join(' - ');
    return {
      value: String(shift.id),
      label: `${shift.name}${timeRange ? ` (${timeRange})` : ''}`,
    };
  });
  const initialStartDate = String(initialValues.shutdown_start_date ?? '').slice(0, 10);
  const initialEndDate = String(initialValues.shutdown_end_date ?? initialValues.shutdown_start_date ?? '').slice(0, 10);
  const [previousInitialDates, setPreviousInitialDates] = useState(() => ({
    start: initialStartDate,
    end: initialEndDate,
  }));
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
    && form.shutdown_end_date
    && form.shutdown_start_date <= form.shutdown_end_date
    && form.shift_ids.length > 0,
  );
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateShifts = (shiftIds) => setForm((current) => ({ ...current, shift_ids: shiftIds }));
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
            ? 'Select the plant shifts affected by this request. It covers the full date range shown below, including any days between selected calendar cells. Pending requests block punching only for these shifts.'
            : 'Select the plant shifts affected by this request and the dates they will be shut down. Pending requests block punching only for these shifts.'}
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
          End date
          <input type="date" value={form.shutdown_end_date} onChange={update('shutdown_end_date')} required className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text)" />
        </label>
      </div>
      <ChoiceChips
        label="Shutdown shifts (required)"
        value={form.shift_ids}
        options={shiftOptions}
        onChange={updateShifts}
        multiple
      />
      {shiftOptions.length === 0 && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {isRequest ? 'Assign active shifts to this plant before requesting a shutdown.' : 'No shifts are available for this shutdown.'}
        </p>
      )}
      {shiftOptions.length > 0 && form.shift_ids.length === 0 && (
        <p role="status" className="text-sm text-(--color-text-muted)">Select at least one shift for the shutdown request.</p>
      )}
      {isRequest && (
        <>
          <SearchableSelect
            label="Employees coming (optional)"
            ariaLabel="Select employees coming during shutdown"
            options={employeeOptions}
            value={selectedAttendees.map((employee) => String(employee.id))}
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
        message="Attendance will be marked for the first shutdown date. Employees with recorded punch times are paid for their worked hours; employees not marked present or punched in receive the shutdown guaranteed hours. Anyone already present or punched in will be skipped."
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
