import { useMemo, useState } from 'react';
import { Banknote, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useCancelEmployeeAdvanceMutation,
  useCreateEmployeeAdvanceMutation,
  useGetEmployeeAdvancesQuery,
  useGetEmployeesQuery,
  useRecoverEmployeeAdvanceMutation,
  useUpdateEmployeeAdvanceMutation,
} from '../../store/api';
import { useToast } from '../../contexts/ToastContext';
import usePermission from '../../hooks/usePermission';
import SectionCard from '../../components/SectionCard';
import PageTable from '../../components/PageTable';
import Pagination from '../../components/Pagination';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import Button from '../../components/Button';
import ConfirmDelete from '../../components/ConfirmDelete';
import { Feedback } from '../../components/Feedback';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import RightModal from '../components/RightModal';
import AddEditAdvance from './AddEditAdvance';

const unwrap = (value) => (Array.isArray(value) ? value : value?.data ?? []);
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const paymentModeName = (mode) => (Number(mode) === 1 ? 'Cash' : 'Bank');
const statusName = (status) => ({ 1: 'Pending', 2: 'Recovered', 3: 'Cancelled' }[Number(status)] ?? 'Unknown');
const paymentModeOptions = [
  { value: '', label: 'All payment modes' },
  { value: '1', label: 'Cash' },
  { value: '2', label: 'Bank' },
];
const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: '1', label: 'Pending' },
  { value: '2', label: 'Recovered' },
  { value: '3', label: 'Cancelled' },
];
const statusClass = (status) => ({
  1: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  2: 'bg-green-500/10 text-green-700 dark:text-green-300',
  3: 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
}[Number(status)] ?? 'bg-gray-500/10 text-gray-600');
const formatDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString() : '—';
const currentMonth = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

const Advances = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/advances');
  const [filters, setFilters] = useState({ page: 1, per_page: 15, employee_id: '', payment_mode: '', status: '', start_date: '', end_date: '' });
  const { data, isLoading, isError } = useGetEmployeeAdvancesQuery(filters);
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery({ per_page: 100 });
  const [createAdvance, { isLoading: creating }] = useCreateEmployeeAdvanceMutation();
  const [updateAdvance, { isLoading: updating }] = useUpdateEmployeeAdvanceMutation();
  const [recoverAdvance, { isLoading: recovering }] = useRecoverEmployeeAdvanceMutation();
  const [cancelAdvance] = useCancelEmployeeAdvanceMutation();
  const [editor, setEditor] = useState({ open: false, advance: null });
  const [formErrors, setFormErrors] = useState({});
  const [recoveryTarget, setRecoveryTarget] = useState(null);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const advances = unwrap(data);
  const employees = unwrap(employeesData);
  const meta = data?.meta ?? {};
  const page = Number(meta.current_page ?? filters.page);
  const lastPage = Number(meta.last_page ?? 1);
  const total = Number(meta.total ?? advances.length);
  const employeeOptions = useMemo(() => [
    { value: '', label: 'All employees' },
    ...employees.map((employee) => ({
      value: String(employee.id),
      label: employee.name,
      searchText: `${employee.name ?? ''} ${employee.employee_code ?? ''}`,
    })),
  ], [employees]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  const closeEditor = () => {
    setEditor({ open: false, advance: null });
    setFormErrors({});
  };

  const handleSave = async (payload) => {
    const errors = {};
    if (!payload.advance_date) errors.advance_date = 'Advance date is required.';
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) errors.amount = 'Enter an amount greater than zero.';
    else if (payload.id && payload.amount < Number(editor.advance?.recovered_amount ?? 0)) errors.amount = 'Amount cannot be less than the amount already recovered.';
    if (!payload.id && !payload.employee_id) errors.employee_id = 'Select an employee.';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      if (payload.id) await updateAdvance(payload).unwrap();
      else await createAdvance(payload).unwrap();
      toast(payload.id ? 'Advance updated successfully.' : 'Advance created successfully.', 'success');
      closeEditor();
    } catch (error) {
      const serverErrors = error?.data?.errors ?? {};
      setFormErrors(Object.fromEntries(Object.entries(serverErrors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages])));
      toast(getApiErrorMessage(error, 'Unable to save advance.'), 'error');
    }
  };

  const handleRecover = async () => {
    const amount = Number(recoveryAmount);
    const remaining = Number(recoveryTarget?.remaining_amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast('Enter a recovery amount greater than zero and no more than the remaining balance.', 'error');
      return;
    }
    try {
      await recoverAdvance({ id: recoveryTarget.id, recovery_amount: amount }).unwrap();
      toast('Advance recovery recorded.', 'success');
      setRecoveryTarget(null);
      setRecoveryAmount('');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to recover advance.'), 'error');
    }
  };

  const handleCancel = async () => {
    if (!deleteTarget) return;
    try {
      await cancelAdvance(deleteTarget.id).unwrap();
      toast('Advance cancelled.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to cancel advance.'), 'error');
    }
  };

  const columns = useMemo(() => [
    {
      key: 'employee',
      label: 'Employee',
      render: (advance) => <div className="min-w-36"><p className="font-medium">{advance.employee?.name ?? `Employee #${advance.employee_id}`}</p><p className="text-xs text-(--color-text-muted)">{advance.employee?.employee_code ?? ''}</p></div>,
    },
    { key: 'advance_date', label: 'Advance date', render: (advance) => formatDate(advance.advance_date) },
    { key: 'amount', label: 'Amount', render: (advance) => <span className="font-semibold">{currency.format(Number(advance.amount))}</span> },
    { key: 'payment_mode', label: 'Mode', render: (advance) => <span className="inline-flex items-center gap-1.5"><Banknote size={15} className="text-(--color-accent)" />{advance.payment_mode_name ?? paymentModeName(advance.payment_mode)}</span> },
    { key: 'recovered_amount', label: 'Recovered', render: (advance) => currency.format(Number(advance.recovered_amount ?? 0)) },
    { key: 'remaining_amount', label: 'Remaining', render: (advance) => <span className="font-medium">{currency.format(Number(advance.remaining_amount ?? 0))}</span> },
    { key: 'settlement_date', label: 'Settlement date', render: (advance) => formatDate(advance.settlement_date) },
    {
      key: 'status',
      label: 'Status',
      render: (advance) => <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass(advance.status)}`}>{advance.status_name ?? statusName(advance.status)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (advance) => {
        const isPending = Number(advance.status) === 1;
        const canRecoverThisMonth = String(advance.advance_date ?? '').slice(0, 7) === currentMonth();
        const canModify = canEdit && !isReadOnly && isPending;
        const canCancel = canDelete && !isReadOnly && isPending && Number(advance.recovered_amount ?? 0) === 0;
        return (
          <div className="flex items-center gap-3">
            {canModify && <button type="button" aria-label={`Edit advance for ${advance.employee?.name ?? 'employee'}`} title="Edit advance" onClick={() => { setFormErrors({}); setEditor({ open: true, advance }); }} className="text-(--color-accent)"><Pencil size={16} /></button>}
            {canModify && canRecoverThisMonth && <button type="button" aria-label={`Recover advance for ${advance.employee?.name ?? 'employee'}`} title="Record recovery" onClick={() => { setRecoveryTarget(advance); setRecoveryAmount(''); }} className="text-green-600"><HandCoins size={17} /></button>}
            {canModify && !canRecoverThisMonth && <span title="Recovery must be made in the month the advance was taken" className="text-xs text-(--color-text-muted)">Recovery closed</span>}
            {canCancel && <button type="button" aria-label={`Cancel advance for ${advance.employee?.name ?? 'employee'}`} title="Cancel advance" onClick={() => setDeleteTarget(advance)} className="text-red-500"><Trash2 size={16} /></button>}
            {!canModify && !canCancel && <span className="text-xs text-(--color-text-muted)">—</span>}
          </div>
        );
      },
    },
  ], [canDelete, canEdit, isReadOnly]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SectionCard
        title="Cash & Bank Advances"
        action={canCreate && !isReadOnly && <Button type="button" onClick={() => { setFormErrors({}); setEditor({ open: true, advance: null }); }} className="flex items-center gap-1.5"><Plus size={15} /> Add Advance</Button>}
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SearchableSelect options={employeeOptions} value={filters.employee_id} onChange={(value) => updateFilter('employee_id', value)} placeholder="All employees" isLoading={employeesLoading} />
          <SearchableSelect ariaLabel="Filter by payment mode" options={paymentModeOptions} value={filters.payment_mode} onChange={(value) => updateFilter('payment_mode', value)} placeholder="All payment modes" showSearch={false} />
          <SearchableSelect ariaLabel="Filter by status" options={statusOptions} value={filters.status} onChange={(value) => updateFilter('status', value)} placeholder="All statuses" showSearch={false} />
          <InputField aria-label="Start date" type="date" value={filters.start_date} onChange={(event) => updateFilter('start_date', event.target.value)} />
          <InputField aria-label="End date" type="date" value={filters.end_date} onChange={(event) => updateFilter('end_date', event.target.value)} />
        </div>
        {filters.start_date && filters.end_date && filters.start_date > filters.end_date && <p className="mb-3 text-sm text-(--color-danger)">Start date must be before or equal to end date.</p>}
        {isError
          ? <Feedback type="error" title="Unable to load advances" message="Please refresh the page and try again." />
          : <PageTable
            columns={columns}
            rows={filters.start_date && filters.end_date && filters.start_date > filters.end_date ? [] : advances}
            total={total}
            label="advances"
            isLoading={isLoading}
            pagination={<Pagination page={page} lastPage={lastPage} onPageChange={(nextPage) => setFilters((current) => ({ ...current, page: nextPage }))} />}
            emptyText="No advances found"
          />}
      </SectionCard>

      <AddEditAdvance
        key={`${editor.open}-${editor.advance?.id ?? 'new'}`}
        isOpen={editor.open}
        advance={editor.advance}
        employees={employees}
        employeesLoading={employeesLoading}
        errors={formErrors}
        saving={creating || updating}
        onClose={closeEditor}
        onSubmit={handleSave}
      />

      <RightModal
        isOpen={Boolean(recoveryTarget)}
        onClose={() => setRecoveryTarget(null)}
        onSubmit={handleRecover}
        title={`Recover Advance${recoveryTarget?.employee?.name ? ` · ${recoveryTarget.employee.name}` : ''}`}
        saving={recovering}
      >
        <p className="text-sm text-(--color-text-muted)">Remaining balance: <strong className="text-(--color-text)">{currency.format(Number(recoveryTarget?.remaining_amount ?? 0))}</strong></p>
        <InputField label="Recovery amount" type="number" min="0.01" max={recoveryTarget?.remaining_amount} step="0.01" value={recoveryAmount} onChange={(event) => setRecoveryAmount(event.target.value)} required />
      </RightModal>

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Cancel Advance"
        message={`Cancel the ${currency.format(Number(deleteTarget?.amount ?? 0))} advance for ${deleteTarget?.employee?.name ?? 'this employee'}? This cannot be undone.`}
        confirmLabel="Cancel Advance"
        onConfirm={handleCancel}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Advances;