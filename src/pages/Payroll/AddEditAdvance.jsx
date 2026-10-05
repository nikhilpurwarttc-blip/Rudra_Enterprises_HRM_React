import { useState } from 'react';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import RightModal from '../components/RightModal';

const EMPTY_FORM = {
	employee_id: '',
	advance_date: new Date().toISOString().slice(0, 10),
	amount: '',
	payment_mode: '1',
	purpose: '',
	remarks: '',
};
const paymentModeOptions = [
	{ value: '1', label: 'Cash' },
	{ value: '2', label: 'Bank' },
];

const AddEditAdvance = ({
	isOpen,
	advance,
	employees = [],
	employeesLoading = false,
	saving = false,
	errors = {},
	onClose,
	onSubmit,
}) => {
	const [form, setForm] = useState(() => ({
		...EMPTY_FORM,
		...(advance ?? {}),
		employee_id: String(advance?.employee_id ?? ''),
		advance_date: advance?.advance_date ?? EMPTY_FORM.advance_date,
		amount: advance?.amount ?? '',
		payment_mode: String(advance?.payment_mode ?? '1'),
		purpose: advance?.purpose ?? '',
		remarks: advance?.remarks ?? '',
	}));
	const employeeOptions = employees.map((employee) => ({
		value: String(employee.id),
		label: employee.name,
		searchText: `${employee.name ?? ''} ${employee.employee_code ?? ''}`,
	}));
	const updateField = (field) => (event) => {
		setForm((current) => ({ ...current, [field]: event.target.value }));
	};
	const handleSubmit = () => onSubmit({
		...(advance?.id ? { id: advance.id } : {}),
		...(!advance?.id ? { employee_id: Number(form.employee_id) } : {}),
		advance_date: form.advance_date,
		amount: Number(form.amount),
		payment_mode: Number(form.payment_mode),
		purpose: form.purpose.trim() || null,
		remarks: form.remarks.trim() || null,
	});

	return (
		<RightModal
			key={`${isOpen}-${advance?.id ?? 'new'}`}
			isOpen={isOpen}
			onClose={onClose}
			onSubmit={handleSubmit}
			title={advance ? 'Edit Advance' : 'Add Advance'}
			saving={saving}
		>
			<SearchableSelect
				label="Employee"
				options={employeeOptions}
				value={form.employee_id}
				onChange={(employee_id) => setForm((current) => ({ ...current, employee_id }))}
				placeholder="Select employee"
				isLoading={employeesLoading}
				disabled={Boolean(advance)}
				required={!advance}
				error={errors.employee_id}
			/>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<InputField
					label="Advance date"
					type="date"
					value={form.advance_date}
					onChange={updateField('advance_date')}
					required
					error={errors.advance_date}
				/>
				<InputField
					label="Amount"
					type="number"
					min={advance?.recovered_amount ?? '0.01'}
					step="0.01"
					value={form.amount}
					onChange={updateField('amount')}
					required
					error={errors.amount}
				/>
			</div>
			<SearchableSelect
				label="Payment mode"
				options={paymentModeOptions}
				value={form.payment_mode}
				onChange={(payment_mode) => setForm((current) => ({ ...current, payment_mode }))}
				showSearch={false}
				clearable={false}
				error={errors.payment_mode}
			/>
			<InputField label="Purpose" value={form.purpose} onChange={updateField('purpose')} error={errors.purpose} />
			<div className="space-y-1">
				<label htmlFor="advance-remarks" className="block text-xs font-medium text-(--color-text-muted)">Remarks</label>
				<textarea
					id="advance-remarks"
					value={form.remarks}
					onChange={updateField('remarks')}
					rows={3}
					className="w-full resize-y rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent) focus:ring-1 focus:ring-(--color-accent)"
				/>
				{errors.remarks && <p className="text-xs text-(--color-danger)">{errors.remarks}</p>}
			</div>
		</RightModal>
	);
};

export default AddEditAdvance;
