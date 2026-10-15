import { useState } from 'react';
import InputField from '../../components/InputField';
import RightModal from '../components/RightModal';
import SearchableSelect from '../../components/SearchableSelect';
import Switch from '../../components/Switch';

const EMPTY_FORM = {
  code: '',
  name: '',
  value_type: 'percentage',
  employee_value: '',
  employer_value: '',
  salary_limit: '',
  effective_from: '',
  effective_to: '',
  notification_no: '',
  source_url: '',
  remarks: '',
  status: 1,
};

const normalizeStatus = (value) =>
  value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;

const normalizeCharge = (charge) => ({
  ...EMPTY_FORM,
  ...(charge ?? {}),
  code: charge?.code ?? '',
  name: charge?.name ?? charge?.deduction ?? '',
  value_type: charge?.value_type ?? EMPTY_FORM.value_type,
  employee_value: charge?.employee_value ?? charge?.value ?? '',
  employer_value: charge?.employer_value ?? '',
  salary_limit: charge?.salary_limit ?? '',
  effective_from: String(charge?.effective_from ?? '').slice(0, 10),
  effective_to: String(charge?.effective_to ?? '').slice(0, 10),
  notification_no: charge?.notification_no ?? '',
  source_url: charge?.source_url ?? '',
  remarks: charge?.remarks ?? '',
  status: charge ? normalizeStatus(charge.status) : 1,
});

const AddEditCharge = ({
  isOpen,
  charge,
  saving = false,
  errors = {},
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => normalizeCharge(charge));

  const setField = (field) => (event) =>
    setForm((current) => ({
      ...current,
      [field]:
        event.target.type === 'checkbox'
          ? event.target.checked
            ? 1
            : 0
          : event.target.value ?? '',
    }));

  const handleSubmit = () => {
    const numberOrZero = (value) => (value === '' || value == null ? 0 : Number(value));
    const optionalText = (value) => String(value ?? '').trim() || null;
    onSubmit({
      id: form.id,
      code: String(form.code ?? '').trim() || undefined,
      name: String(form.name ?? '').trim(),
      value_type: form.value_type,
      employee_value: form.employee_value === '' ? '' : Number(form.employee_value),
      employer_value: numberOrZero(form.employer_value),
      salary_limit: numberOrZero(form.salary_limit),
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      notification_no: optionalText(form.notification_no),
      source_url: optionalText(form.source_url),
      remarks: optionalText(form.remarks),
      status: form.status,
    });
  };

  return (
    <RightModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={form.id ? 'Edit Charge' : 'Add Charge'}
      saving={saving}
    >
      <InputField
        label="Charge name"
        value={form.name}
        onChange={setField('name')}
        error={errors.name}
        required
      />
      <InputField
        label="Charge code"
        value={form.code}
        onChange={setField('code')}
        helperText="Optional when creating; a code will be generated from the name."
        maxLength={50}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <SearchableSelect 
          label="Value Type" 
          helperText="Select value type"
          showSearch={false}
          error={errors.value_type}
          options={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'percentage', label: 'Percentage' }
          ]}
          value={form.value_type}
          onChange={(value) =>
            setForm((current) => ({ ...current, value_type: value }))
          }
        />
          {/* <label
            htmlFor="charge-value-type"
            className="block text-xs font-medium text-(--color-text-muted)"
          >
            Value type
          </label>
          <select
            id="charge-value-type"
            value={form.value_type}
            onChange={setField('value_type')}
            className="w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-3 text-sm text-(--color-text)"
          >
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage</option>
          </select> */}
          {/* {errors.value_type && (
            <p role="alert" className="mt-1 text-xs text-(--color-danger)">
              {errors.value_type}
            </p>
          )} */}
        </div>
        <InputField
          label="Employee value"
          type="number"
          min="0"
          step="0.01"
          value={form.employee_value}
          onChange={setField('employee_value')}
          error={errors.employee_value}
          required
        />
        <InputField
          label="Employer value"
          type="number"
          min="0"
          step="0.01"
          value={form.employer_value}
          onChange={setField('employer_value')}
          error={errors.employer_value}
        />
        <InputField
          label="Salary limit"
          type="number"
          min="0"
          step="0.01"
          value={form.salary_limit}
          onChange={setField('salary_limit')}
          error={errors.salary_limit}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Effective from"
          type="date"
          value={form.effective_from}
          onChange={setField('effective_from')}
          error={errors.effective_from}
          required
        />
        <InputField
          label="Effective to"
          type="date"
          value={form.effective_to}
          onChange={setField('effective_to')}
          error={errors.effective_to}
        />
      </div>

      {/* <InputField
        label="Notification number"
        value={form.notification_no}
        onChange={setField('notification_no')}
        error={errors.notification_no}
        maxLength={255}
      />
      <InputField
        label="Source URL"
        type="url"
        value={form.source_url}
        onChange={setField('source_url')}
        error={errors.source_url}
        maxLength={1000}
      />
      <div>
        <label
          htmlFor="charge-remarks"
          className="mb-1 block text-xs font-medium text-(--color-text-muted)"
        >
          Remarks
        </label>
        <textarea
          id="charge-remarks"
          value={form.remarks}
          onChange={setField('remarks')}
          rows={3}
          className="w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm text-(--color-text) focus:border-(--color-accent) focus:outline-none"
        />
        {errors.remarks && (
          <p role="alert" className="mt-1 text-xs text-(--color-danger)">
            {errors.remarks}
          </p>
        )}
      </div> */}

      {/* Active/ Inactive Switch */}
      <Switch onClick={() => setForm((current) => ({ ...current, status: current.status === 1 ? 0 : 1 }))} checked={form.status === 1} label="Active charge" />

      {/* <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={form.status === 1}
          onChange={setField('status')}
          className="h-4 w-4 accent-primary-600"
        />
        <span className="text-sm text-(--color-text)">Active charge</span>
      </label> */}
    </RightModal>
  );
};

export default AddEditCharge;
