import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, CheckCheck, Clock3, LoaderCircle, LogIn, LogOut, Power, RefreshCw, RotateCcw, Search, UserRoundX, Users, XCircle } from 'lucide-react';
import {
  useApproveAllAttendanceMutation,
  useCheckInAttendanceMutation,
  useCheckOutAttendanceMutation,
  useCreatePlantShutdownMutation,
  useDeleteAttendanceMutation,
  useGetAttendanceFiltersQuery,
  useGetAttendanceRosterQuery,
  useGetPlantShutdownsQuery,
  useMarkAttendanceAbsentMutation,
  useMarkShutdownPresentMutation,
  useRejectAllAttendanceMutation,
} from '../../store/api';
import { useToast } from '../../contexts/ToastContext';
import { Feedback } from '../../components/Feedback';
import ConfirmDelete from '../../components/ConfirmDelete';
import PlantShutdownForm from '../components/PlantShutdownForm';
import InputField from '../../components/InputField';
import PageTable from '../../components/PageTable';
import Pagination from '../../components/Pagination';
import SearchableSelect from '../../components/SearchableSelect';
import SectionCard from '../../components/SectionCard';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import usePermission from '../../hooks/usePermission';

const unwrap = (value) => (Array.isArray(value) ? value : value?.data ?? []);
const matchesEmployeeSearch = (employee, query) => {
  const normalizedQuery = query.toLocaleLowerCase();
  return [employee.name, employee.employee_code]
    .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedQuery));
};
const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const getShutdownDateRange = (shutdown) => {
  const start = String(shutdown.shutdown_start_date ?? '').slice(0, 10);
  const end = String(shutdown.shutdown_end_date ?? shutdown.shutdown_start_date ?? '').slice(0, 10);
  return start && end && start !== end ? `${start} to ${end}` : start || end;
};
const getShutdownDefaults = () => {
  const now = new Date();
  return {
    reason: 'Power cut / Maintenance',
    shutdown_start_date: getLocalDate(),
    start_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    shutdown_end_date: getLocalDate(),
    end_time: '23:59',
  };
};
const todayLabel = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

const initials = (name) => String(name ?? '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const formatTime = (time) => {
  if (!time) return '—';
  const date = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(date);
};

const getShiftTime = (shift) => {
  if (!shift) return 'No shift assigned';
  const start = String(shift.start_time ?? '').slice(0, 5);
  const end = String(shift.end_time ?? '').slice(0, 5);
  return start && end ? `${start} - ${end}` : shift.name;
};

const Marking = () => {
  const toast = useToast();
  const { can, isReadOnly } = usePermission();
  const canRequestShutdown = can('plant-shutdowns', 'shutdown');
  const canApproveAttendance = !isReadOnly && can('attendance', 'approve');
  const canRejectAttendance = !isReadOnly && can('attendance', 'reject');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ plant: '', department: '', shift: '' });
  const [busyEmployeeActions, setBusyEmployeeActions] = useState({});
  const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
  const [shutdownForm, setShutdownForm] = useState(getShutdownDefaults);
  const [pendingPresenceEmployee, setPendingPresenceEmployee] = useState(null);
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [rejectAllReason, setRejectAllReason] = useState('');
  const [pendingAbsentEmployee, setPendingAbsentEmployee] = useState(null);
  const [absentReason, setAbsentReason] = useState('');
  const [checkIn] = useCheckInAttendanceMutation();
  const [checkOut] = useCheckOutAttendanceMutation();
  const [markShutdownPresent] = useMarkShutdownPresentMutation();
  const [approveAllAttendance, { isLoading: approvingAll }] = useApproveAllAttendanceMutation();
  const [rejectAllAttendance, { isLoading: rejectingAll }] = useRejectAllAttendanceMutation();
  const [markAttendanceAbsent] = useMarkAttendanceAbsentMutation();
  const [deleteAttendance] = useDeleteAttendanceMutation();
  const [createPlantShutdown, { isLoading: submittingShutdown }] = useCreatePlantShutdownMutation();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filtersQuery = useGetAttendanceFiltersQuery();
  const lookupData = filtersQuery.data ?? {};
  const plants = unwrap(lookupData.plants);
  const departments = unwrap(lookupData.departments);
  const shifts = unwrap(lookupData.shifts);
  const assignedPlantIds = lookupData.allowed_plant_ids;
  const singleAssignedPlant = Array.isArray(assignedPlantIds) && assignedPlantIds.length === 1
    ? String(assignedPlantIds[0])
    : '';
  const effectivePlant = singleAssignedPlant || filters.plant;
  const today = getLocalDate();
  const shutdownQuery = useGetPlantShutdownsQuery({
    ...(effectivePlant ? { plant_id: effectivePlant } : {}),
    start_date: today,
    end_date: today,
    per_page: 100,
  });
  const rejectedShutdownQuery = useGetPlantShutdownsQuery(
    effectivePlant ? { plant_id: effectivePlant, status: 3, per_page: 1 } : undefined,
    { skip: !effectivePlant },
  );
  const todayShutdowns = useMemo(
    () => unwrap(shutdownQuery.currentData ?? shutdownQuery.data)
      .filter((shutdown) => String(shutdown.shutdown_start_date ?? '').slice(0, 10) <= today
        && String(shutdown.shutdown_end_date ?? shutdown.shutdown_start_date ?? '').slice(0, 10) >= today),
    [shutdownQuery.currentData, shutdownQuery.data, today],
  );
  const activeShutdowns = useMemo(
    () => todayShutdowns.filter((shutdown) => Number(shutdown.status) === 2),
    [todayShutdowns],
  );
  const pendingShutdowns = useMemo(
    () => todayShutdowns.filter((shutdown) => Number(shutdown.status) === 1),
    [todayShutdowns],
  );
  const rejectedShutdown = unwrap(rejectedShutdownQuery.currentData ?? rejectedShutdownQuery.data)
    .find((shutdown) => Number(shutdown.status) === 3) ?? null;
  const activeShutdown = activeShutdowns.find((shutdown) => String(shutdown.plant_id) === String(effectivePlant)) ?? null;
  const pendingShutdown = pendingShutdowns.find((shutdown) => String(shutdown.plant_id) === String(effectivePlant)) ?? null;
  const hasPendingShutdown = useCallback(
    (employee) => pendingShutdowns.some((shutdown) => String(shutdown.plant_id) === String(employee.working_plant_id ?? employee.plant_id)),
    [pendingShutdowns],
  );
  const employeeQuery = useGetAttendanceRosterQuery({
    page,
    per_page: 15,
    date: getLocalDate(),
    ...(effectivePlant ? { plant_id: effectivePlant } : {}),
    ...(filters.department ? { department_id: filters.department } : {}),
    ...(filters.shift ? { shift_id: filters.shift } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const isRefreshing = employeeQuery.isFetching || filtersQuery.isFetching || shutdownQuery.isFetching || rejectedShutdownQuery.isFetching;

  const employees = unwrap(employeeQuery.currentData ?? employeeQuery.data);
  const searchQuery = search.trim();
  const cachedEmployees = useMemo(() => employees.filter((employee) => (
      (!effectivePlant || String(employee.plant_id) === effectivePlant)
      && (!filters.department || String(employee.department_id) === String(filters.department))
      && (!filters.shift || String(employee.shift_id) === String(filters.shift))
      && (!searchQuery || matchesEmployeeSearch(employee, searchQuery))
  )), [employees, effectivePlant, filters.department, filters.shift, searchQuery]);
  const isSearchPending = searchQuery !== debouncedSearch;
  const useCachedSearchResults = Boolean(searchQuery)
    && (isSearchPending || !employeeQuery.currentData);
  const displayedEmployees = useCachedSearchResults ? cachedEmployees : employees;
  const meta = (useCachedSearchResults ? undefined : employeeQuery.currentData ?? employeeQuery.data)?.meta ?? {};
  const currentPage = Number(meta.current_page ?? page);
  const lastPage = Number(meta.last_page ?? 1);
  const plantMap = useMemo(() => new Map(plants.map((plant) => [String(plant.id), plant])), [plants]);
  const departmentMap = useMemo(() => new Map(departments.map((department) => [String(department.id), department])), [departments]);
  const shiftMap = useMemo(() => new Map(shifts.map((shift) => [String(shift.id), shift])), [shifts]);

  const plantOptions = useMemo(() => [
    { value: '', label: 'All plants' },
    ...plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
  ], [plants]);
  const departmentOptions = useMemo(() => [
    { value: '', label: 'All departments' },
    ...departments.map((department) => ({ value: String(department.id), label: department.name })),
  ], [departments]);
  const shiftOptions = useMemo(() => [
    { value: '', label: 'All shifts' },
    ...shifts.map((shift) => ({ value: String(shift.id), label: shift.name })),
  ], [shifts]);

  const pageCounts = useMemo(() => displayedEmployees.reduce((total, employee) => {
    total.roster += 1;
    if (employee.attendance?.shutdown_present) {
      total.shutdownPresent += 1;
      return total;
    }
    const punch = employee.attendance;
    if (Number(punch?.workflow_status) === 1) total.pendingVerification += 1;
    if (Number(punch?.status) === 0) return total;
    if (!punch) total.notStarted += 1;
    else if (punch.check_out) total.completed += 1;
    else total.punchedIn += 1;
    return total;
  }, { roster: 0, notStarted: 0, punchedIn: 0, completed: 0, shutdownPresent: 0, pendingVerification: 0 }), [displayedEmployees]);
  const counts = useCachedSearchResults ? pageCounts : employeeQuery.data?.summary ?? pageCounts;
  const pendingApprovalCount = Number(
    employeeQuery.currentData?.summary?.pending_verification
      ?? employeeQuery.data?.summary?.pending_verification
      ?? pageCounts.pendingVerification,
  );
  const bulkDecisionFilters = {
    date: today,
    ...(effectivePlant ? { plant_id: effectivePlant } : {}),
    ...(filters.department ? { department_id: filters.department } : {}),
    ...(filters.shift ? { shift_id: filters.shift } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };
  const isBulkActionDisabled = pendingApprovalCount < 1
    || employeeQuery.isFetching
    || isSearchPending
    || approvingAll
    || rejectingAll;

  const handleApproveAll = async () => {
    try {
      const response = await approveAllAttendance(bulkDecisionFilters).unwrap();
      toast(response.message ?? `${response.count ?? 0} attendance records approved.`, response.count ? 'success' : 'info');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to approve attendance records.'), 'error');
    }
  };

  const handleRejectAll = async () => {
    try {
      const response = await rejectAllAttendance({
        ...bulkDecisionFilters,
        rejection_reason: rejectAllReason.trim(),
      }).unwrap();
      toast(response.message ?? `${response.count ?? 0} attendance records rejected.`, response.count ? 'success' : 'info');
      setRejectAllOpen(false);
      setRejectAllReason('');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to reject attendance records.'), 'error');
    }
  };

  const handleMarkAbsent = useCallback(async (employee) => {
    const attendanceId = employee.attendance?.id;
    if (!attendanceId) {
      toast('There is no pending attendance record to reject for this employee.', 'error');
      return;
    }
    setBusyEmployeeActions((current) => ({ ...current, [employee.id]: 'absent' }));
    try {
      const response = await markAttendanceAbsent({
        attendance_id: attendanceId,
        rejection_reason: absentReason.trim(),
      }).unwrap();
      toast(response.message ?? `${employee.name} marked absent.`, 'success');
      setPendingAbsentEmployee(null);
      setAbsentReason('');
    } catch (error) {
      toast(getApiErrorMessage(error, `Unable to mark ${employee.name} absent.`), 'error');
    } finally {
      setBusyEmployeeActions((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  }, [absentReason, markAttendanceAbsent, toast]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const recordPunch = useCallback(async (employee, action) => {
    if (action === 'in' && !employee.status) {
      toast(`${employee.name} is Inactive.`, 'error');
      return;
    }
    if (hasPendingShutdown(employee)) {
      toast('Punching is unavailable while a plant shutdown request is pending approval.', 'error');
      return;
    }
    if (action === 'in' && (shutdownQuery.isFetching || shutdownQuery.isError)) {
      toast('Unable to confirm plant shutdown status. Refresh and try again.', 'error');
      return;
    }
    const employeeShutdown = activeShutdowns.find((shutdown) => String(employee.plant_id) === String(shutdown.plant_id));
    if (action === 'in' && employeeShutdown) {
      setPendingPresenceEmployee(employee);
      return;
    }

    setBusyEmployeeActions((current) => ({ ...current, [employee.id]: action }));
    try {
      if (action === 'in') {
        await checkIn({
          employee_id: employee.id,
          working_plant_id: effectivePlant || employee.plant_id,
          department_id: employee.department_id,
          designation_id: employee.designation_id,
          shift_id: employee.shift_id,
          attendance_date: getLocalDate(),
        }).unwrap();
        toast(`${employee.name} checked in.`, 'success');
      } else {
        await checkOut({ attendance_id: employee.attendance.id }).unwrap();
        toast(`${employee.name} checked out.`, 'success');
      }
    } catch (error) {
      toast(getApiErrorMessage(error, `Unable to check ${action === 'in' ? 'in' : 'out'} ${employee.name}.`), 'error');
    } finally {
      setBusyEmployeeActions((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  }, [activeShutdowns, checkIn, checkOut, effectivePlant, hasPendingShutdown, shutdownQuery.isError, shutdownQuery.isFetching, toast]);

  const confirmShutdownPresence = async () => {
    const employee = pendingPresenceEmployee;
    if (!employee) return;
    setBusyEmployeeActions((current) => ({ ...current, [employee.id]: 'present' }));
    try {
      await markShutdownPresent({ employee_id: employee.id, attendance_date: today }).unwrap();
      setPendingPresenceEmployee(null);
      toast(`${employee.name} marked present for today.`, 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, `Unable to mark ${employee.name} present.`), 'error');
    } finally {
      setBusyEmployeeActions((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  };

  const undoShutdownPresence = useCallback(async (employee) => {
    const attendanceId = employee.attendance?.id;
    if (!attendanceId) return;
    setBusyEmployeeActions((current) => ({ ...current, [employee.id]: 'undo' }));
    try {
      await deleteAttendance(attendanceId).unwrap();
      toast(`${employee.name}'s shutdown attendance was undone.`, 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, `Unable to undo ${employee.name}'s attendance.`), 'error');
    } finally {
      setBusyEmployeeActions((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  }, [deleteAttendance, toast]);

  const declareShutdown = async (form) => {
    try {
      await createPlantShutdown({
        ...form,
        plant_id: Number(effectivePlant),
        reason: form.reason.trim(),
        shutdown_type: 'Plant shutdown',
      }).unwrap();
      setShutdownDialogOpen(false);
      toast('Plant shutdown request submitted for approval.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to declare plant shutdown.'), 'error');
    }
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Employee',
      render: (employee) => (
        <div className="flex min-w-48 items-center gap-3">
          {employee.image
            ? <img src={employee.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-sm font-semibold text-(--color-accent)">{initials(employee.name)}</span>}
          <span className="min-w-0">
            <span className="block truncate font-semibold">{employee.name}</span>
            <span className="block text-xs text-(--color-text-muted)">{employee.employee_code ?? `#${employee.id}`}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'plant_id',
      label: 'Plant',
      render: (employee) => employee.plant?.name ?? plantMap.get(String(employee.plant_id))?.name ?? '—',
    },
    {
      key: 'department_id',
      label: 'Department',
      render: (employee) => employee.department?.name ?? departmentMap.get(String(employee.department_id))?.name ?? '—',
    },
    {
      key: 'shift_id',
      label: 'Shift',
      render: (employee) => {
        const shift = employee.shift ?? shiftMap.get(String(employee.shift_id));
        return <span><span className="block font-medium">{shift?.name ?? 'Unassigned'}</span><span className="text-xs text-(--color-text-muted)">{getShiftTime(shift)}</span></span>;
      },
    },
    {
      key: '_attendance',
      label: 'Today',
      sortable: false,
      render: (employee) => {
        if (hasPendingShutdown(employee)) {
          return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"><Power size={13} /> Pending approval</span>;
        }
        if (employee.attendance?.shutdown_present) {
          return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"><Power size={13} /> Shutdown present</span>;
        }
        if (Number(employee.attendance?.status) === 0) {
          return <span title={employee.attendance?.rejection_reason || undefined} className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300"><UserRoundX size={14} /> Absent · rejected</span>;
        }
        if (Number(employee.attendance?.workflow_status) === 1) {
          return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"><Clock3 size={13} /> Pending review</span>;
        }
        if (Number(employee.attendance?.workflow_status) === 3) {
          return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300"><XCircle size={14} /> Rejected</span>;
        }
        const punch = employee.open_attendance ?? employee.attendance;
        if (!punch) {
          return <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-(--color-text-muted)"><Clock3 size={13} /> Not started</span>;
        }
        if (!punch.check_out) {
          return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300"><span className="h-1.5 w-1.5 rounded-full bg-green-600" /> In at {formatTime(punch.check_in)}</span>;
        }
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300"><BadgeCheck size={14} /> Completed</span>;
      },
    },
    {
      key: '_times',
      label: 'Punch times',
      sortable: false,
      render: (employee) => {
        const punch = employee.open_attendance ?? employee.attendance;
        return <span className="whitespace-nowrap text-xs text-(--color-text-muted)">In {formatTime(punch?.check_in)} <span className="mx-1">/</span> Out {formatTime(punch?.check_out)}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      render: (employee) => {
        const openPunch = employee.open_attendance;
        const punch = employee.attendance;
        const activePunch = openPunch ?? (punch && !punch.check_out ? punch : null);
        const isPendingReview = Number(punch?.workflow_status) === 1;
        const absentAction = canRejectAttendance
          && isPendingReview
          && Number(punch?.status) !== 0 ? (
          <button
            type="button"
            onClick={() => {
              setAbsentReason('');
              setPendingAbsentEmployee(employee);
            }}
            aria-label={`Mark ${employee.name} absent and reject attendance`}
            title="Reject this pending attendance and mark the employee absent"
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-500/40 px-3 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-300"
          >
            <UserRoundX size={15} /> Mark absent
          </button>
        ) : null;
        const busyAction = busyEmployeeActions[employee.id];
        if (busyAction) {
          const busyLabel = busyAction === 'absent' ? 'Marking absent...' : busyAction === 'present' ? 'Marking present...' : busyAction === 'undo' ? 'Undoing...' : busyAction === 'in' ? 'Punching in...' : 'Punching out...';
          return (
            <button type="button" disabled aria-label={`${busyLabel} ${employee.name}`} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-(--color-accent) px-3 text-sm font-semibold text-white opacity-80">
              <LoaderCircle size={16} className="animate-spin" /> {busyLabel}
            </button>
          );
        }
        if (Number(punch?.status) === 0) {
          return <span title={punch?.rejection_reason || undefined} className="text-sm font-medium text-red-700 dark:text-red-300">Absent · Rejected</span>;
        }
        if (hasPendingShutdown(employee)) {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <span aria-label={`Punching disabled for ${employee.name} while shutdown approval is pending`} title="Punching is disabled until the shutdown request is approved or rejected." className="inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-semibold text-amber-800 opacity-80 dark:text-amber-200"><Power size={15} /> Shutdown pending</span>
              {absentAction}
            </div>
          );
        }
        if (employee.attendance?.shutdown_present) {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => undoShutdownPresence(employee)} aria-label={`Undo shutdown attendance for ${employee.name}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-border-strong) px-3 py-2 text-sm font-semibold text-(--color-text) hover:bg-(--color-accent-soft)"><RotateCcw size={15} /> Undo present</button>
              {absentAction}
            </div>
          );
        }
        if (activePunch) {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => recordPunch({ ...employee, attendance: activePunch }, 'out')}
                aria-label={`Punch out ${employee.name}`}
                disabled={shutdownQuery.isFetching || shutdownQuery.isError}
                title={shutdownQuery.isFetching || shutdownQuery.isError ? 'Refresh to confirm this plant\'s shutdown status.' : undefined}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut size={16} /> Punch Out
              </button>
              {absentAction}
            </div>
          );
        }
        if (punch) {
          const status = isPendingReview
            ? 'Pending verification'
            : Number(punch.workflow_status) === 3
              ? 'Rejected'
              : 'Verified';
          return (
            <div className="flex flex-wrap items-center gap-2">
              <span title={punch.rejection_reason || undefined} className="text-sm font-medium text-(--color-text-muted)">{status}</span>
              {absentAction}
            </div>
          );
        }
        return (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => recordPunch(employee, 'in')}
              disabled={!employee.department_id || !employee.designation_id || !employee.shift_id || shutdownQuery.isFetching || shutdownQuery.isError}
              title={shutdownQuery.isFetching || shutdownQuery.isError ? 'Refresh to confirm this plant\'s shutdown status.' : !employee.department_id || !employee.designation_id || !employee.shift_id ? 'Assign department, designation, and shift before punching in.' : undefined}
              aria-label={`Punch in ${employee.name}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <LogIn size={16} /> Punch In
            </button>
          </div>
        );
      },
    },
  ], [busyEmployeeActions, canRejectAttendance, departmentMap, hasPendingShutdown, plantMap, recordPunch, shiftMap, shutdownQuery.isError, shutdownQuery.isFetching, undoShutdownPresence]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SectionCard
        title="Mark Daily Attendance"
        action={<div className="flex flex-wrap items-center gap-2">
          <span className="ml-2 hidden items-center gap-1.5 text-sm text-(--color-text-muted) sm:inline-flex"><CalendarDays size={15} />{todayLabel}</span>
          {canApproveAttendance && (
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={isBulkActionDisabled}
              title="Approve all pending attendance matching the current filters"
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck size={15} /> Approve all{pendingApprovalCount > 0 ? ` (${pendingApprovalCount})` : ''}
            </button>
          )}
          {canRejectAttendance && (
            <button
              type="button"
              onClick={() => setRejectAllOpen(true)}
              disabled={isBulkActionDisabled}
              title="Reject all pending attendance matching the current filters"
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle size={15} /> Reject all · mark absent{pendingApprovalCount > 0 ? ` (${pendingApprovalCount})` : ''}
            </button>
          )}
          {canRequestShutdown && (pendingShutdown
            ? <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-800 dark:text-amber-200"><Power size={15} /> Shutdown pending approval</span>
            : activeShutdown
            ? <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-800 dark:text-amber-200"><Power size={15} /> Shutdown declared</span>
          : <div className="flex flex-wrap items-center gap-2">
            {rejectedShutdown && (
              <span
                title={`Rejected ${getShutdownDateRange(rejectedShutdown)}. Reason: ${rejectedShutdown.remarks || 'No reason provided.'}`}
                aria-label={`Shutdown request rejected. ${getShutdownDateRange(rejectedShutdown)}. Reason: ${rejectedShutdown.remarks || 'No reason provided.'}`}
                className="inline-flex min-h-9 cursor-help items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 text-sm font-medium text-red-800 dark:text-red-200"
              >
                <Power size={15} /> Shutdown rejected
              </span>
            )}
            {rejectedShutdownQuery.isError && <span role="status" className="text-xs text-red-700 dark:text-red-300">Could not load rejection details. Refresh to retry.</span>}
            <button type="button" onClick={() => { setShutdownForm(getShutdownDefaults()); setShutdownDialogOpen(true); }} disabled={!effectivePlant || shutdownQuery.isFetching || rejectedShutdownQuery.isFetching} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"><Power size={15} /> Request shutdown</button>
          </div>)}
        </div>}
      >
        <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-(--color-border) sm:grid-cols-5">
          <div className="border-b border-r border-(--color-border) p-3 sm:border-b-0">
            <p className="text-xs font-medium text-(--color-text-muted)">Roster</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold"><Users size={17} className="text-(--color-accent)" />{counts.roster}</p>
          </div>
          <div className="border-b border-(--color-border) p-3 sm:border-b-0 sm:border-r">
            <p className="text-xs font-medium text-(--color-text-muted)">Not started</p>
            <p className="mt-1 text-xl font-semibold">{counts.notStarted}</p>
          </div>
          <div className="border-r border-(--color-border) p-3">
            <p className="text-xs font-medium text-(--color-text-muted)">Punched in</p>
            <p className="mt-1 text-xl font-semibold text-green-700 dark:text-green-300">{counts.punchedIn}</p>
          </div>
          <div className="p-3">
            <p className="text-xs font-medium text-(--color-text-muted)">Completed</p>
            <p className="mt-1 text-xl font-semibold text-sky-700 dark:text-sky-300">{counts.completed}</p>
          </div>
          <div className="border-t border-(--color-border) p-3 sm:border-l sm:border-t-0">
            <p className="text-xs font-medium text-(--color-text-muted)">Shutdown present</p>
            <p className="mt-1 text-xl font-semibold text-amber-800 dark:text-amber-200">{counts.shutdown_present ?? counts.shutdownPresent ?? 0}</p>
          </div>
        </div>

        <div className={`mb-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-2 ${singleAssignedPlant ? 'xl:grid-cols-[minmax(14rem,1.5fr)_repeat(2,minmax(10rem,1fr))_auto_auto]' : 'xl:grid-cols-[minmax(14rem,1.5fr)_repeat(3,minmax(10rem,1fr))_auto_auto]'}`}>
          <InputField
            aria-label="Search employees"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search name or employee code"
            leftIcon={<Search size={16} />}
            rightIcon={(isSearchPending || employeeQuery.isFetching) && <LoaderCircle size={15} className="animate-spin" />}
          />
          {!singleAssignedPlant && <SearchableSelect ariaLabel="Filter by plant" options={plantOptions} value={filters.plant} onChange={(value) => updateFilter('plant', value)} placeholder="All plants" isLoading={filtersQuery.isLoading} showSearch={false} />}
          <SearchableSelect ariaLabel="Filter by department" options={departmentOptions} value={filters.department} onChange={(value) => updateFilter('department', value)} placeholder="All departments" isLoading={filtersQuery.isLoading} showSearch={false} />
          <SearchableSelect ariaLabel="Filter by shift" options={shiftOptions} value={filters.shift} onChange={(value) => updateFilter('shift', value)} placeholder="All shifts" isLoading={filtersQuery.isLoading} showSearch={false} />
          <button
            type="button"
            onClick={() => { setSearch(''); setDebouncedSearch(''); setFilters({ plant: '', department: '', shift: '' }); setPage(1); }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-(--color-border-strong) px-3 text-sm font-medium text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-text)"
          >
            <RotateCcw size={15} /> Reset
          </button>
          <button
            type="button"
            aria-label="Refresh attendance roster"
            title="Refresh attendance roster"
            onClick={() => { employeeQuery.refetch(); filtersQuery.refetch(); shutdownQuery.refetch(); if (effectivePlant) rejectedShutdownQuery.refetch(); }}
            disabled={isRefreshing}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-(--color-border-strong) px-3 text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-text) disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {(filtersQuery.isError || (employeeQuery.isError && displayedEmployees.length === 0))
          ? <Feedback type="error" title="Unable to load attendance roster" message="Please refresh the page and try again." />
          : <PageTable
            columns={columns}
            rows={displayedEmployees}
            total={useCachedSearchResults ? displayedEmployees.length : Number(meta.total ?? displayedEmployees.length)}
            label="employees"
            isLoading={employeeQuery.isLoading || (Boolean(searchQuery) && (isSearchPending || employeeQuery.isFetching) && displayedEmployees.length === 0)}
            pagination={useCachedSearchResults ? null : <Pagination page={currentPage} lastPage={lastPage} onPageChange={setPage} />}
            emptyText="No employees match these filters"
          />}
      </SectionCard>

      {shutdownDialogOpen && (
        <PlantShutdownForm
          key="new-shutdown-request"
          isOpen={shutdownDialogOpen}
          mode="request"
          initialValues={shutdownForm}
          saving={submittingShutdown}
          onClose={() => setShutdownDialogOpen(false)}
          onSubmit={declareShutdown}
        />
      )}

      <ConfirmDelete
        isOpen={Boolean(pendingPresenceEmployee)}
        title="Mark employee present?"
        message={`${pendingPresenceEmployee?.name ?? 'This employee'} will be marked present for today during the plant shutdown. Cancel keeps attendance unchanged.`}
        confirmLabel="Mark present"
        confirmLoadingLabel="Marking present..."
        confirmClass="bg-emerald-700 hover:bg-emerald-800"
        icon={BadgeCheck}
        onConfirm={async () => {
          await confirmShutdownPresence();
        }}
        onCancel={() => setPendingPresenceEmployee(null)}
      />

      <ConfirmDelete
        isOpen={rejectAllOpen}
        title="Reject pending attendance?"
        message={`Mark all ${pendingApprovalCount} pending attendance record(s) matching the current date and filters as absent and rejected? This cannot be undone.`}
        confirmLabel="Mark absent & reject all"
        confirmLoadingLabel="Marking absent..."
        confirmClass="bg-red-600 hover:bg-red-700"
        confirmDisabled={!rejectAllReason.trim() || rejectingAll}
        icon={XCircle}
        onConfirm={handleRejectAll}
        onCancel={() => {
          setRejectAllOpen(false);
          setRejectAllReason('');
        }}
      >
        <label htmlFor="attendance-reject-all-reason" className="mb-1 block text-sm font-medium text-(--color-text)">
          Rejection reason <span className="text-red-600">*</span>
        </label>
        <textarea
          id="attendance-reject-all-reason"
          value={rejectAllReason}
          onChange={(event) => setRejectAllReason(event.target.value)}
          maxLength={1000}
          rows={3}
          required
          className="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
        />
      </ConfirmDelete>

      <ConfirmDelete
        isOpen={Boolean(pendingAbsentEmployee)}
        title="Mark employee absent?"
        message={`${pendingAbsentEmployee?.name ?? 'This employee'}${pendingAbsentEmployee?.attendance?.shift_id && shiftMap.get(String(pendingAbsentEmployee.attendance.shift_id))?.name ? ` (${shiftMap.get(String(pendingAbsentEmployee.attendance.shift_id)).name})` : ''} will be marked absent for the shift on this pending attendance record. It will be rejected and cannot be approved afterwards.`}
        confirmLabel="Mark absent & reject"
        confirmLoadingLabel="Marking absent..."
        confirmClass="bg-red-600 hover:bg-red-700"
        confirmDisabled={!absentReason.trim() || Boolean(busyEmployeeActions[pendingAbsentEmployee?.id])}
        icon={UserRoundX}
        onConfirm={async () => {
          if (pendingAbsentEmployee) await handleMarkAbsent(pendingAbsentEmployee);
        }}
        onCancel={() => {
          setPendingAbsentEmployee(null);
          setAbsentReason('');
        }}
      >
        <label htmlFor="attendance-absence-reason" className="mb-1 block text-sm font-medium text-(--color-text)">
          Reason <span className="text-red-600">*</span>
        </label>
        <textarea
          id="attendance-absence-reason"
          value={absentReason}
          onChange={(event) => setAbsentReason(event.target.value)}
          maxLength={1000}
          rows={3}
          required
          className="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
        />
      </ConfirmDelete>
    </div>
  );
};

export default Marking;