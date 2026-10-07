import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetHolidaysQuery,
  useGetPlantsQuery,
  useUpdateHolidayMutation,
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
import AddEditFestival from './AddEditFestival';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '—';

const Festivals = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/festivals');
  const { data, isLoading, isError } = useGetHolidaysQuery();
  const { data: plantsData, isLoading: plantsLoading } = useGetPlantsQuery();
  const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
  const [updateHoliday, { isLoading: updating }] = useUpdateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, festival: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const holidays = unwrap(data);
  const plants = unwrap(plantsData);

  useRenderPerformance('getHolidays', data);
  useRenderPerformance('getPlants', plantsData);

  const plantMap = useMemo(() => Object.fromEntries(plants.map((plant) => [plant.id, plant])), [plants]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return holidays.filter((holiday) => [holiday.name, holiday.description, formatDate(holiday.holiday_date)].some((value) => !query || String(value ?? '').toLowerCase().includes(query)));
  }, [holidays, search]);

  const handleSave = async ({ id, ...payload }) => {
    if (!payload.plant_id.length || !payload.name || !payload.holiday_date) {
      toast('Select at least one plant, name, and date.', 'error');
      return;
    }
    try {
      if (id) await updateHoliday({ id, ...payload }).unwrap();
      else await createHoliday(payload).unwrap();
      toast(id ? 'Holiday updated successfully.' : 'Holiday created successfully.', 'success');
      setEditor({ open: false, festival: null });
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to save holiday.'), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHoliday(deleteTarget.id).unwrap();
      toast('Holiday deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to delete holiday.'), 'error');
    }
  };

  const handleStatusChange = useCallback(async (holiday) => {
    if (!canEdit || isReadOnly) return;
    const newStatus = Number(holiday.status) === 1 ? 0 : 1;
    setTogglingId(holiday.id);
    try {
      await updateHoliday({ id: holiday.id, status: newStatus }).unwrap();
      toast('Holiday status updated.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to update holiday status.'), 'error');
    } finally {
      setTogglingId(null);
    }
  }, [canEdit, isReadOnly, toast, updateHoliday]);

  const columns = useMemo(() => [
    { key: 'name', label: 'Holiday', render: (holiday) => <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white"><CalendarDays size={14} /></span><span className="font-medium">{holiday.name}</span></div> },
    { key: 'holiday_date', label: 'Date', render: (holiday) => formatDate(holiday.holiday_date) },
    { key: 'plant_id', label: 'Plants', render: (holiday) => (holiday.plant_id ?? []).map((id) => plantMap[id]?.name ?? `#${id}`).join(', ') || '—' },
    {
      key: 'status',
      label: 'Active',
      render: (holiday) => (
        <Switch
          checked={Number(holiday.status) === 1}
          disabled={!canEdit || isReadOnly}
          loading={togglingId === holiday.id}
          onClick={() => handleStatusChange(holiday)}
          ariaLabel={Number(holiday.status) === 1 ? 'Active' : 'Inactive'}
        />
      ),
    },
    { key: 'actions', label: 'Actions', sortable: false, render: (holiday) => <div className="flex items-center gap-3">{canEdit && !isReadOnly && <button type="button" aria-label="Edit holiday" onClick={() => setEditor({ open: true, festival: holiday })} className="text-(--color-accent)"><Pencil size={16} /></button>}{canDelete && !isReadOnly && <button type="button" aria-label="Delete holiday" onClick={() => setDeleteTarget(holiday)} className="text-red-500"><Trash2 size={16} /></button>}</div> },
  ], [canDelete, canEdit, handleStatusChange, isReadOnly, plantMap, togglingId]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SectionCard title="Festivals & Holidays" action={canCreate && !isReadOnly && <Button onClick={() => setEditor({ open: true, festival: null })} className="flex items-center gap-1.5"><Plus size={15} /> Add Holiday</Button>}>
        <div className="mb-4"><InputField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search holidays" leftIcon={<Search size={16} />} /></div>
        {isError ? <Feedback type="error" title="Unable to load holidays" message="Please refresh the page and try again." /> : <PageTable columns={columns} rows={filtered} total={filtered.length} label="holidays" isLoading={isLoading} />}
      </SectionCard>
      <AddEditFestival key={`${editor.open}-${editor.festival?.id ?? 'new'}`} isOpen={editor.open} festival={editor.festival} plants={plants} plantsLoading={plantsLoading} saving={creating || updating} onClose={() => setEditor({ open: false, festival: null })} onSubmit={handleSave} />
      <ConfirmDelete isOpen={Boolean(deleteTarget)} title="Delete Holiday" message={`Delete holiday "${deleteTarget?.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};

export default Festivals;
