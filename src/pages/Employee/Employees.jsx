import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, LoaderCircle, MoreVertical, Pencil, Plus, Search, UserRound, IdCard, WalletCards } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateEmployeeMutation,
  useCreateEmployeeBankAccountMutation,
  useCreateEmployeeDocumentMutation,
  useDeleteEmployeeBankAccountMutation,
  useDeleteEmployeeDocumentMutation,
  useGetChargesQuery,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
  useLazyGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useGetEmployeeBankAccountsQuery,
  useGetEmployeeDocumentsQuery,
  useGetPlantsQuery,
  useGetShiftsQuery,
  useUpdateEmployeeMutation,
  useGetAttendanceFiltersQuery,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/Button';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import Switch from '../../components/Switch';
import { Feedback } from '../../components/Feedback';
import AddEditEmployee from './AddEditEmployee';
import EmployeeProfile from './EmployeeProfile';
import EmployeeAttendance from './EmployeeAttendance';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import { useRenderPerformance } from '../../utils/performance';
import { selectRole } from '../../store/authSlice';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
const initials = (name) => String(name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const matchesEmployeeSearch = (employee, query) => {
  const normalizedQuery = query.toLocaleLowerCase();
  return [
    employee.name,
    employee.employee_code,
    employee.barcode,
    employee.email,
    employee.mobile_number,
  ].some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedQuery));
};
const EmployeePlaceholder = ({ employee, type }) => {
  const isAttendance = type === 'attendance';
  const Icon = isAttendance ? CalendarDays : WalletCards;
  const title = isAttendance ? 'Attendance' : 'Salary';

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <Icon size={36} className="mx-auto mb-3 text-(--color-accent)" />
        <h2 className="text-lg font-semibold text-(--color-text)">{employee.name} {title}</h2>
        <p className="mt-2 text-sm text-(--color-text-muted)">{title} details for this employee will appear here.</p>
      </div>
    </div>
  );
};

const Employees = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { canCreate, canEdit, isReadOnly } = usePermission('/employees');
  const role = useSelector(selectRole);
  const [loadedEmployees, setLoadedEmployees] = useState([]);
  const [cachedEmployees, setCachedEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fetchEmployees, { isLoading, isFetching }] = useLazyGetEmployeesQuery();
  const requestVersion = useRef(0);
  const loadingEmployees = useRef(false);
  const searchTimeout = useRef(null);
  const { data: selectedEmployeeData } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: plantsData, isLoading: plantsLoading } = useGetPlantsQuery();
  const { data: departmentsData } = useGetDepartmentsQuery();
  const { data: designationsData } = useGetDesignationsQuery();
  const { data: shiftsData } = useGetShiftsQuery();
  const { data: chargesData } = useGetChargesQuery();
  // Also fetch attendance filters — same endpoint Marking.jsx uses, always accessible
  // Use it as fallback so dropdowns work even without master data permissions
  const { data: attendanceFilters } = useGetAttendanceFiltersQuery();
  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const [createEmployeeDocument, { isLoading: savingDocument }] = useCreateEmployeeDocumentMutation();
  const [deleteEmployeeDocument] = useDeleteEmployeeDocumentMutation();
  const [createEmployeeBankAccount, { isLoading: savingAccount }] = useCreateEmployeeBankAccountMutation();
  const [deleteEmployeeBankAccount] = useDeleteEmployeeBankAccountMutation();
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [menuEmployeeId, setMenuEmployeeId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [savingStatusIds, setSavingStatusIds] = useState({});
  const [errors, setErrors] = useState({});
  const [hasLoadError, setHasLoadError] = useState(false);

  const plants       = unwrap(plantsData).length      ? unwrap(plantsData)      : unwrap(attendanceFilters?.plants);
  const departments  = unwrap(departmentsData).length  ? unwrap(departmentsData)  : unwrap(attendanceFilters?.departments);
  const designations = unwrap(designationsData);
  const shifts       = unwrap(shiftsData).length       ? unwrap(shiftsData)       : unwrap(attendanceFilters?.shifts);
  const charges      = unwrap(chargesData).length      ? unwrap(chargesData)      : unwrap(attendanceFilters?.charges);
  const isSinglePlantRole = Array.isArray(role?.plant_ids) && role.plant_ids.length === 1;
  const searchQuery = search.trim();
  const localEmployees = useMemo(() => cachedEmployees.filter((employee) => {
    const matchesPlant = !plantFilter || String(employee.plant_id ?? employee.plant?.id) === String(plantFilter);
    return matchesPlant && (!searchQuery || matchesEmployeeSearch(employee, searchQuery));
  }), [cachedEmployees, plantFilter, searchQuery]);
  const hasLocalSearchResults = Boolean(searchQuery) && localEmployees.length > 0;
  const employeesData = cachedEmployees.length > 0 && (!searchQuery || hasLocalSearchResults)
    ? localEmployees
    : searchQuery && debouncedSearch !== searchQuery
      ? []
      : loadedEmployees;
  const displayedEmployeeCount = hasLocalSearchResults ? localEmployees.length : totalEmployees || employeesData.length;
  const refreshedEmployee = selectedEmployeeData?.data ?? selectedEmployeeData;
  const selectedEmployee = refreshedEmployee?.id
    ? refreshedEmployee
    : employeesData.find((employee) => String(employee.id) === String(id));
  const displayEmployeesData = employeesData.map((employee) => (
    String(employee.id) === String(refreshedEmployee?.id)
      ? { ...employee, ...refreshedEmployee }
      : employee
  ));
  const workflowEmployee = selectedEmployee ?? createdEmployee;
  const workflowEmployeeId = workflowEmployee?.id ?? (location.pathname.endsWith('/edit') ? id : null);
  const { data: employeeDocumentsData, isLoading: employeeDocumentsLoading } = useGetEmployeeDocumentsQuery(workflowEmployeeId, { skip: !workflowEmployeeId });
  const { data: employeeAccountsData, isLoading: employeeAccountsLoading } = useGetEmployeeBankAccountsQuery(workflowEmployeeId, { skip: !workflowEmployeeId });
  const employeeDocuments = unwrap(employeeDocumentsData);
  const employeeAccounts = unwrap(employeeAccountsData);
  const isAddRoute = location.pathname === '/employees/add';
  const isEditRoute = location.pathname.endsWith('/edit');
  const activeView = location.pathname.endsWith('/attendance')
    ? 'attendance'
    : location.pathname.endsWith('/salary')
      ? 'salary'
      : 'profile';

  useRenderPerformance('getEmployees', loadedEmployees);

  const loadEmployeePages = useCallback(async (startPage, query, plantId, replace = false, version = requestVersion.current) => {
    if (loadingEmployees.current) return;

    loadingEmployees.current = true;
    let page = startPage;
    let replacePage = replace;

    try {
      while (version === requestVersion.current) {
        const response = await fetchEmployees({ page, per_page: 100, search: query, plant_id: plantId }).unwrap();
        if (version !== requestVersion.current) break;

        const pageEmployees = unwrap(response);
        setLoadedEmployees((current) => {
          if (replacePage) return pageEmployees;

          const existingIds = new Set(current.map((employee) => employee.id));
          return [...current, ...pageEmployees.filter((employee) => !existingIds.has(employee.id))];
        });
        if (!query && !plantId) {
          setCachedEmployees((current) => {
            if (replacePage) return pageEmployees;

            const existingIds = new Set(current.map((employee) => employee.id));
            return [...current, ...pageEmployees.filter((employee) => !existingIds.has(employee.id))];
          });
        }
        setTotalEmployees(Number(response.meta?.total ?? pageEmployees.length));
        const currentPage = Number(response.meta?.current_page ?? page);
        const lastPage = Number(response.meta?.last_page ?? currentPage);
        setHasLoadError(false);

        if (currentPage >= lastPage) break;
        page = currentPage + 1;
        replacePage = false;
      }
    } catch {
      if (version === requestVersion.current) setHasLoadError(true);
    } finally {
      if (version === requestVersion.current) loadingEmployees.current = false;
    }
  }, [fetchEmployees]);

  useEffect(() => {
    loadEmployeePages(1, '', '', true);
    return () => {
      window.clearTimeout(searchTimeout.current);
      requestVersion.current += 1;
      loadingEmployees.current = false;
    };
  }, [loadEmployeePages]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    const query = value.trim();
    const version = ++requestVersion.current;
    loadingEmployees.current = false;
    setSearch(value);
    setHasLoadError(false);
    window.clearTimeout(searchTimeout.current);
    if (query && cachedEmployees.some((employee) => {
      const matchesPlant = !plantFilter || String(employee.plant_id ?? employee.plant?.id) === String(plantFilter);
      return matchesPlant && matchesEmployeeSearch(employee, query);
    })) {
      setDebouncedSearch(query);
      return;
    }
    searchTimeout.current = window.setTimeout(() => {
      setDebouncedSearch(query);
      loadEmployeePages(1, query, plantFilter, true, version);
    }, 250);
  };

  const handlePlantFilterChange = (plantId) => {
    const query = search.trim();
    const version = ++requestVersion.current;
    loadingEmployees.current = false;
    window.clearTimeout(searchTimeout.current);
    setPlantFilter(plantId);
    setHasLoadError(false);
    if (query && cachedEmployees.some((employee) => {
      const matchesPlant = !plantId || String(employee.plant_id ?? employee.plant?.id) === String(plantId);
      return matchesPlant && matchesEmployeeSearch(employee, query);
    })) {
      setDebouncedSearch(query);
      return;
    }
    setDebouncedSearch(query);
    loadEmployeePages(1, query, plantId, true, version);
  };

  const isSearchPending = debouncedSearch !== search.trim();
  const isEmployeeLoading = isSearchPending || isLoading || isFetching;

  const openEmployeeView = (employee, view = 'profile') => {
    setMenuEmployeeId(null);
    setMenuPosition(null);
    navigate(view === 'profile' ? `/employees/${employee.id}` : `/employees/${employee.id}/${view}`);
  };

  const toggleEmployeeStatus = async (employee) => {
    const previousStatus = Boolean(employee.status);
    const nextStatus = !previousStatus;
    setSavingStatusIds((current) => ({ ...current, [employee.id]: true }));
    setLoadedEmployees((current) => current.map((item) => (
      String(item.id) === String(employee.id) ? { ...item, status: nextStatus } : item
    )));
    setCachedEmployees((current) => current.map((item) => (
      String(item.id) === String(employee.id) ? { ...item, status: nextStatus } : item
    )));

    try {
      const response = await updateEmployee({ id: employee.id, status: nextStatus }).unwrap();
      const updatedEmployee = response?.data ?? response;
      setLoadedEmployees((current) => current.map((item) => (
        String(item.id) === String(employee.id) ? { ...item, ...updatedEmployee } : item
      )));
      setCachedEmployees((current) => current.map((item) => (
        String(item.id) === String(employee.id) ? { ...item, ...updatedEmployee } : item
      )));
      toast(`${employee.name} marked ${nextStatus ? 'active' : 'inactive'}.`, 'success');
    } catch (error) {
      setLoadedEmployees((current) => current.map((item) => (
        String(item.id) === String(employee.id) ? { ...item, status: previousStatus } : item
      )));
      setCachedEmployees((current) => current.map((item) => (
        String(item.id) === String(employee.id) ? { ...item, status: previousStatus } : item
      )));
      toast(getApiErrorMessage(error, `Unable to update ${employee.name}'s status.`), 'error');
    } finally {
      setSavingStatusIds((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  };

  useEffect(() => {
    const closeMenuWhenClickingOutside = (event) => {
      if (!event.target.closest('[data-employee-menu]')) {
        setMenuEmployeeId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', closeMenuWhenClickingOutside);
    return () => document.removeEventListener('mousedown', closeMenuWhenClickingOutside);
  }, []);

  const handleSave = async (payload) => {
    try {
      const savedEmployee = payload.id
        ? await updateEmployee(payload).unwrap()
        : await createEmployee(payload).unwrap();
      const employeeRecord = savedEmployee?.data ?? savedEmployee;
      setCreatedEmployee(employeeRecord);
      if (payload.id) {
        setLoadedEmployees((current) => current.map((employee) => (
          String(employee.id) === String(employeeRecord.id)
            ? { ...employee, ...employeeRecord }
            : employee
        )));
        setCachedEmployees((current) => current.map((employee) => (
          String(employee.id) === String(employeeRecord.id)
            ? { ...employee, ...employeeRecord }
            : employee
        )));
      }
      const createdStatus = employeeRecord?.approval_status_label ?? 'Pending';
      toast(
        payload.id
          ? 'Employee updated successfully.'
          : createdStatus === 'Approved'
            ? 'Employee created and approved successfully.'
            : 'Employee created and sent for approval.',
        'success',
      );
      setErrors({});
      return employeeRecord;
    } catch (error) {
      setErrors(error?.data?.errors ?? {});
      toast(getApiErrorMessage(error, 'Unable to save employee.'), 'error');
      return null;
    }
  };

  const handleSaveDocument = async (payload) => {
    try {
      await createEmployeeDocument(payload).unwrap();
      toast('KYC document submitted.', 'success');
      return true;
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to submit KYC document.'), 'error');
      return false;
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteEmployeeDocument(documentId).unwrap();
      toast('KYC document removed.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to remove KYC document.'), 'error');
    }
  };

  const handleSaveAccount = async (payload) => {
    try {
      await createEmployeeBankAccount(payload).unwrap();
      toast('Bank account details submitted.', 'success');
      return true;
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to submit bank account details.'), 'error');
      return false;
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      await deleteEmployeeBankAccount(accountId).unwrap();
      toast('Bank account removed.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to remove bank account.'), 'error');
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <aside className="flex w-full max-w-md shrink-0 flex-col border-r border-(--color-border) bg-(--color-bg-elevated) lg:w-92">
        {/* Header */}
        <div className="border-b border-(--color-border) px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Employee Management</p>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-(--color-text)">Employees <span className="ml-1 text-xs font-normal text-(--color-text-muted)">{displayedEmployeeCount}</span></h1>
              </div>
            </div>
            {canCreate && !isReadOnly && <Button type="button" onClick={() => { setCreatedEmployee(null); navigate('/employees/add'); }} className="flex items-center gap-1.5 "><Plus size={18} /></Button>}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <InputField className="min-w-0 max-w-52 flex-1" value={search} onChange={handleSearchChange} placeholder="Search employees" leftIcon={<Search size={16} />} rightIcon={isEmployeeLoading && <LoaderCircle size={15} className="animate-spin" />} />
            {!isSinglePlantRole && <SearchableSelect label="Plants" ariaLabel="Filter employees by plant" options={[{ value: '', label: 'All Plants' }, ...plants.map((plant) => ({ value: String(plant.id), label: plant.name }))]} value={plantFilter} onChange={handlePlantFilterChange} placeholder="All Plants" className="min-w-22 max-w-31 shrink-0" btnClass=" px-2 text-xs" isLoading={plantsLoading} showSearch={false} />}
          </div>
        </div>

        {/* main */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {hasLoadError && employeesData.length === 0 && <Feedback type="error" title="Unable to load employees" message="Please refresh the page and try again." />}
          {!isSearchPending && !isLoading && !isFetching && !hasLoadError && employeesData.length === 0 && <p className="py-10 text-center text-sm text-(--color-text-muted)">No employees found.</p>}
          {displayEmployeesData.map((employee) => (
            <div
              key={employee.id}
              role="button"
              tabIndex={0}
              onClick={() => openEmployeeView(employee)}
              onKeyDown={(event) => event.key === 'Enter' && openEmployeeView(employee)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuEmployeeId(employee.id);
                setMenuPosition({ x: event.clientX, y: event.clientY });
              }}
              className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${String(id) === String(employee.id) ? 'border-(--color-accent) bg-(--color-accent-soft)' : 'border-transparent hover:border-(--color-border) hover:bg-(--color-accent-soft)'}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-sm font-semibold text-white">{initials(employee.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-(--color-text)">{employee.name}</span>
                <span className="mt-0.5 block truncate text-xs text-(--color-text-muted)">{employee.employee_code} · {employee.plant?.name}</span>
                <span className="mt-1 block truncate text-xs text-(--color-accent)">{employee.department?.name ?? employee.designation?.name}</span>
                {employee.approval_status_label && employee.approval_status !== 1 && (
                  <span className={`mt-1 block truncate text-xs font-medium ${employee.approval_status === 2 ? 'text-red-600' : 'text-amber-700 dark:text-amber-300'}`}>
                    {employee.approval_status_label}
                    {employee.approval_status === 2 && employee.rejection_reason ? ` · ${employee.rejection_reason}` : ''}
                  </span>
                )}
              </span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full animate-pulse ${employee.status ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
              />
              <div className="relative shrink-0">
                <button type="button" aria-label={`Actions for ${employee.name}`} onClick={(event) => { event.stopPropagation(); setMenuPosition(null); setMenuEmployeeId((current) => current === employee.id ? null : employee.id); }} className="rounded p-1 text-(--color-text-muted) hover:bg-(--color-border) hover:text-(--color-text)"><MoreVertical size={17} /></button>
                {menuEmployeeId === employee.id && 
                <div data-employee-menu className={`${menuPosition ? 'fixed' : 'absolute right-0 top-8'} z-20 w-48 rounded-lg border border-(--color-border) bg-(--color-surface-strong) shadow-lg`} style={menuPosition ? { left: menuPosition.x, top: menuPosition.y } : undefined} onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => openEmployeeView(employee)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><IdCard size={18} /> Profile</button>
                  <button type="button" onClick={() => openEmployeeView(employee, 'attendance')} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><CalendarDays size={15} /> Attendance</button>
                  <button type="button" onClick={() => openEmployeeView(employee, 'salary')} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><WalletCards size={15} /> Salary</button>
                    {canEdit && !isReadOnly && <button type="button" onClick={() => { setMenuEmployeeId(null); navigate(`/employees/${employee.id}/edit`); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><Pencil size={15} /> Edit {employee.name}</button>}
                  <div className="flex items-center justify-between gap-2 border-t border-(--color-border) px-3 py-2" onClick={(event) => event.stopPropagation()}>
                    <span className="text-sm text-(--color-text)">{employee.status ? 'Active' : 'Inactive'}</span>
                    <Switch
                      checked={Boolean(employee.status)}
                      disabled={!canEdit || isReadOnly || Boolean(savingStatusIds[employee.id])}
                      ariaLabel={`${employee.name} active status`}
                      title={employee.status ? 'Mark inactive' : 'Mark active'}
                      onClick={() => toggleEmployeeStatus(employee)}
                    />
                  </div>
                </div>}
              </div>
            </div>
          ))}
          {hasLoadError && employeesData.length > 0 && <p className="py-3 text-center text-xs text-(--color-text-muted)">Unable to load more employees.</p>}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden bg-(--color-bg)">
        {(isAddRoute || isEditRoute) && <AddEditEmployee key={`edit-${id ?? 'new'}-${isEditRoute ? selectedEmployee?.id ?? '' : ''}`} employee={isEditRoute ? selectedEmployee : createdEmployee ?? undefined} plants={plants} departments={departments} designations={designations} shifts={shifts} charges={charges} documents={employeeDocuments} accounts={employeeAccounts} documentsLoading={employeeDocumentsLoading} accountsLoading={employeeAccountsLoading} errors={errors} saving={creating || updating} savingDocument={savingDocument} savingAccount={savingAccount} onClose={() => { setCreatedEmployee(null); navigate('/employees'); }} onSubmit={handleSave} onSaveDocument={handleSaveDocument} onDeleteDocument={handleDeleteDocument} onSaveAccount={handleSaveAccount} onDeleteAccount={handleDeleteAccount} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'profile' && <EmployeeProfile employeeId={selectedEmployee.id} embedded onClose={() => navigate('/employees')} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'attendance' && <EmployeeAttendance key={selectedEmployee.id} employeeId={selectedEmployee.id} joiningDate={selectedEmployee.joining_date} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'salary' && <EmployeePlaceholder employee={selectedEmployee} type="salary" />}
        {!isAddRoute && !isEditRoute && !selectedEmployee && <div className="flex h-full items-center justify-center p-8"><div className="max-w-sm text-center text-(--color-text-muted)"><UserRound size={28} className="mx-auto mb-4 text-(--color-accent)" /><h2 className="text-base font-semibold text-(--color-text)">Select an employee</h2><p className="mt-1 text-sm">Choose an employee from the list to view their profile.</p></div></div>}
      </main>
    </div>
  );
};

export default Employees;
