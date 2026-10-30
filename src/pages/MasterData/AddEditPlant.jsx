import { useState } from 'react';
import InputField from '../../components/InputField';
import ChoiceChips from '../../components/ChoiceChips';
import RightModal from '../components/RightModal';
import ChipSwitcher from '../../components/ChipSwitcher';
import { useGetShiftsQuery } from '../../store/api';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
const formatTime = (time) => String(time ?? '').slice(0, 5);

const EMPTY_FORM = {
  plant_code: '',
  name: '',
  address: '',
  maintenance_amount: '0.00',
  shift_ids: [],
  status: '1',
};

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
  { value: '2', label: 'Suspended' },
];

const AddEditPlant = ({ isOpen, plant, saving = false, onClose, onSubmit }) => {
  const shiftsQuery = useGetShiftsQuery({ all: true, per_page: 100 });
  const shifts = unwrap(shiftsQuery.data);
  const [form, setForm] = useState(() => {
    const maintenanceValue = plant?.maintenance_amount ?? 0;
    return {
      ...EMPTY_FORM,
      ...(plant ?? {}),
      shift_ids: (plant?.shifts ?? []).map((shift) => String(shift.id)),
      maintenance_amount: maintenanceValue === null || maintenanceValue === undefined || maintenanceValue === ''
        ? '0.00'
        : String(maintenanceValue),
      status: String(plant?.status ?? '1'),
    };
  });

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const setStatus = (statusValue) =>
    setForm((current) => ({ ...current, status: String(statusValue) }));

  const handleSubmit = () => {
    const normalizedMaintenanceAmount = form.maintenance_amount === '' || form.maintenance_amount === null
      ? 0
      : Number(form.maintenance_amount);

    onSubmit({
      id: form.id,
      plant_code: form.plant_code.trim(),
      name: form.name.trim(),
      address: form.address.trim() || null,
      maintenance_amount: Number.isFinite(normalizedMaintenanceAmount) ? Math.max(0, normalizedMaintenanceAmount) : 0,
      shift_ids: form.shift_ids.map(Number),
      status: form.status,
    });
  };

  const shiftOptions = shifts.map((shift) => {
    const timeRange = [formatTime(shift.start_time), formatTime(shift.end_time)].filter(Boolean).join(' - ');
    const inactiveLabel = Number(shift.status) === 1 ? '' : ' (Inactive)';
    return {
      value: String(shift.id),
      label: `${shift.name}${timeRange ? ` (${timeRange})` : ''}${inactiveLabel}`,
    };
  });

  return (
    <RightModal
      key={`${isOpen}-${plant?.id ?? 'new'}`}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={form.id ? `Edit — ${form.name}` : 'Add Plant'}
      saving={saving}
      submitDisabled={shiftsQuery.isLoading || shiftsQuery.isError}
      className="max-w-md"
    >
      <InputField label="Plant code" value={form.plant_code} onChange={setField('plant_code')} required />
      <InputField label="Plant name" value={form.name} onChange={setField('name')} required />
      <InputField label="Address" value={form.address} onChange={setField('address')} />
      <InputField
        label="Maintenance amount"
        type="number"
        min="0"
        step="0.01"
        value={form.maintenance_amount}
        onChange={setField('maintenance_amount')}
        placeholder="0.00"
      />

      <ChoiceChips
        label="Plant shifts"
        value={form.shift_ids}
        options={shiftOptions}
        onChange={(shiftIds) => setForm((current) => ({ ...current, shift_ids: shiftIds }))}
        multiple
        disabled={shiftsQuery.isLoading || shiftsQuery.isError}
      />
      {shiftsQuery.isLoading && <p role="status" className="text-sm text-(--color-text-muted)">Loading shifts...</p>}
      {shiftsQuery.isError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          Unable to load shifts. Retry before saving so plant shift assignments are not lost.
        </p>
      )}
      {!shiftsQuery.isLoading && !shiftsQuery.isError && shiftOptions.length === 0 && (
        <p className="text-sm text-(--color-text-muted)">No shifts are configured yet.</p>
      )}

      <ChipSwitcher
        label="Status"
        options={STATUS_OPTIONS}
        value={form.status}
        onChange={setStatus}
      />
    </RightModal>
  );
};

export default AddEditPlant;