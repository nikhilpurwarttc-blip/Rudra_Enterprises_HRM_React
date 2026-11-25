import { useCallback, useMemo, useState } from 'react';
import { Clock3, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

import {
  useCreateShiftMutation,
  useDeleteShiftMutation,
  useGetShiftsQuery,
  useUpdateShiftMutation,
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
import AddEditShift from './AddEditShift';

const unwrap = (value) => (Array.isArray(value) ? value : value?.data ?? []);

const Shifts = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/shifts');

  const { data, isLoading, isFetching, isError, refetch } = useGetShiftsQuery({ all: true, per_page: 100 });
  const [createShift, { isLoading: creating }] = useCreateShiftMutation();
  const [updateShift, { isLoading: updating }] = useUpdateShiftMutation();
  const [deleteShift] = useDeleteShiftMutation();

  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, shift: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const [togglingId, setTogglingId] = useState(null);

  const shifts = unwrap(data);
  useRenderPerformance('getShifts', data);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch().unwrap();
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to refresh shifts.'), 'error');
    }
  }, [refetch, toast]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shifts.filter(
      (shift) => !query || String(shift.name ?? '').toLowerCase().includes(query)
    );
  }, [shifts, search]);

  const handleSave = async ({ id, ...payload }) => {
    const nextErrors = {};

    if (!payload.name) nextErrors.name = 'Shift name is required.';
    if (!payload.start_time) nextErrors.start_time = 'Start time is required.';
    if (!payload.end_time) nextErrors.end_time = 'End time is required.';
    if (payload.duration_hours != null && payload.duration_hours < 0) {
      nextErrors.duration_hours = 'Duration cannot be negative.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (id) {
        await updateShift({ id, ...payload }).unwrap();
      } else {
        await createShift(payload).unwrap();
      }

      toast(id ? 'Shift updated successfully.' : 'Shift created successfully.', 'success');
      setEditor({ open: false, shift: null });
      setErrors({});
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to save shift.'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteShift(deleteTarget.id).unwrap();
      toast('Shift deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to delete shift.'), 'error');
    }
  };

  const handleStatusChange = useCallback(
    async (shift) => {
      if (!canEdit || isReadOnly) return;
      const newStatus = Number(shift.status) === 1 ? 0 : 1;
      setTogglingId(shift.id);
      try {
        await updateShift({ id: shift.id, status: newStatus }).unwrap();
        toast('Shift status updated.', 'success');
      } catch (error) {
        toast(getApiErrorMessage(error, 'Unable to update shift status.'), 'error');
      } finally {
        setTogglingId(null);
      }
    },
    [canEdit, isReadOnly, toast, updateShift]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Shift',
        render: (shift) => (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white">
              <Clock3 size={14} />
            </span>
            <span className="font-medium">{shift.name}</span>
          </div>
        ),
      },
      {
        key: 'start_time',
        label: 'Start',
        render: (shift) => String(shift.start_time ?? '').slice(0, 5),
      },
      {
        key: 'end_time',
        label: 'End',
        render: (shift) => String(shift.end_time ?? '').slice(0, 5),
      },
      {
        key: 'duration_hours',
        label: 'Duration',
        render: (shift) => (shift.duration_hours == null ? '—' : `${shift.duration_hours} hrs`),
      },
      {
        key: 'status',
        label: 'Active',
        render: (shift) => {
          const isActive = Number(shift.status) === 1;
          return (
            <Switch
              checked={isActive}
              disabled={!canEdit || isReadOnly}
              loading={togglingId === shift.id}
              onClick={() => handleStatusChange(shift)}
              ariaLabel={isActive ? 'Active' : 'Inactive'}
            />
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (shift) => (
          <div className="flex items-center gap-3">
            {canEdit && !isReadOnly && (
              <button
                type="button"
                aria-label="Edit shift"
                onClick={() => {
                  setErrors({});
                  setEditor({ open: true, shift });
                }}
                className="text-(--color-accent)"
              >
                <Pencil size={16} />
              </button>
            )}
            {canDelete && !isReadOnly && (
              <button
                type="button"
                aria-label="Delete shift"
                onClick={() => setDeleteTarget(shift)}
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
    <div className=" max-w-7xl mx-auto space-y-4 p-4 sm:p-6">
      {/* <SectionCard
        title="Shift Hours"
        onRefresh={refetch}
        action={
          canCreate &&
          !isReadOnly && (
            <Button
              onClick={() => {
                setErrors({});
                setEditor({ open: true, shift: null });
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Shift
            </Button>
          )
        }
      > */}
      <div className="flex justify-between mb-4">
        <div className="max-w-0 flex-1 sm:max-w-xs">
          <InputField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shifts"
            leftIcon={<Search size={16} />}
          />
        </div>
        <div className="flex items-center gap-2">
          {canCreate && !isReadOnly && (
            <Button
              onClick={() => {
                setErrors({});
                setEditor({ open: true, shift: null });
              }}
              className="flex items-center gap-1.5 p-2.5"
            >
              <Plus size={15} className="hover:scale-140" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            aria-label="Refresh Shifts"
            title="Refresh Shifts"
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center justify-center p-2.5 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={16} className={`transition-transform duration-200 ${isFetching ? 'animate-spin' : 'hover:scale-110'}`} />
          </Button>
        </div>
      </div>
      {isError ? (
        <Feedback
          type="error"
          title="Unable to load shifts"
          message="Please refresh the page and try again."
        />
      ) : (
        <PageTable
          columns={columns}
          rows={filtered}
          total={filtered.length}
          label="shifts"
          isLoading={isLoading}
        />
      )}
      {/* </SectionCard> */}

      <AddEditShift
        key={`${editor.open}-${editor.shift?.id ?? 'new'}`}
        isOpen={editor.open}
        shift={editor.shift}
        errors={errors}
        saving={creating || updating}
        onClose={() => setEditor({ open: false, shift: null })}
        onSubmit={handleSave}
      />

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Shift"
        message={`Delete shift "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Shifts;