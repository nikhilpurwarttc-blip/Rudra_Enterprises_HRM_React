import { useState } from 'react';
import InputField from '../../components/InputField';
import RightModal from '../components/RightModal';

const EMPTY_FORM = { deduction: '', value_type: 'percentage', value: '', status: true };
const normalizeStatus = (value) =>
  value === false || value === 0 || value === '0' || value === 'false';
const AddEditCharge = ({ isOpen, charge, saving = false, errors = {}, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(charge ?? {}), status: charge ? normalizeStatus(charge.status) : true }));
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const handleSubmit = () => onSubmit({ id: form.id, deduction: form.deduction.trim(), value_type: form.value_type, value: Number(form.value), status: !form.status });
  return <RightModal key={`${isOpen}-${charge?.id ?? 'new'}`} isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title={form.id ? 'Edit Charge' : 'Add Charge'} saving={saving}><InputField label="Deduction name" value={form.deduction} onChange={setField('deduction')} error={errors.deduction} required /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-1"><label className="block text-xs font-medium text-(--color-text-muted)">Value type</label><select value={form.value_type} onChange={setField('value_type')} className="w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-3 text-sm text-(--color-text)"><option value="fixed">Fixed</option><option value="percentage">Percentage</option></select>{errors.value_type && <p className="mt-1 text-xs text-(--color-danger)">{errors.value_type}</p>}</div><InputField label="Value" type="number" min="0" step="0.01" value={form.value} onChange={setField('value')} error={errors.value} required /></div><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={form.status} onChange={setField('status')} className="h-4 w-4 accent-primary-600" /><span className="text-sm text-(--color-text)">Active charge</span></label></RightModal>;
};

export default AddEditCharge;
