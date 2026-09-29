import { useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCreatePlantMutation, useDeletePlantMutation, useGetPlantsQuery, useUpdatePlantMutation } from '../../store/api';
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
import AddEditPlant from './AddEditPlant';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
const Plants = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/plants');
  const { data, isLoading, isError } = useGetPlantsQuery();
  const [createPlant, { isLoading: creating }] = useCreatePlantMutation();
  const [updatePlant, { isLoading: updating }] = useUpdatePlantMutation();
  const [deletePlant] = useDeletePlantMutation();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, plant: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const plants = unwrap(data);
  useRenderPerformance('getPlants', data);
  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return plants.filter((plant) => !query || [plant.plant_code, plant.name, plant.address].some((value) => String(value ?? '').toLowerCase().includes(query))); }, [plants, search]);
  const handleSave = async ({ id, ...payload }) => { if (!payload.plant_code || !payload.name) return toast('Plant code and name are required.', 'error'); try { if (id) await updatePlant({ id, ...payload }).unwrap(); else await createPlant(payload).unwrap(); toast(id ? 'Plant updated successfully.' : 'Plant created successfully.', 'success'); setEditor({ open: false, plant: null }); } catch (error) { toast(getApiErrorMessage(error, 'Unable to save plant.'), 'error'); } };
  const handleDelete = async () => { try { await deletePlant(deleteTarget.id).unwrap(); toast('Plant deleted successfully.', 'success'); setDeleteTarget(null); } catch (error) { toast(getApiErrorMessage(error, 'Unable to delete plant.'), 'error'); } };
  const columns = useMemo(() => [
    { key: 'plant_code', label: 'Code', render: (plant) => <span className="font-semibold text-(--color-accent)">{plant.plant_code}</span> },
    { key: 'name', label: 'Plant', render: (plant) => <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white"><Building2 size={14} /></span><span className="font-medium">{plant.name}</span></div> },
    { key: 'address', label: 'Address', render: (plant) => plant.address || '—' },
    { key: 'status', label: 'Status', render: (plant) => <span className={String(plant.status) === '1' ? 'text-green-600' : 'text-(--color-text-muted)'}>{String(plant.status) === '2' ? 'Suspended' : String(plant.status) === '1' ? 'Active' : 'Inactive'}</span> },
    { key: 'actions', label: 'Actions', sortable: false, render: (plant) => <div className="flex items-center gap-3">{canEdit && !isReadOnly && <button type="button" aria-label="Edit plant" onClick={() => setEditor({ open: true, plant })} className="text-(--color-accent)"><Pencil size={16} /></button>}{canDelete && !isReadOnly && <button type="button" aria-label="Delete plant" onClick={() => setDeleteTarget(plant)} className="text-red-500"><Trash2 size={16} /></button>}</div> },
  ], [canDelete, canEdit, isReadOnly]);
  return <div className="space-y-4 p-4 sm:p-6"><SectionCard title="Plant Management" action={canCreate && !isReadOnly && <Button onClick={() => setEditor({ open: true, plant: null })} className="flex items-center gap-1.5"><Plus size={15} /> Add Plant</Button>}><div className="mb-4"><InputField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plants" leftIcon={<Search size={16} />} /></div>{isError ? <Feedback type="error" title="Unable to load plants" message="Please refresh the page and try again." /> : <PageTable columns={columns} rows={filtered} total={filtered.length} label="plants" isLoading={isLoading} />}</SectionCard><AddEditPlant key={`${editor.open}-${editor.plant?.id ?? 'new'}`} isOpen={editor.open} plant={editor.plant} saving={creating || updating} onClose={() => setEditor({ open: false, plant: null })} onSubmit={handleSave} /><ConfirmDelete isOpen={Boolean(deleteTarget)} title="Delete Plant" message={`Delete plant "${deleteTarget?.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} /></div>;
};
export default Plants;
