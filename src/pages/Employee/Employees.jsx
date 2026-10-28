import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Download, Filter, LoaderCircle, MoreVertical, Pencil, Plus, Printer, RefreshCw, Search, UserRound, IdCard, WalletCards, Trash2 } from 'lucide-react';
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
import FilterModal from '../../components/FilterModal';
import Switch from '../../components/Switch';
import { Feedback, LoadingState } from '../../components/Feedback';
import EmployeeAvatar from './components/EmployeeAvatar';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import { useRenderPerformance } from '../../utils/performance';
import { selectRole } from '../../store/authSlice';
import useRefreshOnFocus from '../../hooks/useRefreshOnFocus';

const AddEditEmployee = lazy(() => import('./AddEditEmployee'));
const EmployeeProfile = lazy(() => import('./EmployeeProfile'));
const EmployeeAttendance = lazy(() => import('./EmployeeAttendance'));
const EmployeeSalary = lazy(() => import('./EmployeeSalary'));

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
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
const csvCell = (value) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};
const getEmployeeWorkflowStatus = (employee) => {
  const status = String(employee.approval_status_label ?? employee.approval_status ?? '').toLowerCase();
  if (status.includes('approv') || status === '1') return 'approved';
  if (status.includes('reject') || status === '2') return 'rejected';
  return 'pending';
};

const matchesFilterValue = (selectedValues, value) => (
  Array.isArray(selectedValues)
    ? selectedValues.length === 0 || selectedValues.includes(value)
    : !selectedValues || selectedValues === value
);

const matchesEmployeeFilters = (employee, filters) => {
  const plantId = String(employee.plant_id ?? employee.plant?.id ?? '');
  const departmentId = String(employee.department_id ?? employee.department?.id ?? '');
  const designationId = String(employee.designation_id ?? employee.designation?.id ?? '');
  const shiftId = String(employee.shift_id ?? employee.shift?.id ?? '');
  const employeeStatus = employee.status === true
    || Number(employee.status) === 1
    || String(employee.status).toLowerCase() === 'active'
    ? 'active'
    : 'inactive';

  return (!filters.plants?.length || filters.plants.includes(plantId))
    && matchesFilterValue(filters.status, employeeStatus)
    && matchesFilterValue(filters.workflow_status, getEmployeeWorkflowStatus(employee))
    && (!filters.department || filters.department === departmentId)
    && (!filters.designation || filters.designation === designationId)
    && (!filters.shift || filters.shift === shiftId);
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
  const [fetchEmployees, { isLoading, isFetching }] = useLazyGetEmployeesQuery({ refetchOnFocus: false });
  const requestVersion = useRef(0);
  const loadingEmployees = useRef(false);
  const searchTimeout = useRef(null);
  const {
    data: selectedEmployeeData,
    isLoading: selectedEmployeeLoading,
    isError: selectedEmployeeError,
  } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: plantsData, isLoading: plantsLoading } = useGetPlantsQuery();
  const { data: departmentsData } = useGetDepartmentsQuery();
  const { data: designationsData } = useGetDesignationsQuery();
  const { data: shiftsData } = useGetShiftsQuery();
  const { data: chargesData } = useGetChargesQuery({ all: true, per_page: 100 });
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
  const [employeeFilters, setEmployeeFilters] = useState({
    plants: [],
    status: [],
    workflow_status: [],
    designation: '',
    department: '',
    shift: '',
  });
  const plantFilter = employeeFilters.plants;
  const [menuEmployeeId, setMenuEmployeeId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [pageMenuPosition, setPageMenuPosition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [relievingDate, setRelievingDate] = useState('');
  const menuRef = useRef(null);
  const activeTriggerRef = useRef(null);
  const pageMenuRef = useRef(null);
  const filterTriggerRef = useRef(null);
  const [savingStatusIds, setSavingStatusIds] = useState({});
  const [errors, setErrors] = useState({});
  const [hasLoadError, setHasLoadError] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

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
    return matchesEmployeeFilters(employee, employeeFilters)
      && (!searchQuery || matchesEmployeeSearch(employee, searchQuery));
  }), [cachedEmployees, employeeFilters, searchQuery]);
  const hasLocalSearchResults = Boolean(searchQuery) && localEmployees.length > 0;
  const employeesData = useMemo(() => {
    if (cachedEmployees.length > 0 && (!searchQuery || hasLocalSearchResults)) return localEmployees;
    if (searchQuery && debouncedSearch !== searchQuery) return [];
    return loadedEmployees;
  }, [cachedEmployees.length, debouncedSearch, hasLocalSearchResults, loadedEmployees, localEmployees, searchQuery]);
  const hasAppliedEmployeeFilters = Object.values(employeeFilters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== '',
  );
  const displayedEmployeeCount = hasLocalSearchResults
    || (hasAppliedEmployeeFilters && cachedEmployees.length > 0)
    ? localEmployees.length
    : totalEmployees || employeesData.length;
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

  const loadEmployeePages = useCallback(async (startPage, query, plantIds, replace = false, version = requestVersion.current, { silent = false, preferCache = true } = {}) => {
    if (loadingEmployees.current) return;

    loadingEmployees.current = true;
    let shouldReplace = replace;
    let loadedTotal = 0;
    const refreshedEmployees = [];
    const requestedPlantIds = plantIds.length > 0 ? plantIds : [''];
    const isUnfiltered = !query && plantIds.length === 0;

    try {
      for (const plantId of requestedPlantIds) {
        let page = startPage;
        let replacePage = shouldReplace;
        while (version === requestVersion.current) {
          const response = await fetchEmployees(
            { page, per_page: 100, search: query, plant_id: plantId },
            preferCache,
          ).unwrap();
          if (version !== requestVersion.current) break;

          const pageEmployees = unwrap(response);
          if (silent) refreshedEmployees.push(...pageEmployees);
          else mergeEmployees(pageEmployees, replacePage, isUnfiltered);
          replacePage = false;
          shouldReplace = false;
          const currentPage = Number(response.meta?.current_page ?? page);
          const lastPage = Number(response.meta?.last_page ?? currentPage);
          if (currentPage === startPage) {
            loadedTotal += Number(response.meta?.total ?? pageEmployees.length);
          }
          if (!silent) setHasLoadError(false);

          if (currentPage >= lastPage) break;
          page = currentPage + 1;
        }
        if (version !== requestVersion.current) break;
      }
      if (version === requestVersion.current) {
        if (silent) mergeEmployees(refreshedEmployees, true, isUnfiltered);
        setTotalEmployees(loadedTotal);
        setHasLoadError(false);
      }
    } catch {
      if (version === requestVersion.current) setHasLoadError(true);
    } finally {
      if (version === requestVersion.current) loadingEmployees.current = false;
    }
  }, [fetchEmployees, mergeEmployees]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadEmployeePages(1, '', [], true), 0);
    return () => {
      window.clearTimeout(initialLoad);
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
    setBackgroundRefreshing(false);
    window.clearTimeout(searchTimeout.current);
    if (query && cachedEmployees.some((employee) =>
      matchesEmployeeFilters(employee, employeeFilters) && matchesEmployeeSearch(employee, query)
    )) {
      setDebouncedSearch(query);
      return;
    }
    searchTimeout.current = window.setTimeout(() => {
      setDebouncedSearch(query);
      loadEmployeePages(1, query, plantFilter, true, version);
    }, 250);
  };

  const handleFilterApply = (filters) => {
    const nextFilters = {
      ...employeeFilters,
      ...filters,
      plants: (filters.plants ?? []).map(String),
    };
    const plantIds = nextFilters.plants;
    const query = search.trim();
    const version = ++requestVersion.current;
    loadingEmployees.current = false;
    window.clearTimeout(searchTimeout.current);
    setEmployeeFilters(nextFilters);
    setHasLoadError(false);
    setBackgroundRefreshing(false);
    if (query && cachedEmployees.some((employee) =>
      matchesEmployeeFilters(employee, nextFilters) && matchesEmployeeSearch(employee, query)
    )) {
      setDebouncedSearch(query);
      return;
    }
    setDebouncedSearch(query);
    loadEmployeePages(1, query, plantIds, true, version);
  };

  const handleRefreshEmployees = useCallback(({ silent = false } = {}) => {
    const query = search.trim();
    const version = ++requestVersion.current;
    loadingEmployees.current = false;
    window.clearTimeout(searchTimeout.current);
    if (!silent) setDebouncedSearch(query);
    if (!silent) setBackgroundRefreshing(false);
    setHasLoadError(false);
    if (silent) setBackgroundRefreshing(true);
    loadEmployeePages(1, query, plantFilter, true, version, { silent, preferCache: false })
      .finally(() => {
        if (silent && version === requestVersion.current) setBackgroundRefreshing(false);
      });
  }, [loadEmployeePages, plantFilter, search]);
  useRefreshOnFocus(handleRefreshEmployees);

  const isSearchPending = debouncedSearch !== search.trim();
  const isEmployeeLoading = isSearchPending || isLoading || (isFetching && !backgroundRefreshing);
  const menuEmployee = displayEmployeesData.find(
    (employee) => String(employee.id) === String(menuEmployeeId),
  );

  const openEmployeeView = (employee, view = 'profile') => {
    closeMenu();
    navigate(view === 'profile' ? `/employees/${employee.id}` : `/employees/${employee.id}/${view}`);
  };

  // Robust menu closing & positioning
  const closeMenu = useCallback(() => {
    setMenuEmployeeId(null);
    setMenuPosition(null);
    activeTriggerRef.current = null;
  }, []);

  const handleMenuToggle = (event, employee, isContextMenu = false) => {
    event.stopPropagation();
    if (isContextMenu) event.preventDefault();
    setPageMenuPosition(null);

    if (!isContextMenu && String(menuEmployeeId) === String(employee.id)) {
      closeMenu();
      return;
    }

    activeTriggerRef.current = isContextMenu ? null : event.currentTarget;
    if (isContextMenu) {
      setMenuPosition({ x: event.clientX, y: event.clientY, fromButton: false });
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({
        x: buttonRect.right,
        y: buttonRect.bottom + 4,
        buttonTop: buttonRect.top,
        fromButton: true,
      });
    }

    setMenuEmployeeId(String(employee.id));
  };

  useLayoutEffect(() => {
    if (!menuPosition || !menuRef.current) return undefined;

    const positionMenu = () => {
      const menu = menuRef.current;
      if (!menu) return;

      const { width, height } = menu.getBoundingClientRect();
      const margin = 12;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      let left = menuPosition.fromButton ? menuPosition.x - width : menuPosition.x;
      let top = menuPosition.y;

      if (top + height > viewportHeight - margin) {
        top = menuPosition.fromButton
          ? menuPosition.buttonTop - height - 4
          : menuPosition.y - height;
      }

      left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
      top = Math.max(margin, Math.min(top, viewportHeight - height - margin));
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      menu.style.visibility = 'visible';
    };

    positionMenu();
    window.addEventListener('resize', positionMenu);
    const closeOnScroll = (event) => {
      if (!menuRef.current?.contains(event.target)) closeMenu();
    };
    document.addEventListener('scroll', closeOnScroll, true);

    return () => {
      window.removeEventListener('resize', positionMenu);
      document.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [menuEmployeeId, menuPosition, closeMenu]);

  useEffect(() => {
    if (menuEmployeeId !== null && !menuEmployee) closeMenu();
  }, [closeMenu, menuEmployee, menuEmployeeId]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !event.target.closest('[data-employee-menu-trigger]') &&
        (!activeTriggerRef.current || !activeTriggerRef.current.contains(event.target))
      ) {
        closeMenu();
      }
      if (!event.target.closest('[data-page-context-menu]')) setPageMenuPosition(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMenu();
        setPageMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu]);

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

  const updateEmployeeStatus = async (employee, nextStatus, nextRelievingDate = null) => {
    const previousStatus = Boolean(employee.status);
    const previousRelievingDate = employee.relieving_date ?? null;
    setSavingStatusIds((current) => ({ ...current, [employee.id]: true }));
    patchEmployee(employee.id, {
      status: nextStatus,
      relieving_date: nextStatus ? null : nextRelievingDate,
    });

    try {
      const response = await updateEmployee({
        id: employee.id,
        status: nextStatus,
        relieving_date: nextStatus ? null : nextRelievingDate || null,
      }).unwrap();
      patchEmployee(employee.id, response?.data ?? response);
      toast(`${employee.name} marked ${nextStatus ? 'active' : 'inactive'}.`, 'success');
      return true;
    } catch (error) {
      patchEmployee(employee.id, { status: previousStatus, relieving_date: previousRelievingDate });
      toast(getApiErrorMessage(error, `Unable to update ${employee.name}'s status.`), 'error');
      return false;
    } finally {
      setSavingStatusIds((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  };

  const toggleEmployeeStatus = (employee) => {
    if (Number(employee.status) === 1) {
      setStatusTarget(employee);
      setRelievingDate(String(employee.relieving_date ?? '').slice(0, 10));
      return;
    }

    updateEmployeeStatus(employee, true);
  };

  const confirmEmployeeInactive = async () => {
    if (!statusTarget) return;
    const saved = await updateEmployeeStatus(statusTarget, false, relievingDate);
    if (saved) {
      setStatusTarget(null);
      setRelievingDate('');
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

  const exportEmployeesCsv = () => {
    const headers = ['Employee code', 'Employee name', 'Email', 'Mobile number', 'Plant', 'Department', 'Designation', 'Status'];
    const rows = displayEmployeesData.map((employee) => [
      employee.employee_code,
      employee.name,
      employee.email,
      employee.mobile_number,
      employee.plant?.name,
      employee.department?.name,
      employee.designation?.name,
      employee.status === true || Number(employee.status) === 1 || String(employee.status).toLowerCase() === 'active'
        ? 'Active'
        : 'Inactive',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const objectUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setPageMenuPosition(null);
  };

  useLayoutEffect(() => {
    if (!pageMenuPosition || !pageMenuRef.current) return;

    const positionMenu = () => {
      const menu = pageMenuRef.current;
      if (!menu) return;

      const { width, height } = menu.getBoundingClientRect();
      const margin = 8;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      menu.style.left = `${Math.max(margin, Math.min(pageMenuPosition.x + 4, viewportWidth - width - margin))}px`;
      menu.style.top = `${Math.max(margin, Math.min(pageMenuPosition.y + 4, viewportHeight - height - margin))}px`;
      menu.style.visibility = 'visible';
    };

    positionMenu();
    window.addEventListener('resize', positionMenu);
    return () => window.removeEventListener('resize', positionMenu);
  }, [pageMenuPosition]);

  const handleSave = async (payload) => {
    try {
      const savedEmployee = payload.id
        ? await updateEmployee(payload).unwrap()
        : await createEmployee(payload).unwrap();
      const employeeRecord = savedEmployee?.data ?? savedEmployee;
      setCreatedEmployee(employeeRecord);
      if (payload.id) {
        patchEmployee(employeeRecord.id, employeeRecord);
      } else if (employeeRecord?.id) {
        setEmployeeMap((current) => new Map(current).set(employeeRecord.id, employeeRecord));
        setCachedIds((current) => new Set(current).add(employeeRecord.id));
        const matchesCurrentList = matchesEmployeeFilters(employeeRecord, employeeFilters)
          && (!search.trim() || matchesEmployeeSearch(employeeRecord, search.trim()));
        if (matchesCurrentList) setTotalEmployees((current) => current + 1);
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
    <div
      className="flex h-full min-h-0 overflow-hidden"
      onContextMenu={(event) => {
        if (event.target.closest('[data-page-context-menu]')) return;
        event.preventDefault();
        closeMenu();
        setPageMenuPosition({ x: event.clientX, y: event.clientY });
      }}
    >
      {pageMenuPosition && createPortal(
        <div
          ref={pageMenuRef}
          data-page-context-menu
          role="menu"
          aria-label="Employee list actions"
          className="fixed z-50 w-54 rounded-2xl border border-(--color-border) bg-(--color-surface-strong) p-1.5 shadow-xl"
          style={{ left: pageMenuPosition.x, top: pageMenuPosition.y, visibility: 'hidden' }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <label className="mb-1 flex items-center gap-2 rounded-xl border border-(--color-border) px-2.5 py-2">
            <Search size={15} className="shrink-0 text-(--color-text-muted)" />
            <input
              autoFocus
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search employees"
              aria-label="Search employees"
              className="min-w-0 flex-1 bg-transparent text-sm text-(--color-text) outline-none placeholder:text-(--color-text-muted)"
            />
          </label>
          {canCreate && !isReadOnly && (
            <button type="button" role="menuitem" onClick={() => { setPageMenuPosition(null); setCreatedEmployee(null); setAddSessionKey((key) => key + 1); navigate('/employees/add'); }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-(--color-text) hover:bg-(--color-accent-soft)">
              <Plus size={15} /> Add Employee
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => { setPageMenuPosition(null); handleRefreshEmployees(); }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-(--color-text) hover:bg-(--color-accent-soft)">
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" role="menuitem" onClick={() => { setPageMenuPosition(null); filterTriggerRef.current?.click(); }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-(--color-text) hover:bg-(--color-accent-soft)">
            <Filter size={15} /> Filters
          </button>
          <button type="button" role="menuitem" onClick={exportEmployeesCsv} disabled={displayEmployeesData.length === 0} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-(--color-text) hover:bg-(--color-accent-soft) disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={15} /> Export As CSV
          </button>
          <button type="button" role="menuitem" onClick={() => { setPageMenuPosition(null); navigate('/employees/barcodes'); }} className="flex w-full items-center gap-2 rounded rounded-b-xl px-2.5 py-2 text-left text-sm text-(--color-text) hover:bg-(--color-accent-soft)">
            <Printer size={15} /> Print Barcodes
          </button>
        </div>,
        document.body,
      )}
      {menuEmployee && menuPosition && createPortal(
        <div
          ref={menuRef}
          data-employee-menu
          role="menu"
          aria-label={`${menuEmployee.name} actions`}
          style={{
            position: 'fixed',
            left: menuPosition.x,
            top: menuPosition.y,
            visibility: 'hidden',
            zIndex: 50,
            maxHeight: 'calc(100vh - 24px)',
            overflowY: 'auto',
          }}
          className="w-48 max-w-[calc(100vw-24px)] rounded-2xl border border-(--color-border) bg-(--color-surface-strong) shadow-xl backdrop-blur-xl"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button type="button" role="menuitem" onClick={() => openEmployeeView(menuEmployee)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-(--color-accent-soft)"><IdCard size={18} /> Profile</button>
          <button type="button" role="menuitem" onClick={() => openEmployeeView(menuEmployee, 'attendance')} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-(--color-accent-soft)"><CalendarDays size={15} /> Attendance</button>
          <button type="button" role="menuitem" onClick={() => openEmployeeView(menuEmployee, 'salary')} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-(--color-accent-soft)"><WalletCards size={15} /> Salary</button>
          {canEdit && !isReadOnly && (
            <button type="button" role="menuitem" onClick={() => { closeMenu(); navigate(`/employees/${menuEmployee.id}/edit`); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-(--color-accent-soft)"><Pencil size={15} /> Edit {menuEmployee.name}</button>
          )}
          {canDelete && !isReadOnly && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                setDeleteTarget(menuEmployee);
              }}
              className="flex w-full items-center gap-2 border-t border-(--color-border)/60 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 size={15} /> Delete {menuEmployee.name}
            </button>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-(--color-border)/60 px-3 py-2.5 bg-(--color-bg)/40" onClick={(event) => event.stopPropagation()}>
            <span className="text-sm font-medium text-(--color-text)">{menuEmployee.status ? 'Active' : 'Inactive'}</span>
            <Switch
              checked={Boolean(menuEmployee.status)}
              disabled={!canEdit || isReadOnly || Boolean(savingStatusIds[menuEmployee.id])}
              ariaLabel={`${menuEmployee.name} active status`}
              title={menuEmployee.status ? 'Mark inactive' : 'Mark active'}
              onClick={() => toggleEmployeeStatus(menuEmployee)}
            />
          </div>
        </div>,
        document.body,
      )}
      <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-(--color-border) bg-(--color-bg-elevated) lg:w-92">
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
                className="flex items-center justify-center p-2.5 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={16} className={`hover:scale-120 transition-transform duration-200 ${isEmployeeLoading ? 'scale-120 animate-spin ' : ''}`} />
              </Button>
              {canCreate && !isReadOnly && <Button type="button" onClick={() => { setCreatedEmployee(null); setAddSessionKey((k) => k + 1); navigate('/employees/add'); }} className="flex items-center gap-1.5 p-2.5"><Plus size={18} className='hover:scale-160 transition-transform duration-200' /></Button>}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <InputField className="min-w-0 min-h-0 h-10" value={search} onChange={handleSearchChange} placeholder="Search employees" leftIcon={<Search size={16} />} rightIcon={isEmployeeLoading && <LoaderCircle size={15} className="animate-spin" />} />
            <FilterModal
              buttonRef={filterTriggerRef}
              title="Filter Employees"
              values={employeeFilters}
              onApply={handleFilterApply}
              fields={[
                {
                  key: 'plants',
                  label: 'Plants',
                  type: 'multiselect',
                  permission: 'employees',
                  visible: !isSinglePlantRole,
                  options: plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
                  placeholder: 'All accessible plants',
                  isLoading: plantsLoading,
                },
                {
                  key: 'status',
                  label: 'Status',
                  type: 'multiselect',
                  permission: 'employees',
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ],
                  placeholder: 'All statuses',
                },
                {
                  key: 'workflow_status',
                  label: 'Workflow status',
                  type: 'multiselect',
                  permission: 'employees',
                  options: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ],
                  placeholder: 'All workflow statuses',
                },
                {
                  key: 'designation',
                  label: 'Designation',
                  type: 'select',
                  permission: 'employees',
                  options: designations.map((designation) => ({
                    value: String(designation.id),
                    label: designation.name,
                  })),
                  placeholder: 'All designations',
                },
                {
                  key: 'department',
                  label: 'Department',
                  type: 'select',
                  permission: 'employees',
                  options: departments.map((department) => ({
                    value: String(department.id),
                    label: department.name,
                  })),
                  placeholder: 'All departments',
                },
                {
                  key: 'shift',
                  label: 'Shift',
                  type: 'multiselect',
                  permission: 'employees',
                  options: shifts.map((shift) => ({
                    value: String(shift.id),
                    label: shift.name,
                  })),
                  placeholder: 'All shifts',
                },
              ]}
            />
          </div>
        </div>

        {/* main 3D List */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
          {hasLoadError && employeesData.length === 0 && <Feedback type="error" title="Unable to load employees" message="Please refresh the page and try again." />}
          {!isSearchPending && !isLoading && !isFetching && !hasLoadError && employeesData.length === 0 && <p className="py-10 text-center text-sm text-(--color-text-muted)">No employees found.</p>}
          {displayEmployeesData.map((employee) => {
            const isSelected = String(id) === String(employee.id);

            return (
              <div
                key={employee.id}
                role="button"
                tabIndex={0}
                onClick={() => openEmployeeView(employee)}
                onKeyDown={(event) => event.key === 'Enter' && openEmployeeView(employee)}
                onContextMenu={(event) => handleMenuToggle(event, employee, true)}
                className={`group relative my-2 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-300 ${
                  isSelected
                    ? 'border-(--color-accent)/80 bg-(--color-accent-soft) shadow-[0_8px_20px_-4px_var(--color-accent-shadow,rgba(0,0,0,0.12)),0_2px_6px_-1px_rgba(0,0,0,0.06)] ring-2 ring-(--color-accent)/30 translate-y-[-1px]'
                    : 'border-(--color-border)/50 bg-(--color-bg-elevated)/80 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:border-(--color-accent)/40 hover:bg-(--color-bg-elevated) hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] hover:translate-y-[-2px]'
                } focus-within:border-(--color-accent) focus-within:bg-(--color-accent-soft)`}
              >
                <EmployeeAvatar employee={employee} className="h-11 w-11 text-sm shrink-0 shadow-sm border border-(--color-border)/40" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-(--color-text)">{employee.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-(--color-text-muted)">{employee.employee_code} · {employee.plant?.name}</span>
                  <span className="mt-1 block truncate text-xs font-medium text-(--color-accent)">{employee.department?.name ?? employee.designation?.name}</span>
                  {employee.approval_status_label && employee.approval_status !== 1 && (
                    <span className={`mt-1 block truncate text-xs font-medium ${employee.approval_status === 2 ? 'text-red-600' : 'text-amber-700 dark:text-amber-300'}`}>
                      {employee.approval_status_label}
                      {employee.approval_status === 2 && employee.rejection_reason ? ` · ${employee.rejection_reason}` : ''}
                    </span>
                  )}
                </span>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ${employee.status ? 'bg-emerald-500 shadow-emerald-500/30 ring-2 ring-emerald-500/20' : 'bg-red-400'}`}
                />
                <div className="relative shrink-0">
                  <button
                    type="button"
                    data-employee-menu-trigger
                    aria-label={`Actions for ${employee.name}`}
                    onClick={(event) => handleMenuToggle(event, employee, false)}
                    className="rounded-lg p-1.5 text-(--color-text-muted) transition-colors hover:bg-(--color-border)/60 hover:text-(--color-text)"
                  >
                    <MoreVertical size={17} />
                  </button>
                </div>
              </div>
            );
          })}
          {hasLoadError && employeesData.length > 0 && <p className="py-3 text-center text-xs text-(--color-text-muted)">Unable to load more employees.</p>}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden bg-(--color-bg)">
        <div key={`${id ?? 'none'}-${activeView}`} className="h-full page-enter">
          <Suspense fallback={<LoadingState message={isEditRoute ? 'Loading employee form...' : 'Loading employee view...'} className="h-full min-h-0" />}>
            {!isAddRoute && id && !selectedEmployee && selectedEmployeeLoading && <LoadingState message="Loading employee details..." className="h-full min-h-0" />}
            {!isAddRoute && id && !selectedEmployee && selectedEmployeeError && <Feedback type="error" title="Unable to load employee" message="The employee details could not be loaded. Please return to the employee list and try again." />}
            {(isAddRoute || (isEditRoute && selectedEmployee)) && <AddEditEmployee key={isAddRoute ? `add-${addSessionKey}` : `edit-${selectedEmployee.id}`} employee={isEditRoute ? selectedEmployee : createdEmployee ?? undefined} plants={plants} departments={departments} designations={designations} shifts={shifts} charges={charges} documents={employeeDocuments} accounts={employeeAccounts} documentsLoading={employeeDocumentsLoading} accountsLoading={employeeAccountsLoading} errors={errors} saving={creating || updating} savingDocument={savingDocument} savingAccount={savingAccount} onClose={() => { setCreatedEmployee(null); navigate('/employees'); }} onSubmit={handleSave} onSaveDocument={handleSaveDocument} onDeleteDocument={handleDeleteDocument} onSaveAccount={handleSaveAccount} onDeleteAccount={handleDeleteAccount} />}
            {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'profile' && <EmployeeProfile key={selectedEmployee.id} employeeId={selectedEmployee.id} initialEmployee={selectedEmployee} embedded onClose={() => navigate('/employees')} />}
            {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'attendance' && <EmployeeAttendance key={selectedEmployee.id} employeeId={selectedEmployee.id} joiningDate={selectedEmployee.joining_date} plantId={selectedEmployee.plant_id ?? selectedEmployee.plant?.id} />}
            {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'salary' && <EmployeeSalary key={selectedEmployee.id} employee={selectedEmployee} />}
            {!isAddRoute && !id && !selectedEmployee && <div className="flex h-full items-center justify-center p-8"><div className="max-w-sm text-center text-(--color-text-muted)"><UserRound size={28} className="mx-auto mb-4 text-(--color-accent)" /><h2 className="text-base font-semibold text-(--color-text)">Select an employee</h2><p className="mt-1 text-sm">Choose an employee from the list to view their profile.</p></div></div>}
          </Suspense>
        </div>
      </main>

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Employee"
        message={`Delete employee "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDelete
        isOpen={Boolean(statusTarget)}
        title="Mark employee inactive"
        message={`Mark ${statusTarget?.name ?? 'this employee'} as inactive? You can leave the relieving date blank.`}
        confirmLabel="Mark inactive"
        confirmLoadingLabel="Updating status…"
        confirmClass="bg-amber-600 hover:bg-amber-700"
        icon={UserRound}
        onConfirm={confirmEmployeeInactive}
        onCancel={() => {
          setStatusTarget(null);
          setRelievingDate('');
        }}
      >
        <div className="space-y-3">
          <p className="rounded-lg border border-(--color-border) bg-(--color-accent-soft)/40 p-3 text-xs leading-relaxed text-(--color-text-muted)">
            The date is optional. If entered, it is treated as the employee’s last working day; later dates appear as Inactive in attendance reports. If left blank, the employee is still marked inactive and attendance reports show Inactive without a last-day boundary.
          </p>
          <InputField
            label="Relieving date (optional)"
            type="date"
            value={relievingDate}
            onChange={(event) => setRelievingDate(event.target.value)}
            min={String(statusTarget?.joining_date ?? '').slice(0, 10) || undefined}
          />
        </div>
      </ConfirmDelete>
    </div>
  );
};

export default Employees;