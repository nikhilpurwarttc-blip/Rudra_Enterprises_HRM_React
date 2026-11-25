import { useCallback, useMemo, useState } from 'react';
import { BriefcaseBusiness, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  useCreateDesignationMutation,
  useDeleteDesignationMutation,
  useGetDesignationsQuery,
  useUpdateDesignationMutation,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import { useToast } from '../../contexts/ToastContext';
import PageTable from '../../components/PageTable';
import InputField from '../../components/InputField';
import Switch from '../../components/Switch';
import ConfirmDelete from '../../components/ConfirmDelete';
import Button from '../../components/Button';
import { Feedback } from '../../components/Feedback';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import { useRenderPerformance } from '../../utils/performance';
import AddEditDesignation from './AddEditDesignation';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];

const Designations = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/designations');
  const { data, isLoading, isFetching, isError, refetch } = useGetDesignationsQuery({ all: true, per_page: 100 });
  const [createDesignation, { isLoading: creating }] = useCreateDesignationMutation();
  const [updateDesignation, { isLoading: updating }] = useUpdateDesignationMutation();
  const [deleteDesignation] = useDeleteDesignationMutation();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, designation: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const designations = unwrap(data);

  useRenderPerformance('getDesignations', data);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch().unwrap();
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to refresh designations.'), 'error');
    }
  }, [refetch, toast]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return designations.filter((designation) => !query || [designation.name, designation.description].some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [designations, search]);

  const handleSave = async ({ id, ...payload }) => {
    try {
      if (id) await updateDesignation({ id, ...payload }).unwrap();
      else await createDesignation(payload).unwrap();
      toast(id ? 'Designation updated successfully.' : 'Designation created successfully.', 'success');
      setEditor({ open: false, designation: null });
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to save designation.'), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDesignation(deleteTarget.id).unwrap();
      toast('Designation deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to delete designation.'), 'error');
    }
  };

  const handleStatusChange = useCallback(
    async (designation) => {
      if (!canEdit || isReadOnly) return;
      const newStatus = Number(designation.status) === 1 ? 0 : 1;
      setTogglingId(designation.id);
      try {
        await updateDesignation({ id: designation.id, status: newStatus }).unwrap();
        toast('Designation status updated.', 'success');
      } catch (error) {
        toast(getApiErrorMessage(error, 'Unable to update designation status.'), 'error');
      } finally {
        setTogglingId(null);
      }
    },
    [canEdit, isReadOnly, toast, updateDesignation]
  );

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Designation',
      render: (designation) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white"><BriefcaseBusiness size={14} /></span>
          <span className="font-medium text-(--color-text)">{designation.name}</span>
        </div>
      ),
    },
    { key: 'description', label: 'Description', render: (designation) => designation.description || '—' },
    {
      key: 'status',
      label: 'Active',
      render: (designation) => {
        const active = Number(designation.status) === 1;
        return (
          <Switch
            checked={active}
            disabled={!canEdit || isReadOnly}
            loading={togglingId === designation.id}
            onClick={() => handleStatusChange(designation)}
            ariaLabel={active ? 'Active' : 'Inactive'}
          />
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (designation) => (
        <div className="flex items-center gap-3">
          {canEdit && !isReadOnly && <button type="button" aria-label={`Edit ${designation.name}`} onClick={() => setEditor({ open: true, designation })} className="text-(--color-accent)"><Pencil size={16} /></button>}
          {canDelete && !isReadOnly && <button type="button" aria-label={`Delete ${designation.name}`} onClick={() => setDeleteTarget(designation)} className="text-red-500"><Trash2 size={16} /></button>}
          {!canEdit && !canDelete && <span className="text-xs text-(--color-text-muted)">—</span>}
        </div>
      ),
    },
  ], [canDelete, canEdit, handleStatusChange, isReadOnly, togglingId]);

  return (
    <div className="h-full w-full max-w-7xl mx-auto space-y-4 p-4 sm:p-6">
      {/* <SectionCard
        title="Designations"
        onRefresh={refetch}
        action={canCreate && !isReadOnly && <Button type="button" onClick={() => setEditor({ open: true, designation: null })} className="flex items-center gap-1.5"><Plus size={15} /> Add Designation</Button>}
      > */}
      <div className="flex justify-between mb-4">
        <div className="max-w-0 flex-1 sm:max-w-xs">
          <InputField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search designations" leftIcon={<Search size={16} />} />
        </div>
        <div className="flex items-center gap-2">
          {canCreate && !isReadOnly && <Button type="button" onClick={() => setEditor({ open: true, designation: null })} className="flex items-center gap-1.5 p-2.5"><Plus size={17} className="hover:scale-140" /> </Button>}
          <Button
            type="button"
            variant="ghost"
            aria-label="Refresh Designations"
            title="Refresh Designations"
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center justify-center p-2.5 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={16} className={`transition-transform duration-200 ${isFetching ? 'animate-spin' : 'hover:scale-110'}`} />
          </Button>
        </div>
      </div>
      {isError ? <Feedback type="error" title="Unable to load designations" message="Please refresh the page and try again." /> : <PageTable columns={columns} rows={filtered} total={filtered.length} label="designations" isLoading={isLoading} />}
      {/* </SectionCard> */}

      <AddEditDesignation
        key={`${editor.open}-${editor.designation?.id ?? 'new'}`}
        isOpen={editor.open}
        designation={editor.designation}
        saving={creating || updating}
        onClose={() => setEditor({ open: false, designation: null })}
        onSubmit={handleSave}
      />

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Designation"
        message={`Delete designation "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Designations;
