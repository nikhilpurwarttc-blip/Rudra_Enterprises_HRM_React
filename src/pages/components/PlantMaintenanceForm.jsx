import { useMemo, useState } from 'react';
import RightModal from './RightModal';
import SearchableSelect from '../../components/SearchableSelect';
import { useGetEmployeesQuery } from '../../store/api';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];

const PlantMaintenanceForm = ({
  isOpen,
  plant,
  dates = [],
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [remarks, setRemarks] = useState('');
  const employeesQuery = useGetEmployeesQuery({ per_page: 100 });
  const employees = unwrap(employeesQuery.data);
  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id),
    label: employee.name,
    searchText: `${employee.name ?? ''} ${employee.employee_code ?? ''}`,
  })), [employees]);

  return (
    <RightModal
      key={`${isOpen}-${plant?.id ?? 'plant'}`}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={() => onSubmit({ employee_id: Number(employeeId), remarks: remarks.trim() || null })}
      title="Schedule Maintenance"
      saving={saving}
      submitDisabled={!employeeId || employeesQuery.isLoading || employeesQuery.isError}
      submitLabel={dates.length > 1 ? `Schedule ${dates.length} records` : 'Schedule maintenance'}
      submitLoadingLabel="Scheduling..."
      className="w-screen md:w-[min(36rem,90vw)]"
    >
      <p className="text-sm text-(--color-text-muted)">
        {plant?.name} · {dates.length === 1 ? dates[0] : `${dates.length} selected dates`}
      </p>
      {dates.length > 1 && (
        <p className="text-xs text-(--color-text-muted)">
          A separate maintenance record will be created for each selected date.
        </p>
      )}
      <SearchableSelect
        label="Assigned employee"
        options={employeeOptions}
        value={employeeId}
        onChange={setEmployeeId}
        placeholder="Select employee"
        isLoading={employeesQuery.isLoading}
        required
        error={employeesQuery.isError ? 'Unable to load employees. Please try again.' : undefined}
      />
      {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 && (
        <p role="status" className="text-sm text-(--color-text-muted)">No employees are available to assign.</p>
      )}
      <label className="block text-sm font-medium text-(--color-text)">
        Remarks
        <textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text) focus:border-(--color-accent) focus:outline-none"
        />
      </label>
    </RightModal>
  );
};

export default PlantMaintenanceForm;
