import { useState } from 'react';
import InputField from '../../components/InputField';
import RightModal from '../components/RightModal';

const EMPTY_FORM = { name: '', description: '', status: true };

const normalize = (designation) => ({
  ...EMPTY_FORM,
  ...(designation ?? {}),
  name: designation?.name ?? '',
  description: designation?.description ?? '',
  status: designation?.status == null ? 1 : Number(designation.status),
});

const AddEditDesignation = ({ isOpen, designation, saving = false, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => normalize(designation));
  const [errors, setErrors] = useState({});

  const setField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Designation name is required.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSubmit({
      id: form.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
    });
  };

  return (
    <RightModal
      key={`${isOpen}-${designation?.id ?? 'new'}`}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={form.id ? `Edit — ${form.name}` : 'Add Designation'}
      saving={saving}
    >
      <InputField
        label="Designation name"
        value={form.name}
        onChange={setField('name')}
        required
        error={errors.name}
        autoFocus
      />
      <InputField
        label="Description"
        value={form.description}
        onChange={setField('description')}
        error={errors.description}
      />
      <label className="flex items-center gap-2 text-sm text-(--color-text)">
        <input type="checkbox" checked={form.status === 1} onChange={setField('status')} className="h-4 w-4 accent-primary-600" />
        Active designation
      </label>
    </RightModal>
  );
};

export default AddEditDesignation;
