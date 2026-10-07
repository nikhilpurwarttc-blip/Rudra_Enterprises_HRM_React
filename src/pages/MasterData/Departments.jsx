import { useCallback, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import {
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
  useGetPlantsQuery,
  useUpdateDepartmentMutation,
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
import AddEditDepartment from './AddEditDepartment';

const unwrap = (value) => (Array.isArray(value) ? value : value?.data ?? []);

const Departments = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/departments');

  const { data, isLoading, isError } = useGetDepartmentsQuery({ all: true, per_page: 100 });
  const { data: plantsData, isLoading: plantsLoading } = useGetPlantsQuery();

  const [createDepartment, { isLoading: creating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: updating }] = useUpdateDepartmentMutation();
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, department: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const departments = unwrap(data);
  const plants = unwrap(plantsData);

  const plantMap = useMemo(
    () => Object.fromEntries(plants.map((plant) => [plant.id, plant])),
    [plants]
  );

  useRenderPerformance('getDepartments', data);
  useRenderPerformance('getPlants', plantsData);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments.filter((department) => {
      if (!query) return true;
      const plantNames = (department.plant_ids ?? [department.plant_id]).map(
        (id) => plantMap[id]?.name
      );
      return [department.department_code, department.name, ...plantNames].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      );
    });
  }, [departments, plantMap, search]);

  const handleSave = async ({ id, ...payload }) => {
    if (!payload.plant_id?.length || !payload.department_code || !payload.name) {
      return toast('Select at least one plant, department code, and name.', 'error');
    }

    try {
      if (id) {
        await updateDepartment({ id, ...payload }).unwrap();
      } else {
        await createDepartment(payload).unwrap();
      }

      toast(
        id ? 'Department updated successfully.' : 'Department created successfully.',
        'success'
      );
      setEditor({ open: false, department: null });
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to save department.'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDepartment(deleteTarget.id).unwrap();
      toast('Department deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to delete department.'), 'error');
    }
  };

  const handleStatusChange = useCallback(
    async (department) => {
      if (!canEdit || isReadOnly) return;
      const newStatus = Number(department.status) === 1 ? 0 : 1;
      setTogglingId(department.id);
      try {
        await updateDepartment({ id: department.id, status: newStatus }).unwrap();
        toast('Department status updated.', 'success');
      } catch (error) {
        toast(getApiErrorMessage(error, 'Unable to update department status.'), 'error');
      } finally {
        setTogglingId(null);
      }
    },
    [canEdit, isReadOnly, toast, updateDepartment]
  );

  const columns = useMemo(
    () => [
      {
        key: 'department_code',
        label: 'Code',
        render: (department) => (
          <span className="font-semibold text-(--color-accent)">
            {department.department_code}
          </span>
        ),
      },
      {
        key: 'name',
        label: 'Department',
        render: (department) => (
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-(--color-accent)" />
            <span className="font-medium">{department.name}</span>
          </div>
        ),
      },
      {
        key: 'plant_id',
        label: 'Plants',
        render: (department) =>
          (department.plant_ids ?? [department.plant_id])
            .map((id) => plantMap[id]?.name ?? `Plant #${id}`)
            .join(', '),
      },
      {
        key: 'status',
        label: 'Active',
        render: (department) => {
          const isActive = Number(department.status) === 1;
          return (
            <Switch
              checked={isActive}
              disabled={!canEdit || isReadOnly}
              loading={togglingId === department.id}
              onClick={() => handleStatusChange(department)}
              ariaLabel={isActive ? 'Active' : 'Inactive'}
            />
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (department) => (
          <div className="flex items-center gap-3">
            {canEdit && !isReadOnly && (
              <button
                type="button"
                aria-label="Edit department"
                onClick={() => setEditor({ open: true, department })}
                className="text-(--color-accent)"
              >
                <Pencil size={16} />
              </button>
            )}
            {canDelete && !isReadOnly && (
              <button
                type="button"
                aria-label="Delete department"
                onClick={() => setDeleteTarget(department)}
                className="text-red-500"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, handleStatusChange, isReadOnly, plantMap, togglingId]
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SectionCard
        title="Departments"
        action={
          canCreate &&
          !isReadOnly && (
            <Button
              onClick={() => setEditor({ open: true, department: null })}
              className="flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Department
            </Button>
          )
        }
      >
        <div className="mb-4">
          <InputField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search departments"
            leftIcon={<Search size={16} />}
          />
        </div>

        {isError ? (
          <Feedback
            type="error"
            title="Unable to load departments"
            message="Please refresh the page and try again."
          />
        ) : (
          <PageTable
            columns={columns}
            rows={filtered}
            total={filtered.length}
            label="departments"
            isLoading={isLoading}
          />
        )}
      </SectionCard>

      <AddEditDepartment
        key={`${editor.open}-${editor.department?.id ?? 'new'}`}
        isOpen={editor.open}
        department={editor.department}
        plants={plants}
        plantsLoading={plantsLoading}
        saving={creating || updating}
        onClose={() => setEditor({ open: false, department: null })}
        onSubmit={handleSave}
      />

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Department"
        message={`Delete department "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Departments;