import { useState } from 'react';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import RightModal from '../components/RightModal';

const EMPTY_FORM = { plant_id: [], department_code: '', name: '', status: true };
const normalize = (department) => ({ ...EMPTY_FORM, ...(department ?? {}), plant_id: (department?.plant_ids ?? [department?.plant_id]).filter(Boolean).map(String), status: department?.status == null ? 1 : Number(department.status) });

const AddEditDepartment = ({ isOpen, department, plants = [], plantsLoading = false, saving = false, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => normalize(department));
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : event.target.value }));
  const handleSubmit = () => onSubmit({ id: form.id, plant_id: form.plant_id.map(Number), department_code: form.department_code.trim(), name: form.name.trim(), status: form.status });
  return <RightModal key={`${isOpen}-${department?.id ?? 'new'}`} isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title={form.id ? `Edit — ${form.name}` : 'Add Department'} saving={saving}><SearchableSelect label="Plants" options={plants.map((plant) => ({ value: String(plant.id), label: `${plant.plant_code} — ${plant.name}` }))} value={form.plant_id} onChange={(plantIds) => setForm((current) => ({ ...current, plant_id: plantIds }))} placeholder="Select one or more plants" required multiSelect isLoading={plantsLoading} /><InputField label="Department code" value={form.department_code} onChange={setField('department_code')} required /><InputField label="Department name" value={form.name} onChange={setField('name')} required /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.status === 1} onChange={setField('status')} className="h-4 w-4 accent-primary-600" /> Active department</label></RightModal>;
};

export default AddEditDepartment;
