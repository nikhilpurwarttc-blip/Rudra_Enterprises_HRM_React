import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CheckCheck, Clock3, LoaderCircle, LogIn, LogOut, Power, RefreshCw, RotateCcw, Search, UserRoundCheck, UserRoundX, Users, XCircle } from 'lucide-react';
import {
  useApproveAllAttendanceMutation,
  useCheckInAttendanceMutation,
  useCheckOutAttendanceMutation,
  useCreatePlantShutdownMutation,
  useDeleteAttendanceMutation,
  useGetAttendanceFiltersQuery,
  useGetAttendanceRosterQuery,
  useLazyGetEmployeeAttendanceQuery,
  useGetPlantShutdownsQuery,
  useGetShiftsQuery,
  useMarkAttendanceAbsentMutation,
  useMarkShutdownPresentMutation,
  useRejectAllAttendanceMutation,
  useVerifyAttendanceMutation,
} from '../../store/api';
import { useToast } from '../../contexts/ToastContext';
import { Feedback } from '../../components/Feedback';
import ConfirmDelete from '../../components/ConfirmDelete';
import PlantShutdownForm from '../components/PlantShutdownForm';
import InputField from '../../components/InputField';
import PageTable from '../../components/PageTable';
import Pagination from '../../components/Pagination';
import FilterModal from '../../components/FilterModal';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import usePermission from '../../hooks/usePermission';
import Button from '../../components/Button';
import { markShutdownAttendees } from '../../utils/markShutdownAttendees';
import useDebouncedValue from '../../hooks/useDebouncedValue';

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

const getAttendanceFilterStatus = (employee) => {
  const attendance = employee.attendance;
  if (attendance?.shutdown_present) return 'shutdown_present';
  if (Number(attendance?.status) === 0) return 'absent';
  if (Number(attendance?.workflow_status) === 1) return 'pending_review';
  if (Number(attendance?.workflow_status) === 3) return 'rejected';
  const punch = employee.open_attendance ?? attendance;
  if (!punch) return 'not_started';
  return punch.check_out ? 'completed' : 'punched_in';
};

const Marking = () => {
  const toast = useToast();
  const { can, isReadOnly } = usePermission();
  const canRequestShutdown = can('plant-shutdowns', 'shutdown');
  const canApproveAttendance = !isReadOnly && can('attendance', 'approve');
  const canRejectAttendance = !isReadOnly && can('attendance', 'reject');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ plant: '', department: '', shift: '', status: '' });
  const [busyEmployeeActions, setBusyEmployeeActions] = useState({});
  const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
  const [shutdownForm, setShutdownForm] = useState(getShutdownDefaults);
  const [pendingPresenceEmployee, setPendingPresenceEmployee] = useState(null);
  const [approveAllOpen, setApproveAllOpen] = useState(false);
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [rejectAllReason, setRejectAllReason] = useState('');
  const [pendingAbsentEmployee, setPendingAbsentEmployee] = useState(null);
  const [absentReason, setAbsentReason] = useState('');
  
  const [checkIn] = useCheckInAttendanceMutation();
  const [checkOut] = useCheckOutAttendanceMutation();
  const [markShutdownPresent, { isLoading: markingShutdownAttendees }] = useMarkShutdownPresentMutation();
  const [getEmployeeAttendance] = useLazyGetEmployeeAttendanceQuery();
  const [verifyAttendance] = useVerifyAttendanceMutation();
  const [approveAllAttendance, { isLoading: approvingAll }] = useApproveAllAttendanceMutation();
  const [rejectAllAttendance, { isLoading: rejectingAll }] = useRejectAllAttendanceMutation();
  const [markAttendanceAbsent] = useMarkAttendanceAbsentMutation();
  const [deleteAttendance] = useDeleteAttendanceMutation();
  const [createPlantShutdown, { isLoading: submittingShutdown }] = useCreatePlantShutdownMutation();

  const filtersQuery = useGetAttendanceFiltersQuery();
  const shiftsQuery = useGetShiftsQuery({ all: true, per_page: 100 });
  const lookupData = filtersQuery.data ?? {};
  const plants = unwrap(lookupData.plants);
  const departments = unwrap(lookupData.departments);
  const shifts = unwrap(shiftsQuery.data).length
    ? unwrap(shiftsQuery.data)
    : unwrap(lookupData.shifts);
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
  
  const refetchAttendanceRoster = employeeQuery.refetch;
  const isRefreshing = employeeQuery.isFetching
    || filtersQuery.isFetching
    || shiftsQuery.isFetching
    || shutdownQuery.isFetching
    || rejectedShutdownQuery.isFetching;

  const employees = unwrap(employeeQuery.currentData ?? employeeQuery.data);
  const searchQuery = search.trim();
  const cachedEmployees = useMemo(() => employees.filter((employee) => (
    (!effectivePlant || String(employee.plant_id) === effectivePlant)
    && (!filters.department || String(employee.department_id) === String(filters.department))
    && (!filters.shift || String(employee.shift_id) === String(filters.shift))
    && (!searchQuery || matchesEmployeeSearch(employee, searchQuery))
  )), [employees, effectivePlant, filters.department, filters.shift, searchQuery]);
  
  const isSearchPending = searchQuery !== debouncedSearch;
  const useCachedSearchResults = Boolean(searchQuery) && (isSearchPending || !employeeQuery.currentData);
  const pageEmployees = useCachedSearchResults ? cachedEmployees : employees;
  const displayedEmployees = filters.status
    ? pageEmployees.filter((employee) => (
      filters.status === 'shutdown_pending'
        ? hasPendingShutdown(employee)
        : !hasPendingShutdown(employee) && getAttendanceFilterStatus(employee) === filters.status
    ))
    : pageEmployees;
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

  const pageCounts = useMemo(() => pageEmployees.reduce((total, employee) => {
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
  }, { roster: 0, notStarted: 0, punchedIn: 0, completed: 0, shutdownPresent: 0, pendingVerification: 0 }), [pageEmployees]);
  
  const counts = useMemo(() => {
    const summary = employeeQuery.currentData?.summary ?? employeeQuery.data?.summary ?? {};
    if (useCachedSearchResults) return pageCounts;
    return {
      roster: Number(summary.roster ?? summary.total_roster ?? pageCounts.roster ?? 0),
      notStarted: Number(summary.not_started ?? summary.notStarted ?? pageCounts.notStarted ?? 0),
      punchedIn: Number(summary.punched_in ?? summary.punchedIn ?? pageCounts.punchedIn ?? 0),
      completed: Number(summary.completed ?? pageCounts.completed ?? 0),
      shutdownPresent: Number(summary.shutdown_present ?? summary.shutdownPresent ?? pageCounts.shutdownPresent ?? 0),
      pendingVerification: Number(summary.pending_verification ?? summary.pendingVerification ?? pageCounts.pendingVerification ?? 0),
    };
  }, [employeeQuery.currentData, employeeQuery.data, pageCounts, useCachedSearchResults]);
  
  const pendingApprovalCount = Number(
    employeeQuery.currentData?.summary?.pending_verification
    ?? employeeQuery.data?.summary?.pending_verification
    ?? pageCounts.pendingVerification,
  );
  
  const bulkDecisionFilters = useMemo(() => ({
    date: today,
    ...(effectivePlant ? { plant_id: effectivePlant } : {}),
    ...(filters.department ? { department_id: filters.department } : {}),
    ...(filters.shift ? { shift_id: filters.shift } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }), [today, effectivePlant, filters.department, filters.shift, debouncedSearch]);

  const isBulkActionDisabled = pendingApprovalCount < 1
    || employeeQuery.isFetching
    || isSearchPending
    || approvingAll
    || rejectingAll;

  const handleApproveAll = async () => {
    try {
      const response = await approveAllAttendance(bulkDecisionFilters).unwrap();
      toast(response.message ?? `${response.count ?? 0} attendance records approved.`, response.count ? 'success' : 'info');
      setApproveAllOpen(false);
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

  const handleApproveAttendance = useCallback(async (employee) => {
    const attendanceId = employee.attendance?.id;
    if (!attendanceId) {
      toast(`There is no pending attendance record to approve for ${employee.name}.`, 'error');
      return;
    }
    setBusyEmployeeActions((current) => ({ ...current, [employee.id]: 'approve' }));
    try {
      const response = await verifyAttendance(attendanceId).unwrap();
      toast(response.message ?? `${employee.name}'s attendance approved.`, 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, `Unable to approve ${employee.name}'s attendance.`), 'error');
    } finally {
      setBusyEmployeeActions((current) => {
        const next = { ...current };
        delete next[employee.id];
        return next;
      });
    }
  }, [toast, verifyAttendance]);

  const recordPunch = useCallback(async (employee, action) => {
    if (action === 'in' && !employee.status) {
      toast(`${employee.name} is Inactive.`, 'error');
      return;
    }
    if (hasPendingShutdown(employee)) {
      toast('Punching is unavailable while a plant shutdown request is pending approval.', 'error');
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
  }, [activeShutdowns, checkIn, checkOut, effectivePlant, hasPendingShutdown, toast]);

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

  const declareShutdown = async ({ attendees = [], markAttendees = false, ...form }) => {
    try {
      await createPlantShutdown({
        ...form,
        plant_id: Number(effectivePlant),
        reason: form.reason.trim(),
        shutdown_type: 'Plant shutdown',
      }).unwrap();

      let attendanceResult;
      if (markAttendees) {
        attendanceResult = await markShutdownAttendees({
          attendees,
          date: form.shutdown_start_date,
          getAttendance: async (employeeId, date) => unwrap(await getEmployeeAttendance({
            employeeId,
            date_from: date,
            date_to: date,
            per_page: 100,
          }).unwrap()),
          markPresent: (employeeId, date) => markShutdownPresent({
            employee_id: employeeId,
            attendance_date: date,
          }).unwrap(),
        });
      }

      setShutdownDialogOpen(false);
      toast('Plant shutdown request submitted for approval.', 'success');
      if (attendanceResult?.failures.length > 0) {
        toast(
          `Marked ${attendanceResult.markedCount}; skipped ${attendanceResult.skippedCount} already present or punched in. Unable to verify or mark: ${attendanceResult.failures.map(({ attendee }) => attendee.name).join(', ')}. ${getApiErrorMessage(attendanceResult.failures[0].error, 'Please review attendance and retry if needed.')}`,
          'error',
        );
      } else if (markAttendees) {
        toast(
          `${attendanceResult.markedCount} employee${attendanceResult.markedCount === 1 ? '' : 's'} marked present${attendanceResult.skippedCount ? `; ${attendanceResult.skippedCount} already present or punched in and skipped` : ''}.`,
          'success',
        );
      }
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
          return <span title={employee.attendance?.rejection_reason || undefined} className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300"><UserRoundX size={14} /> Marked Absent</span>;
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
        const approveAction = canApproveAttendance && isPendingReview && Number(punch?.status) !== 0 ? (
          <button
            type="button"
            onClick={() => handleApproveAttendance(employee)}
            aria-label={`Approve attendance for ${employee.name}`}
            title="Approve this pending attendance"
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-600/40 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
          >
            <UserRoundCheck size={15} />
          </button>
        ) : null;
        const absentAction = canRejectAttendance && isPendingReview && Number(punch?.status) !== 0 ? (
          <button
            type="button"
            onClick={() => {
              setAbsentReason('');
              setPendingAbsentEmployee(employee);
            }}
            aria-label={`Mark ${employee.name} absent and reject attendance`}
            title="Mark the employee absent"
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-500/40 px-3 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-300"
          >
            <UserRoundX size={15} />
          </button>
        ) : null;
        const busyAction = busyEmployeeActions[employee.id];
        if (busyAction) {
          const busyLabel = busyAction === 'approve' ? 'Approving...' : busyAction === 'absent' ? 'Marking absent...' : busyAction === 'present' ? 'Marking present...' : busyAction === 'undo' ? 'Undoing...' : busyAction === 'in' ? 'Punching in...' : 'Punching out...';
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
              {approveAction}
              {absentAction}
            </div>
          );
        }
        if (employee.attendance?.shutdown_present) {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => undoShutdownPresence(employee)} aria-label={`Undo shutdown attendance for ${employee.name}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-border-strong) px-3 py-2 text-sm font-semibold text-(--color-text) hover:bg-(--color-accent-soft)"><RotateCcw size={15} /> Undo present</button>
              {approveAction}
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
                title="Punch Out"
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                <LogOut size={16} />
              </button>
              {approveAction}
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
              {approveAction}
              {absentAction}
            </div>
          );
        }
        return (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => recordPunch(employee, 'in')}
              disabled={!employee.department_id || !employee.designation_id || !employee.shift_id}
              title={!employee.department_id || !employee.designation_id || !employee.shift_id ? 'Assign department, designation, and shift before punching in.' : 'Punch In'}
              aria-label={`Punch in ${employee.name}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={16} />
            </button>
          </div>
        );
      },
    },
  ], [busyEmployeeActions, canApproveAttendance, canRejectAttendance, departmentMap, handleApproveAttendance, hasPendingShutdown, plantMap, recordPunch, shiftMap, undoShutdownPresence]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-auto sm:min-w-52 sm:max-w-80 flex-1">
          <InputField
            aria-label="Search employees"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search name or employee code"
            leftIcon={<Search size={16} />}
            rightIcon={(isSearchPending || employeeQuery.isFetching) ? <LoaderCircle size={15} className="animate-spin" /> : null}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canApproveAttendance && (
            <button type="button" onClick={() => setApproveAllOpen(true)} disabled={isBulkActionDisabled}
              title="Approve all pending attendance matching the current filters"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
              <CheckCheck size={14} /> Approve All{pendingApprovalCount > 0 ? ` (${pendingApprovalCount})` : ''}
            </button>
          )}
          {canRequestShutdown && (
            pendingShutdown
              ? <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-800 dark:text-amber-200"><Power size={14} /> Shutdown pending</span>
              : activeShutdown
                ? <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-800 dark:text-amber-200"><Power size={14} /> Shutdown active</span>
                : (
                  <>
                    {rejectedShutdown && (
                      <span title={`Rejected ${getShutdownDateRange(rejectedShutdown)}. Reason: ${rejectedShutdown.remarks || 'No reason provided.'}`}
                        className="inline-flex h-9 cursor-help items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 text-sm font-medium text-red-800 dark:text-red-200">
                        <Power size={14} /> Shutdown rejected
                      </span>
                    )}
                    <button type="button"
                      onClick={() => { setShutdownForm(getShutdownDefaults()); setShutdownDialogOpen(true); }}
                      disabled={!effectivePlant || shutdownQuery.isFetching || rejectedShutdownQuery.isFetching}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                      <Power size={14} /> Request shutdown
                    </button>
                  </>
                )
          )}
          <div className="flex flex-wrap items-center gap-2">
            <FilterModal
              title="Filter attendance"
              values={filters}
              onApply={(nextFilters) => {
                setFilters(nextFilters);
                setPage(1);
              }}
              fields={[
                {
                  key: 'plant',
                  label: 'Plant',
                  type: 'select',
                  permission: 'attendance',
                  visible: !singleAssignedPlant,
                  options: plantOptions,
                  placeholder: 'All plants',
                  isLoading: shiftsQuery.isLoading || filtersQuery.isLoading,
                  showSearch: false,
                },
                {
                  key: 'department',
                  label: 'Department',
                  type: 'select',
                  permission: 'attendance',
                  options: departmentOptions,
                  placeholder: 'All departments',
                  isLoading: filtersQuery.isLoading,
                  showSearch: false,
                },
                {
                  key: 'shift',
                  label: 'Shift',
                  type: 'select',
                  permission: 'attendance',
                  options: shiftOptions,
                  placeholder: 'All shifts',
                  isLoading: filtersQuery.isLoading,
                  showSearch: false,
                },
                {
                  key: 'status',
                  label: 'Status',
                  type: 'select',
                  permission: 'attendance',
                  options: [
                    { value: 'pending_review', label: 'Pending review' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'not_started', label: 'Not started' },
                    { value: 'punched_in', label: 'Punched in' },
                    { value: 'absent', label: 'Absent' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'shutdown_present', label: 'Shutdown present' },
                    { value: 'shutdown_pending', label: 'Shutdown pending approval' },
                  ],
                  placeholder: 'All statuses',
                  showSearch: false,
                },
              ]}
            />
            <Button
              type="button"
              variant='ghost'
              aria-label="Refresh attendance roster"
              title="Refresh attendance roster"
              onClick={() => { employeeQuery.refetch(); filtersQuery.refetch(); shiftsQuery.refetch(); shutdownQuery.refetch(); if (effectivePlant) rejectedShutdownQuery.refetch(); }}
              disabled={isRefreshing}
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-3">
        {[
          { label: 'Employees', value: counts.roster, color: 'text-(--color-accent)', icon: <Users size={15} /> },
          { label: 'Not started', value: counts.notStarted, color: 'text-(--color-text)', icon: null },
          { label: 'Punched in', value: counts.punchedIn, color: 'text-emerald-600 dark:text-emerald-400', icon: null },
          { label: 'Completed', value: counts.completed, color: 'text-sky-600 dark:text-sky-400', icon: null },
          { label: 'Pending review', value: counts.pendingVerification, color: 'text-amber-700 dark:text-amber-300', icon: <Clock3 size={15} /> },
          counts.shutdownPresent
            ? { label: 'Shutdown present', value: counts.shutdownPresent, color: 'text-amber-700 dark:text-amber-300', icon: null }
            : null,
        ]
          .filter(Boolean)
          .map(({ label, value, color, icon }) => (
            <div
              key={label}
              className="flex-1 min-w-[140px] flex flex-col gap-1 p-3 rounded-xl border border-(--color-border) bg-(--color-surface)"
            >
              <p className="capitalize text-xs font-medium text-(--color-text-muted) truncate">{label}</p>
              <p className={`text-xl font-bold tabular-nums flex items-center gap-1.5 ${color}`}>{icon}{value}</p>
            </div>
          ))}
      </div>

      {/* ── Table card ── */}
      <div>
        {filters.status && (
          <p className="mb-2 text-xs text-(--color-text-muted)">
            Status filtering applies to employees on the current page.
          </p>
        )}
        {(filtersQuery.isError || (employeeQuery.isError && pageEmployees.length === 0))
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
      </div>

      {shutdownDialogOpen && (
        <PlantShutdownForm
          key="new-shutdown-request"
          isOpen={shutdownDialogOpen}
          mode="request"
          plantId={effectivePlant}
          initialValues={shutdownForm}
          saving={submittingShutdown || markingShutdownAttendees}
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
        isOpen={approveAllOpen}
        title="Approve pending attendance?"
        message={`Approve attendance for ${pendingApprovalCount} employee(s) matching the current date and filters?`}
        confirmLabel="Approve"
        confirmLoadingLabel="Approving..."
        confirmClass="bg-emerald-700 hover:bg-emerald-800"
        icon={BadgeCheck}
        onConfirm={handleApproveAll}
        onCancel={() => setApproveAllOpen(false)}
      />

      <ConfirmDelete
        isOpen={rejectAllOpen}
        title="Reject pending attendance?"
        message={`Reject attendance for ${pendingApprovalCount} employee(s) matching the current date and filters? Rejected employees will be marked absent. This cannot be undone.`}
        confirmLabel="Reject"
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