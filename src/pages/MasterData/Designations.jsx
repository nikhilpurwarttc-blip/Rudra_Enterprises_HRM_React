import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  useCreateDesignationMutation,
  useDeleteDesignationMutation,
  useGetDesignationsQuery,
  useUpdateDesignationMutation,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import { useToast } from '../../contexts/ToastContext';
import SectionCard from '../../components/SectionCard';
import PageTable from '../../components/PageTable';
import InputField from '../../components/InputField';
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
  const { data, isLoading, isError } = useGetDesignationsQuery();
  const [createDesignation, { isLoading: creating }] = useCreateDesignationMutation();
  const [updateDesignation, { isLoading: updating }] = useUpdateDesignationMutation();
  const [deleteDesignation] = useDeleteDesignationMutation();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, designation: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const designations = unwrap(data);

  useRenderPerformance('getDesignations', data);

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
      label: 'Status',
      render: (designation) => <span className={designation.status ? 'text-green-600' : 'text-(--color-text-muted)'}>{designation.status ? 'Active' : 'Inactive'}</span>,
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
  ], [canDelete, canEdit, isReadOnly]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SectionCard
        title="Designations"
        action={canCreate && !isReadOnly && <Button type="button" onClick={() => setEditor({ open: true, designation: null })} className="flex items-center gap-1.5"><Plus size={15} /> Add Designation</Button>}
      >
        <div className="mb-4">
          <InputField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search designations" leftIcon={<Search size={16} />} />
        </div>
        {isError ? <Feedback type="error" title="Unable to load designations" message="Please refresh the page and try again." /> : <PageTable columns={columns} rows={filtered} total={filtered.length} label="designations" isLoading={isLoading} />}
      </SectionCard>

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
