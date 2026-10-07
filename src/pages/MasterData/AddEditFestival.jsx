import { useState } from 'react';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import RightModal from '../components/RightModal';

const EMPTY_FORM = {
  plant_id: [],
  name: '',
  holiday_date: '',
  description: '',
  status: 1,
};

const normalizeFestival = (festival) => ({
  ...EMPTY_FORM,
  ...(festival ?? {}),
  plant_id: (festival?.plant_id ?? []).map(String),
  holiday_date: String(festival?.holiday_date ?? '').slice(0, 10),
  status: festival?.status == null ? 1 : Number(festival.status),
});

const AddEditFestival = ({
  isOpen,
  festival,
  plants = [],
  plantsLoading = false,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => normalizeFestival(festival));

  const setField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    const { id, plant_id, name, holiday_date, description, status } = form;
    onSubmit({
      id,
      plant_id: plant_id.map(Number),
      name: name.trim(),
      holiday_date,
      description: description.trim() || null,
      status,
    });
  };

  return (
    <RightModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={form.id ? `Edit — ${form.name}` : 'Add Holiday'}
      saving={saving}
    >
      <SearchableSelect
        label="Plants"
        options={plants.map((plant) => ({
          value: String(plant.id),
          label: `${plant.plant_code} — ${plant.name}`,
        }))}
        value={form.plant_id}
        onChange={(plantIds) => setForm((current) => ({ ...current, plant_id: plantIds }))}
        placeholder="Select one or more plants"
        required
        multiSelect
        isLoading={plantsLoading}
      />
      <InputField label="Holiday name" value={form.name} onChange={setField('name')} required />
      <InputField label="Date" type="date" value={form.holiday_date} onChange={setField('holiday_date')} required />
      <InputField label="Description" value={form.description} onChange={setField('description')} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.status === 1} onChange={setField('status')} className="h-4 w-4 accent-primary-600" />
        Active holiday
      </label>
    </RightModal>
  );
};

export default AddEditFestival;