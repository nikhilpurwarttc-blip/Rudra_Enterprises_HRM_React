import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { CalendarDays, LoaderCircle, MoreVertical, Pencil, Plus, RefreshCw, Search, UserRound, IdCard, WalletCards, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateEmployeeMutation,
  useCreateEmployeeBankAccountMutation,
  useCreateEmployeeDocumentMutation,
  useDeleteEmployeeBankAccountMutation,
  useDeleteEmployeeDocumentMutation,
  useDeleteEmployeeMutation,
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
import ConfirmDelete from '../../components/ConfirmDelete';
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
const isSafeUrl = (url) => /^https?:\/\//i.test(String(url ?? ''));
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
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/employees');
  const role = useSelector(selectRole);
  // Single Map-based store replaces dual loadedEmployees + cachedEmployees arrays
  const [employeeMap, setEmployeeMap] = useState(() => new Map());
  const [cachedIds, setCachedIds] = useState(() => new Set());
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
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [addSessionKey, setAddSessionKey] = useState(0);
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [menuEmployeeId, setMenuEmployeeId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null); // { x, y, fromButton: bool }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const menuRef = useRef(null);
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

  // Derive flat arrays from the single Map source of truth
  const loadedEmployees = useMemo(() => [...employeeMap.values()], [employeeMap]);
  const cachedEmployees = useMemo(() => loadedEmployees.filter((e) => cachedIds.has(e.id)), [loadedEmployees, cachedIds]);

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
  const selectedEmployee = useMemo(() =>
    refreshedEmployee?.id
      ? refreshedEmployee
      : employeesData.find((employee) => String(employee.id) === String(id)),
  [refreshedEmployee, employeesData, id]);
  const displayEmployeesData = useMemo(() =>
    employeesData.map((employee) =>
      String(employee.id) === String(refreshedEmployee?.id)
        ? { ...employee, ...refreshedEmployee }
        : employee
    ),
  [employeesData, refreshedEmployee]);
  const isAddRoute = location.pathname === '/employees/add';
  const isEditRoute = location.pathname.endsWith('/edit');
  const activeView = location.pathname.endsWith('/attendance')
    ? 'attendance'
    : location.pathname.endsWith('/salary')
      ? 'salary'
      : 'profile';

  // For add-route: only use createdEmployee (the just-saved new record).
  // For edit-route: use the selected employee from the list/params.
  // Never fall back to a previously selected employee when adding a new one.
  const workflowEmployee = isAddRoute ? createdEmployee : (isEditRoute ? selectedEmployee : null);
  const workflowEmployeeId = workflowEmployee?.id ?? null;
  const { data: employeeDocumentsData, isLoading: employeeDocumentsLoading } = useGetEmployeeDocumentsQuery(workflowEmployeeId, { skip: !workflowEmployeeId });
  const { data: employeeAccountsData, isLoading: employeeAccountsLoading } = useGetEmployeeBankAccountsQuery(workflowEmployeeId, { skip: !workflowEmployeeId });
  const employeeDocuments = unwrap(employeeDocumentsData);
  const employeeAccounts = unwrap(employeeAccountsData);
  // const removedActiveView = location.pathname.endsWith('/attendance')
  //   ? 'attendance'
  //   : location.pathname.endsWith('/salary')
  //     ? 'salary'
  //     : 'profile';

  useRenderPerformance('getEmployees', loadedEmployees);

  // Merge employees into the single Map — O(1) per employee, no duplicate scans
  const mergeEmployees = useCallback((pageEmployees, replace, isUnfiltered) => {
    setEmployeeMap((prev) => {
      const next = replace ? new Map() : new Map(prev);
      pageEmployees.forEach((e) => next.set(e.id, e));
      return next;
    });
    if (isUnfiltered) {
      setCachedIds((prev) => {
        if (replace) return new Set(pageEmployees.map((e) => e.id));
        const next = new Set(prev);
        pageEmployees.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }, []);

  const loadEmployeePages = useCallback(async (startPage, query, plantId, replace = false, version = requestVersion.current) => {
    if (loadingEmployees.current) return;

    loadingEmployees.current = true;
    let page = startPage;
    let replacePage = replace;
    const isUnfiltered = !query && !plantId;

    try {
      while (version === requestVersion.current) {
        const response = await fetchEmployees({ page, per_page: 100, search: query, plant_id: plantId }).unwrap();
        if (version !== requestVersion.current) break;

        const pageEmployees = unwrap(response);
        mergeEmployees(pageEmployees, replacePage, isUnfiltered);
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
  }, [fetchEmployees, mergeEmployees]);

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

  const handleRefreshEmployees = () => {
    const query = search.trim();
    const version = ++requestVersion.current;
    loadingEmployees.current = false;
    window.clearTimeout(searchTimeout.current);
    setDebouncedSearch(query);
    setHasLoadError(false);
    loadEmployeePages(1, query, plantFilter, true, version);
  };

  const isSearchPending = debouncedSearch !== search.trim();
  const isEmployeeLoading = isSearchPending || isLoading || isFetching;

  const openEmployeeView = (employee, view = 'profile') => {
    setMenuEmployeeId(null);
    setMenuPosition(null);
    navigate(view === 'profile' ? `/employees/${employee.id}` : `/employees/${employee.id}/${view}`);
  };

  // Optimistic status toggle — single Map update instead of two array maps
  const patchEmployee = useCallback((employeeId, patch) => {
    setEmployeeMap((prev) => {
      const existing = prev.get(employeeId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(employeeId, { ...existing, ...patch });
      return next;
    });
  }, []);

  const toggleEmployeeStatus = async (employee) => {
    const previousStatus = Boolean(employee.status);
    const nextStatus = !previousStatus;
    setSavingStatusIds((current) => ({ ...current, [employee.id]: true }));
    patchEmployee(employee.id, { status: nextStatus });

    try {
      const response = await updateEmployee({ id: employee.id, status: nextStatus }).unwrap();
      patchEmployee(employee.id, response?.data ?? response);
      toast(`${employee.name} marked ${nextStatus ? 'active' : 'inactive'}.`, 'success');
    } catch (error) {
      patchEmployee(employee.id, { status: previousStatus });
      toast(getApiErrorMessage(error, `Unable to update ${employee.name}'s status.`), 'error');
    } finally {
      setSavingStatusIds((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  };

  const handleDeleteEmployee = async () => {
    if (!canDelete || isReadOnly || !deleteTarget?.id) {
      toast('You do not have permission to delete employees.', 'error');
      return;
    }

    try {
      await deleteEmployee(deleteTarget.id).unwrap();
      setEmployeeMap((current) => {
        const next = new Map(current);
        next.delete(deleteTarget.id);
        return next;
      });
      setCachedIds((current) => {
        const next = new Set(current);
        next.delete(deleteTarget.id);
        return next;
      });
      setTotalEmployees((current) => Math.max(0, current - 1));
      setDeleteTarget(null);
      toast(`${deleteTarget.name} deleted successfully.`, 'success');
      if (String(id) === String(deleteTarget.id)) navigate('/employees');
    } catch (error) {
      toast(getApiErrorMessage(error, `Unable to delete ${deleteTarget.name}.`), 'error');
    }
  };

  // Use a ref to avoid stale closure over menuEmployeeId
  const menuEmployeeIdRef = useRef(null);
  useEffect(() => { menuEmployeeIdRef.current = menuEmployeeId; }, [menuEmployeeId]);

  // Clamp menu into viewport after it renders — handles both right-click and three-dot button
  useEffect(() => {
    if (!menuPosition || !menuRef.current) return;
    const menu = menuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 6;

    let left = menuPosition.fromButton ? menuPosition.x - width : menuPosition.x + 4;
    let top  = menuPosition.fromButton ? menuPosition.y : menuPosition.y + 4;

    // Flip left if overflows right edge
    if (left + width + MARGIN > vw) left = menuPosition.x - width;
    // Clamp to left edge
    if (left < MARGIN) left = MARGIN;
    // Flip up if overflows bottom edge
    if (top + height + MARGIN > vh) top = menuPosition.y - height;
    // Clamp to top edge
    if (top < MARGIN) top = MARGIN;

    menu.style.left = `${left}px`;
    menu.style.top  = `${top}px`;
    menu.style.visibility = 'visible';
  }, [menuPosition, menuEmployeeId]);

  useEffect(() => {
    const closeMenuWhenClickingOutside = (event) => {
      if (menuEmployeeIdRef.current && !event.target.closest('[data-employee-menu]')) {
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
        patchEmployee(employeeRecord.id, employeeRecord);
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                aria-label="Refresh employees"
                title="Refresh employees"
                onClick={handleRefreshEmployees}
                disabled={isEmployeeLoading}
                className="flex items-center justify-center disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={16} className={isEmployeeLoading ? 'animate-spin' : ''} />
              </Button>
              {canCreate && !isReadOnly && <Button type="button" onClick={() => { setCreatedEmployee(null); setAddSessionKey((k) => k + 1); navigate('/employees/add'); }} className="flex items-center gap-1.5 "><Plus size={18} /></Button>}
            </div>
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
                setMenuPosition({ x: event.clientX, y: event.clientY, fromButton: false });
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
                className={`h-2 w-2 shrink-0 rounded-full ${employee.status ? 'bg-emerald-500' : 'bg-red-400'}`}
              />
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label={`Actions for ${employee.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (menuEmployeeId === employee.id) {
                      setMenuEmployeeId(null);
                      setMenuPosition(null);
                    } else {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setMenuPosition({ x: rect.right, y: rect.bottom - 2, fromButton: true });
                      setMenuEmployeeId(employee.id);
                    }
                  }}
                  className="rounded p-1 text-(--color-text-muted) hover:bg-(--color-border) hover:text-(--color-text)"
                ><MoreVertical size={17} /></button>
                {menuEmployeeId === employee.id &&
                <div
                  ref={menuRef}
                  data-employee-menu
                  className="fixed z-20 w-48 rounded-lg border border-(--color-border) bg-(--color-surface-strong) shadow-lg"
                  style={menuPosition ? { left: menuPosition.x, top: menuPosition.y, visibility: 'hidden' } : undefined}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button type="button" onClick={() => openEmployeeView(employee)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><IdCard size={18} /> Profile</button>
                  <button type="button" onClick={() => openEmployeeView(employee, 'attendance')} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><CalendarDays size={15} /> Attendance</button>
                  <button type="button" onClick={() => openEmployeeView(employee, 'salary')} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><WalletCards size={15} /> Salary</button>
                    {canEdit && !isReadOnly && <button type="button" onClick={() => { setMenuEmployeeId(null); navigate(`/employees/${employee.id}/edit`); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><Pencil size={15} /> Edit {employee.name}</button>}
                    {canDelete && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuEmployeeId(null);
                          setMenuPosition(null);
                          setDeleteTarget(employee);
                        }}
                        className="flex w-full items-center gap-2 border-t border-(--color-border) px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={15} /> Delete {employee.name}
                      </button>
                    )}
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
        <div key={`${id ?? 'none'}-${activeView}`} className="h-full page-enter">
        {(isAddRoute || isEditRoute) && <AddEditEmployee key={isAddRoute ? `add-${addSessionKey}` : `edit-${selectedEmployee?.id ?? id}`} employee={isEditRoute ? selectedEmployee : createdEmployee ?? undefined} plants={plants} departments={departments} designations={designations} shifts={shifts} charges={charges} documents={employeeDocuments} accounts={employeeAccounts} documentsLoading={employeeDocumentsLoading} accountsLoading={employeeAccountsLoading} errors={errors} saving={creating || updating} savingDocument={savingDocument} savingAccount={savingAccount} onClose={() => { setCreatedEmployee(null); navigate('/employees'); }} onSubmit={handleSave} onSaveDocument={handleSaveDocument} onDeleteDocument={handleDeleteDocument} onSaveAccount={handleSaveAccount} onDeleteAccount={handleDeleteAccount} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'profile' && <EmployeeProfile key={selectedEmployee.id} employeeId={selectedEmployee.id} initialEmployee={selectedEmployee} embedded onClose={() => navigate('/employees')} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'attendance' && <EmployeeAttendance key={selectedEmployee.id} employeeId={selectedEmployee.id} joiningDate={selectedEmployee.joining_date} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'salary' && <EmployeePlaceholder key={selectedEmployee.id} employee={selectedEmployee} type="salary" />}
        {!isAddRoute && !isEditRoute && !selectedEmployee && <div className="flex h-full items-center justify-center p-8"><div className="max-w-sm text-center text-(--color-text-muted)"><UserRound size={28} className="mx-auto mb-4 text-(--color-accent)" /><h2 className="text-base font-semibold text-(--color-text)">Select an employee</h2><p className="mt-1 text-sm">Choose an employee from the list to view their profile.</p></div></div>}
        </div>
      </main>

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Employee"
        message={`Delete employee "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Employees;
