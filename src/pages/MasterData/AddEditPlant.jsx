import { useState } from 'react';
import InputField from '../../components/InputField';
import RightModal from '../components/RightModal';

const EMPTY_FORM = { plant_code: '', name: '', address: '', status: '1' };

const AddEditPlant = ({ isOpen, plant, saving = false, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(plant ?? {}), status: String(plant?.status ?? '1') }));
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const handleSubmit = () => onSubmit({ id: form.id, plant_code: form.plant_code.trim(), name: form.name.trim(), address: form.address.trim() || null, status: form.status });
  return <RightModal key={`${isOpen}-${plant?.id ?? 'new'}`} isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title={form.id ? `Edit — ${form.name}` : 'Add Plant'} saving={saving}><InputField label="Plant code" value={form.plant_code} onChange={setField('plant_code')} required /><InputField label="Plant name" value={form.name} onChange={setField('name')} required /><InputField label="Address" value={form.address} onChange={setField('address')} /><select aria-label="Plant status" value={form.status} onChange={setField('status')} className="w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-3 text-sm"><option value="1">Active</option><option value="0">Inactive</option><option value="2">Suspended</option></select></RightModal>;
};

export default AddEditPlant;
