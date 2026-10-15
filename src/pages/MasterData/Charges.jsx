import { useCallback, useMemo, useState } from 'react';
import { Coins, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import {
  useCreateChargeMutation,
  useDeleteChargeMutation,
  useGetChargesQuery,
  useUpdateChargeMutation,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import { useToast } from '../../contexts/ToastContext';

import SectionCard from '../../components/SectionCard';
import PageTable from '../../components/PageTable';
import InputField from '../../components/InputField';
import Switch from '../../components/Switch';
import ConfirmDelete from '../../components/ConfirmDelete';
import Button from '../../components/Button';
import { Feedback } from '../../components/Feedback';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import { useRenderPerformance } from '../../utils/performance';
import AddEditCharge from './AddEditCharge';

// Helper utilities
const unwrap = (value) => (Array.isArray(value) ? value : value?.data ?? []);
const isActive = (value) =>
  value === true || value === 1 || value === '1' || value === 'true';
const formatChargeValue = (value, valueType) => {
  const amount = Number(value ?? 0);
  return valueType === 'percentage' ? `${amount}%` : `₹${amount.toFixed(2)}`;
};
const formatCurrency = (value) => `₹${Number(value ?? 0).toFixed(2)}`;
const formatDate = (value, fallback = '—') =>
  value ? String(value).slice(0, 10) : fallback;

const Charges = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/charges');

  // Queries & Mutations
  const { data, isLoading, isError } = useGetChargesQuery({ all: true, per_page: 100 });
  const [createCharge, { isLoading: creating }] = useCreateChargeMutation();
  const [updateCharge, { isLoading: updating }] = useUpdateChargeMutation();
  const [deleteCharge] = useDeleteChargeMutation();

  // Local state
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, charge: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const [togglingId, setTogglingId] = useState(null);

  const charges = unwrap(data);
  useRenderPerformance('getCharges', data);

  // Filter charges based on search input
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return charges.filter(
      (charge) =>
        !query ||
        [charge.code, charge.name ?? charge.deduction, charge.value_type].some((value) =>
          String(value ?? '').toLowerCase().includes(query)
        )
    );
  }, [charges, search]);

  // Form submit handler
  const handleSave = async ({ id, ...payload }) => {
    const nextErrors = {};
    if (!payload.name) nextErrors.name = 'Charge name is required.';
    if (!payload.value_type) nextErrors.value_type = 'Value type is required.';
    if (
      payload.employee_value === '' ||
      !Number.isFinite(payload.employee_value) ||
      payload.employee_value < 0
    ) {
      nextErrors.employee_value = 'Employee value is required and cannot be negative.';
    }
    if (!payload.effective_from) {
      nextErrors.effective_from = 'Effective from date is required.';
    }
    if (
      payload.effective_to &&
      payload.effective_from &&
      payload.effective_to < payload.effective_from
    ) {
      nextErrors.effective_to = 'Effective to must be on or after the start date.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (id) {
        await updateCharge({ id, ...payload }).unwrap();
      } else {
        await createCharge(payload).unwrap();
      }

      toast(
        id ? 'Charge updated successfully.' : 'Charge created successfully.',
        'success'
      );
      setEditor({ open: false, charge: null });
      setErrors({});
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to save charge.'), 'error');
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCharge(deleteTarget.id).unwrap();
      toast('Charge deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to delete charge.'), 'error');
    }
  };

  // Status toggle handler
  const handleStatusChange = useCallback(
    async (charge) => {
      if (!canEdit || isReadOnly) return;
      setTogglingId(charge.id);
      try {
        await updateCharge({
          id: charge.id,
          status: isActive(charge.status) ? 0 : 1,
        }).unwrap();
        toast('Charge status updated.', 'success');
      } catch (error) {
        toast(getApiErrorMessage(error, 'Unable to update charge status.'), 'error');
      } finally {
        setTogglingId(null);
      }
    },
    [canEdit, isReadOnly, toast, updateCharge]
  );

  // Table columns definition
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Charge',
        render: (charge) => (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white">
              <Coins size={14} />
            </span>
            <span className="font-medium">{charge.name ?? charge.deduction}</span>
          </div>
        ),
      },
      {
        key: 'code',
        label: 'Code',
        render: (charge) => charge.code || '—',
      },
      {
        key: 'value_type',
        label: 'Type',
        render: (charge) => (charge.value_type === 'fixed' ? 'Fixed' : 'Percentage'),
      },
      {
        key: 'employee_value',
        label: 'Employee',
        render: (charge) => formatChargeValue(charge.employee_value ?? charge.value, charge.value_type),
      },
      {
        key: 'employer_value',
        label: 'Employer',
        render: (charge) => formatChargeValue(charge.employer_value, charge.value_type),
      },
      {
        key: 'salary_limit',
        label: 'Salary limit',
        render: (charge) =>
          Number(charge.salary_limit) > 0 ? formatCurrency(charge.salary_limit) : 'No limit',
      },
      {
        key: 'effective_from',
        label: 'Effective period',
        render: (charge) =>
          `${formatDate(charge.effective_from)} - ${formatDate(charge.effective_to, 'Ongoing')}`,
      },
      {
        key: 'status',
        label: 'Active',
        render: (charge) => (
          <Switch
            checked={isActive(charge.status)}
            disabled={!canEdit || isReadOnly}
            loading={togglingId === charge.id}
            onClick={() => handleStatusChange(charge)}
            ariaLabel={isActive(charge.status) ? 'Active' : 'Inactive'}
          />
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (charge) => (
          <div className="flex items-center gap-3">
            {canEdit && !isReadOnly && (
              <button
                type="button"
                aria-label="Edit charge"
                onClick={() => {
                  setErrors({});
                  setEditor({ open: true, charge });
                }}
                className="text-(--color-accent)"
              >
                <Pencil size={16} />
              </button>
            )}
            {canDelete && !isReadOnly && (
              <button
                type="button"
                aria-label="Delete charge"
                onClick={() => setDeleteTarget(charge)}
                className="text-red-500"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, handleStatusChange, isReadOnly, togglingId]
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SectionCard
        title="Charges & Allowances"
        action={
          canCreate &&
          !isReadOnly && (
            <Button
              onClick={() => {
                setErrors({});
                setEditor({ open: true, charge: null });
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Charge
            </Button>
          )
        }
      >
        <div className="mb-4">
          <InputField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search charges"
            leftIcon={<Search size={16} />}
          />
        </div>
      </SectionCard>
      
      {isError ? (
        <Feedback
          type="error"
          title="Unable to load charges"
          message="Please refresh the page and try again."
        />
      ) : (
        <PageTable
          columns={columns}
          rows={filtered}
          total={filtered.length}
          label="charges"
          isLoading={isLoading}
        />
      )}

      <AddEditCharge
        key={`${editor.open}-${editor.charge?.id ?? 'new'}`}
        isOpen={editor.open}
        charge={editor.charge}
        errors={errors}
        saving={creating || updating}
        onClose={() => setEditor({ open: false, charge: null })}
        onSubmit={handleSave}
      />

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Charge"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name ?? deleteTarget.deduction}"? This action cannot be undone.`
            : 'Are you sure you want to delete this charge?'
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Charges;