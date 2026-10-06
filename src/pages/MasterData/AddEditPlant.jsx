import { useState } from 'react';
import InputField from '../../components/InputField';
import RightModal from '../components/RightModal';
import ChipSwitcher from '../../components/ChipSwitcher';

const EMPTY_FORM = { plant_code: '', name: '', address: '', status: '1' };

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
  { value: '2', label: 'Suspended' },
];

const AddEditPlant = ({ isOpen, plant, saving = false, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(plant ?? {}),
    status: String(plant?.status ?? '1'),
  }));

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const setStatus = (statusValue) =>
    setForm((current) => ({ ...current, status: String(statusValue) }));

  const handleSubmit = () =>
    onSubmit({
      id: form.id,
      plant_code: form.plant_code.trim(),
      name: form.name.trim(),
      address: form.address.trim() || null,
      status: form.status,
    });

  return (
    <RightModal
      key={`${isOpen}-${plant?.id ?? 'new'}`}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={form.id ? `Edit — ${form.name}` : 'Add Plant'}
      saving={saving}
    >
      <InputField label="Plant code" value={form.plant_code} onChange={setField('plant_code')} required />
      <InputField label="Plant name" value={form.name} onChange={setField('name')} required />
      <InputField label="Address" value={form.address} onChange={setField('address')} />
      
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