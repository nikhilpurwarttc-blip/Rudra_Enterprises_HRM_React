import { useState } from 'react';
import RightModal from './RightModal';

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
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => getFormValues(initialValues));
  const isApproval = mode === 'approve';
  const isValid = Boolean(
    form.reason.trim()
    && form.shutdown_start_date
    && form.start_time
    && form.shutdown_end_date
    && form.end_time
    && `${form.shutdown_start_date}T${form.start_time}` < `${form.shutdown_end_date}T${form.end_time}`,
  );
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <RightModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={() => onSubmit(form)}
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
    </RightModal>
  );
};

export default PlantShutdownForm;
