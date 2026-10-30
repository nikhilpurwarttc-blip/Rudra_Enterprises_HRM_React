import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Hammer, LoaderCircle, Pencil, Plus, Power, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import {
  useApprovePlantShutdownMutation,
  useCreateMaintenanceRecordMutation,
  useCreatePlantMutation,
  useCreatePlantShutdownMutation,
  useDeletePlantMutation,
  useGetMaintenanceRecordsQuery,
  useLazyGetEmployeeAttendanceQuery,
  useGetPlantShutdownsQuery,
  useGetPlantsQuery,
  useRejectPlantShutdownMutation,
  useUpdatePlantMutation,
  useMarkShutdownPresentMutation,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import { useToast } from '../../contexts/ToastContext';
import InputField from '../../components/InputField';
import Switch from '../../components/Switch';
import Badge from '../../components/Badge';
import ConfirmDelete from '../../components/ConfirmDelete';
import Button from '../../components/Button';
import { Feedback } from '../../components/Feedback';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import { useRenderPerformance } from '../../utils/performance';
import { markShutdownAttendees } from '../../utils/markShutdownAttendees';
import { selectUser } from '../../store/authSlice';
import PlantShutdownForm from '../components/PlantShutdownForm';
import PlantMaintenanceForm from '../components/PlantMaintenanceForm';
import AddEditPlant from './AddEditPlant';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getShutdownDates = (shutdown) => ({
  start: String(shutdown.shutdown_start_date ?? '').slice(0, 10),
  end: String(shutdown.shutdown_end_date ?? shutdown.shutdown_start_date ?? '').slice(0, 10),
});
const getShutdownStatus = (shutdown) => {
  const status = Number(shutdown.status);
  if (status === 1) return { label: 'Pending approval', color: 'amber' };
  if (status === 2) return { label: 'Approved', color: 'red' };
  if (status === 3) return { label: 'Rejected', color: 'slate' };
  return { label: 'Unknown status', color: 'gray' };
};
const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const getShutdownDefaults = (selectedDates = []) => {
  const dates = [...new Set(selectedDates)].sort();
  const startDate = dates[0] ?? getLocalDate();
  return {
    reason: 'Power cut / Maintenance',
    shutdown_start_date: startDate,
    shutdown_end_date: dates[dates.length - 1] ?? startDate,
  };
};
const hasDateGaps = (dates) => {
  if (dates.length < 2) return false;
  const start = new Date(`${dates[0]}T00:00:00Z`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  return (end - start) / 86_400_000 + 1 > dates.length;
};

const Plants = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/plants');
  const { can } = usePermission();
  const user = useSelector(selectUser);
  const { data, isLoading, isError } = useGetPlantsQuery({ all: true, per_page: 100 });
  const [createPlant, { isLoading: creating }] = useCreatePlantMutation();
  const [updatePlant, { isLoading: updating }] = useUpdatePlantMutation();
  const [deletePlant] = useDeletePlantMutation();
  const [createPlantShutdown, { isLoading: submittingShutdown }] = useCreatePlantShutdownMutation();
  const [markShutdownPresent, { isLoading: markingShutdownAttendees }] = useMarkShutdownPresentMutation();
  const [getEmployeeAttendance] = useLazyGetEmployeeAttendanceQuery();
  const [createMaintenanceRecord, { isLoading: submittingMaintenance }] = useCreateMaintenanceRecordMutation();
  const [approvePlantShutdown, { isLoading: approvingShutdown }] = useApprovePlantShutdownMutation();
  const [rejectPlantShutdown, { isLoading: rejectingShutdown }] = useRejectPlantShutdownMutation();
  const [search, setSearch] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [editor, setEditor] = useState({ open: false, plant: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [shutdownToApprove, setShutdownToApprove] = useState(null);
  const [shutdownToReject, setShutdownToReject] = useState(null);
  const [shutdownRequestOpen, setShutdownRequestOpen] = useState(false);
  const [shutdownRequestDates, setShutdownRequestDates] = useState([]);
  const [maintenanceRequestOpen, setMaintenanceRequestOpen] = useState(false);
  const [maintenanceDates, setMaintenanceDates] = useState([]);
  const [selectedCalendarDates, setSelectedCalendarDates] = useState([]);
  const [calendarContextMenu, setCalendarContextMenu] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const plants = unwrap(data);
  useRenderPerformance('getPlants', data);
  const assignedPlantIds = useMemo(() => {
    const rolePlantIds = user?.role?.plant_ids ?? user?.role?.plants?.map((plant) => plant.id);
    const userPlantIds = user?.assigned_plants?.map((plant) => (typeof plant === 'object' ? plant.id : plant));
    const plantIds = rolePlantIds?.length ? rolePlantIds : userPlantIds ?? rolePlantIds ?? [];
    return [...new Set(plantIds.map(String))];
  }, [user]);

  const filteredPlants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return plants.filter((plant) => !query || [plant.plant_code, plant.name, plant.address]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(query)));
  }, [plants, search]);
  const hasSingleAssignedPlant = assignedPlantIds.length === 1;
  const selectedPlant = hasSingleAssignedPlant
    ? plants.find((plant) => String(plant.id) === assignedPlantIds[0])
    : plants.find((plant) => String(plant.id) === String(selectedPlantId));
  const calendarDays = useMemo(() => {
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1);
    gridStart.setDate(1 - gridStart.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [month]);
  const shutdownQuery = useGetPlantShutdownsQuery(
    selectedPlant ? {
      plant_id: selectedPlant.id,
      start_date: dateKey(calendarDays[0]),
      end_date: dateKey(calendarDays[41]),
      per_page: 100,
    } : undefined,
    { skip: !selectedPlant },
  );
  const canViewMaintenanceCalendar = can('maintenance', 'view')
    || can('maintenance-records', 'view')
    || can('maintenance-report', 'view');
  const maintenanceQuery = useGetMaintenanceRecordsQuery(
    selectedPlant ? {
      plant_id: selectedPlant.id,
      from_date: dateKey(calendarDays[0]),
      to_date: dateKey(calendarDays[41]),
      per_page: 100,
    } : undefined,
    { skip: !selectedPlant || !canViewMaintenanceCalendar },
  );
  const shutdowns = unwrap(shutdownQuery.currentData).filter((shutdown) => [1, 2, 3].includes(Number(shutdown.status)));
  const maintenanceRecords = unwrap(maintenanceQuery.currentData);
  const canApproveShutdown = can('plant-shutdowns', 'approve');
  const canRejectShutdown = can('plant-shutdowns', 'reject');
  const canRequestShutdown = can('plant-shutdowns', 'shutdown');
  const canScheduleShutdown = !isReadOnly && canRequestShutdown;
  const canScheduleMaintenance = !isReadOnly && can('maintenance-report', 'create');
  const shutdownsByDate = useMemo(() => {
    const dates = new Map();
    shutdowns.forEach((shutdown) => {
      const { start, end } = getShutdownDates(shutdown);
      if (!start || !end) return;
      calendarDays.forEach((date) => {
        const key = dateKey(date);
        if (key >= start && key <= end) {
          const matches = dates.get(key) ?? [];
          matches.push(shutdown);
          dates.set(key, matches);
        }
      });
    });
    return dates;
  }, [calendarDays, shutdowns]);
  const maintenanceByDate = useMemo(() => {
    const dates = new Map();
    maintenanceRecords.forEach((record) => {
      const key = String(record.maintenance_date ?? '').slice(0, 10);
      if (!key) return;
      const matches = dates.get(key) ?? [];
      matches.push(record);
      dates.set(key, matches);
    });
    return dates;
  }, [maintenanceRecords]);
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);
  const todayKey = dateKey(new Date());

  const changeMonth = (offset) => {
    setSelectedCalendarDates([]);
    setCalendarContextMenu(null);
    setMonth((current) => offset === 0
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const refreshCalendar = () => {
    shutdownQuery.refetch();
    if (canViewMaintenanceCalendar) maintenanceQuery.refetch();
  };

  useEffect(() => {
    if (!calendarContextMenu) return undefined;
    const dismissMenu = (event) => {
      if (!event.target.closest?.('[data-calendar-context-menu]')) setCalendarContextMenu(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCalendarContextMenu(null);
    };
    const dismissOnViewportChange = () => setCalendarContextMenu(null);
    document.addEventListener('mousedown', dismissMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', dismissOnViewportChange);
    window.addEventListener('scroll', dismissOnViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', dismissMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', dismissOnViewportChange);
      window.removeEventListener('scroll', dismissOnViewportChange, true);
    };
  }, [calendarContextMenu]);

  const selectCalendarDate = (date, additive) => {
    if (date < todayKey) return;
    const dates = !additive
      ? [date]
      : selectedCalendarDates.includes(date)
        ? selectedCalendarDates.filter((selectedDate) => selectedDate !== date)
        : [...selectedCalendarDates, date].sort();
    setSelectedCalendarDates(dates);
    if (shutdownRequestOpen) setShutdownRequestDates(dates);
  };

  const handleCalendarCellClick = (event, date) => {
    if (date < todayKey) return;
    selectCalendarDate(date, event.ctrlKey || event.metaKey);
  };

  const handleCalendarCellContextMenu = (event, date) => {
    if (date < todayKey) {
      event.preventDefault();
      setCalendarContextMenu(null);
      return;
    }
    const dates = selectedCalendarDates.includes(date)
      ? selectedCalendarDates
      : [date];
    setSelectedCalendarDates(dates);
    if (!canScheduleShutdown && !canScheduleMaintenance) {
      setCalendarContextMenu(null);
      return;
    }
    event.preventDefault();
    const menuHeight = (canScheduleShutdown ? 1 : 0) * 44 + (canScheduleMaintenance ? 1 : 0) * 44 + 8;
    setCalendarContextMenu({
      dates,
      left: Math.max(8, Math.min(event.clientX, window.innerWidth - 232)),
      top: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    });
  };

  const handleCalendarCellKeyDown = (event, date) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (date < todayKey) return;
    selectCalendarDate(date, event.ctrlKey || event.metaKey);
  };

  const openShutdownRequest = (dates) => {
    setShutdownRequestDates([...dates].sort());
    setShutdownRequestOpen(true);
    setCalendarContextMenu(null);
  };

  const openMaintenanceRequest = (dates) => {
    setMaintenanceDates([...dates].sort());
    setMaintenanceRequestOpen(true);
    setCalendarContextMenu(null);
  };

  const handleApproveShutdown = async (form) => {
    if (!shutdownToApprove) return;
    try {
      await approvePlantShutdown({
        id: shutdownToApprove.id,
        plant_id: shutdownToApprove.plant_id,
        ...form,
        reason: form.reason.trim(),
        shutdown_type: shutdownToApprove.shutdown_type ?? 'Plant shutdown',
      }).unwrap();
      setShutdownToApprove(null);
      toast('Plant shutdown approved and declared.', 'success');
    } catch (error) {
      shutdownQuery.refetch();
      toast(getApiErrorMessage(error, 'Unable to update and approve plant shutdown.'), 'error');
    }
  };

  const handleRejectShutdown = async () => {
    const reason = rejectionReason.trim();
    if (!shutdownToReject || !reason) return;
    try {
      await rejectPlantShutdown({ id: shutdownToReject.id, remarks: reason }).unwrap();
      setShutdownToReject(null);
      setRejectionReason('');
      toast('Plant shutdown request rejected.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to reject plant shutdown.'), 'error');
    }
  };

  const handleRequestShutdown = async ({ attendees = [], markAttendees = false, ...form }) => {
    if (!selectedPlant) return;
    try {
      await createPlantShutdown({
        ...form,
        plant_id: Number(selectedPlant.id),
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

      setShutdownRequestOpen(false);
      setShutdownRequestDates([]);
      setSelectedCalendarDates([]);
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
      toast(getApiErrorMessage(error, 'Unable to submit plant shutdown request.'), 'error');
    }
  };

  const handleScheduleMaintenance = async ({ employee_id, remarks }) => {
    if (!selectedPlant || !maintenanceDates.length) return;
    const failedDates = [];
    let scheduledCount = 0;

    for (const maintenanceDate of maintenanceDates) {
      try {
        await createMaintenanceRecord({
          plant_id: Number(selectedPlant.id),
          employee_id,
          maintenance_date: maintenanceDate,
          remarks,
        }).unwrap();
        scheduledCount += 1;
      } catch (error) {
        failedDates.push({ date: maintenanceDate, error });
      }
    }

    if (failedDates.length > 0) {
      setMaintenanceDates(failedDates.map(({ date }) => date));
      if (scheduledCount > 0) {
        toast(
          `Scheduled maintenance for ${scheduledCount} of ${maintenanceDates.length} dates. Failed dates: ${failedDates.map(({ date }) => date).join(', ')}. ${getApiErrorMessage(failedDates[0].error, 'Please retry the remaining dates.')}`,
          'error',
        );
      } else {
        toast(getApiErrorMessage(failedDates[0].error, 'Unable to schedule maintenance.'), 'error');
      }
      return;
    }

    setMaintenanceRequestOpen(false);
    setMaintenanceDates([]);
    setSelectedCalendarDates([]);
    toast(`Maintenance scheduled for ${scheduledCount} ${scheduledCount === 1 ? 'date' : 'dates'}.`, 'success');
  };

  const handleStatusChange = useCallback(
    async (plant) => {
      if (!canEdit || isReadOnly) return;
      const newStatus = Number(plant.status) === 1 ? 0 : 1;
      setTogglingId(plant.id);
      try {
        await updatePlant({ id: plant.id, status: newStatus }).unwrap();
        toast('Plant status updated.', 'success');
      } catch (error) {
        toast(getApiErrorMessage(error, 'Unable to update plant status.'), 'error');
      } finally {
        setTogglingId(null);
      }
    },
    [canEdit, isReadOnly, toast, updatePlant]
  );

  const handleSave = async ({ id, ...payload }) => {
    if (!payload.plant_code || !payload.name) return toast('Plant code and name are required.', 'error');

    const maintenanceAmountValue = payload.maintenance_amount === null || payload.maintenance_amount === undefined || payload.maintenance_amount === ''
      ? 0
      : Number(payload.maintenance_amount);

    if (!Number.isFinite(maintenanceAmountValue) || maintenanceAmountValue < 0) {
      return toast('Maintenance amount must be a valid number greater than or equal to 0.', 'error');
    }

    const normalizedPayload = {
      ...payload,
      maintenance_amount: maintenanceAmountValue,
    };

    try {
      const savedPlant = id
        ? await updatePlant({ id, ...normalizedPayload }).unwrap()
        : await createPlant(normalizedPayload).unwrap();
      const plant = savedPlant?.data ?? savedPlant;
      if (!id && plant?.id) setSelectedPlantId(String(plant.id));
      toast(id ? 'Plant updated successfully.' : 'Plant created successfully.', 'success');
      setEditor({ open: false, plant: null });
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to save plant.'), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlant(deleteTarget.id).unwrap();
      if (String(selectedPlantId) === String(deleteTarget.id)) setSelectedPlantId('');
      toast('Plant deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to delete plant.'), 'error');
    }
  };

  return (
    <div className="flex min-h-0 flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      {!hasSingleAssignedPlant && <aside className="flex min-h-80 shrink-0 flex-col overflow-hidden border-r border-(--color-border) bg-(--color-bg-elevated) lg:min-h-0 lg:w-80">
        <div className="border-b border-(--color-border) px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Plant Management</p>
              <h1 className="mt-1 text-lg font-semibold text-(--color-text)">Plants <span className="ml-1 text-xs font-normal text-(--color-text-muted)">{filteredPlants.length}</span></h1>
            </div>
            {canCreate && !isReadOnly && <Button type="button" aria-label="Add plant" onClick={() => setEditor({ open: true, plant: null })} className="flex items-center gap-1.5"><Plus size={18} /></Button>}
          </div>
          <InputField className="mt-4" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plants" leftIcon={<Search size={16} />} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isError
            ? <Feedback type="error" title="Unable to load plants" message="Please refresh the page and try again." />
            : isLoading
              ? <div className="flex justify-center py-8"><LoaderCircle size={20} className="animate-spin text-(--color-accent)" /></div>
              : filteredPlants.length === 0
                ? <p className="py-8 text-center text-sm text-(--color-text-muted)">No plants found.</p>
                : filteredPlants.map((plant) => {
                  const isSelected = String(selectedPlantId) === String(plant.id);
                  return (
                    <div key={plant.id} className={`mb-1 flex items-center  rounded-lg border transition ${isSelected ? 'border-(--color-accent) bg-(--color-accent-soft)' : 'border-transparent hover:border-(--color-border) hover:bg-(--color-accent-soft)'}`}>
                      <button type="button" onClick={() => { setSelectedPlantId(String(plant.id)); setSelectedCalendarDates([]); setCalendarContextMenu(null); }} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-white"><Building2 size={17} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-(--color-text)">{plant.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-(--color-text-muted)">{plant.plant_code}</span>
                        </span>
                      </button>
                      {(canEdit && !isReadOnly) && <button type="button" aria-label={`Edit ${plant.name}`} onClick={() => setEditor({ open: true, plant })} className="rounded px-2 text-(--color-accent) hover:scale-110"><Pencil size={15} /></button>}
                      {(canDelete && !isReadOnly) && <button type="button" aria-label={`Delete ${plant.name}`} onClick={() => setDeleteTarget(plant)} className="mr-1 rounded px-2 text-red-500 hover:scale-110"><Trash2 size={15} /></button>}
                      {(canDelete && !isReadOnly) && <Switch
                        checked={Number(plant.status) === 1}
                        disabled={!canEdit || isReadOnly}
                        loading={togglingId === plant.id}
                        onClick={() => handleStatusChange(plant)}
                        ariaLabel={Number(plant.status) === 1 ? 'Active' : 'Inactive'}
                        className="mr-2"
                      />
                      }
                    </div>
                  );
                })}
        </div>
      </aside>}

      <main className={`min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 ${hasSingleAssignedPlant ? 'w-full' : ''}`}>
        {selectedPlant ? (
          <section className="space-y-4" aria-label={`${selectedPlant.name} shutdown calendar`}>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-(--color-accent-soft) text-(--color-accent)"><CalendarDays size={19} /></span>
                <div>
                  <h2 className="text-lg font-semibold text-(--color-text)">{selectedPlant.name}</h2>
                  <p className="text-xs text-(--color-text-muted)">{selectedPlant.plant_code} · {monthLabel} shutdown calendar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft)"><ChevronLeft size={17} /></button>
                <span className="min-w-32 text-center text-sm font-semibold text-(--color-text)">{monthLabel}</span>
                <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft)"><ChevronRight size={17} /></button>
                <button type="button" onClick={() => changeMonth(0)} className="h-9 rounded-md border border-(--color-border) px-3 text-sm font-medium text-(--color-text) hover:bg-(--color-accent-soft)">Today</button>
                <button type="button" aria-label="Refresh calendar" title="Refresh calendar" onClick={refreshCalendar} disabled={shutdownQuery.isFetching || maintenanceQuery.isFetching} className="flex h-9 w-9 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) disabled:cursor-wait disabled:opacity-60">
                  <RefreshCw size={15} className={(shutdownQuery.isFetching || maintenanceQuery.isFetching) ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
                </button>
                {/* {canRequestShutdown && <Button type="button" onClick={() => openShutdownRequest([])} disabled={submittingShutdown} className="inline-flex items-center gap-2 whitespace-nowrap bg-amber-700 hover:bg-amber-800"><Power size={15} />Request shutdown</Button>} */}
              </div>
            </header>

            <div className="">
              {shutdownQuery.isError
                ? <Feedback type="error" title="Unable to load shutdowns" message="Please refresh the calendar and try again." />
                : <>
                  <div className="mb-3 flex items-center gap-2 text-xs text-(--color-text-muted)">
                    <span className="h-3 w-3 rounded-sm bg-red-500" /> Approved shutdown
                    <span className="ml-3 h-3 w-3 rounded-sm bg-amber-500" /> Pending approval
                    <span className="ml-3 h-3 w-3 rounded-sm bg-slate-500" /> Rejected
                    {canViewMaintenanceCalendar && <><span className="ml-3 h-3 w-3 rounded-sm bg-violet-600" /> Scheduled maintenance</>}
                    <span className="ml-3">Click to select · Ctrl+click to toggle multiple days</span>
                    {selectedCalendarDates.length > 0 && <span className="font-semibold text-(--color-accent)">{selectedCalendarDates.length} selected</span>}
                    {(shutdownQuery.isFetching || maintenanceQuery.isFetching) && <LoaderCircle size={14} className="ml-auto animate-spin" aria-label="Loading calendar events" />}
                  </div>
                  {maintenanceQuery.isError && <Feedback type="error" title="Unable to load maintenance" message="Shutdown calendar events are still available. Refresh the calendar to retry maintenance records." />}
                  <div className="grid grid-cols-7 ">
                    {WEEKDAYS.map((weekday) => <div key={weekday} className="border-b border-r border-(--color-border) bg-(--color-accent-soft) py-2 text-center text-xs font-semibold text-(--color-text-muted) rounded-t-xl">{weekday}</div>)}
                    {calendarDays.map((date) => {
                      const key = dateKey(date);
                      const dayShutdowns = shutdownsByDate.get(key) ?? [];
                      const dayMaintenance = maintenanceByDate.get(key) ?? [];
                      const isCurrentMonth = date.getMonth() === month.getMonth();
                      const isPastDate = key < todayKey;
                      const isSelected = selectedCalendarDates.includes(key);
                      const hasApprovedShutdown = dayShutdowns.some((shutdown) => Number(shutdown.status) === 2);
                      const hasPendingShutdown = dayShutdowns.some((shutdown) => Number(shutdown.status) === 1);
                      const hasRejectedShutdown = dayShutdowns.some((shutdown) => Number(shutdown.status) === 3);
                      const hasMaintenance = dayMaintenance.length > 0;
                      const eventTitle = [
                        ...dayShutdowns.map((shutdown) => {
                          const status = getShutdownStatus(shutdown);
                          const rejection = Number(shutdown.status) === 3 && shutdown.remarks ? `\nRejection reason: ${shutdown.remarks}` : '';
                          return `${status.label}: ${shutdown.reason || shutdown.shutdown_type || 'Plant shutdown'}${rejection}`;
                        }),
                        ...dayMaintenance.map((record) => `Scheduled maintenance${record.employee?.name ? ` · ${record.employee.name}` : ''}${record.status_label ? ` · ${record.status_label}` : ''}${record.remarks ? `: ${record.remarks}` : ''}`),
                      ].join('\n');
                      return (
                        <div key={key} title={eventTitle} role="button" tabIndex={isPastDate ? -1 : 0} aria-disabled={isPastDate} aria-pressed={isSelected} aria-label={`${date.toLocaleDateString()}${isPastDate ? ', past date, selection disabled' : ''}${dayShutdowns.length ? `, ${dayShutdowns.length} shutdown${dayShutdowns.length === 1 ? '' : 's'}` : ''}${hasMaintenance ? `, ${dayMaintenance.length} maintenance record${dayMaintenance.length === 1 ? '' : 's'}` : ''}${isSelected ? ', selected' : ''}`} onClick={(event) => handleCalendarCellClick(event, key)} onContextMenu={(event) => handleCalendarCellContextMenu(event, key)} onKeyDown={(event) => handleCalendarCellKeyDown(event, key)} className={`min-h-16 ${isPastDate ? 'cursor-not-allowed' : 'cursor-pointer'} border-b border-r [&:nth-child(7n+1)]:border-l border-(--color-border) p-1.5 text-left transition-colors sm:min-h-24 sm:p-2 ${hasApprovedShutdown ? 'bg-red-500/10' : hasPendingShutdown ? 'bg-amber-500/10' : hasRejectedShutdown ? 'bg-slate-500/10' : hasMaintenance ? 'bg-violet-500/10' : ''} ${hasMaintenance ? 'border-t-4 border-t-violet-600' : ''} ${isSelected ? 'relative z-1 bg-(--color-accent-soft) ring-2 ring-inset ring-(--color-accent)' : isPastDate ? '' : 'hover:bg-(--color-accent-soft)/50'} ${!isCurrentMonth ? 'opacity-40' : isPastDate ? 'opacity-60' : ''}`}>
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${key === todayKey ? 'bg-(--color-accent) font-semibold text-white' : hasApprovedShutdown ? 'font-semibold text-red-700 dark:text-red-300' : hasPendingShutdown ? 'font-semibold text-amber-800 dark:text-amber-200' : hasRejectedShutdown ? 'font-semibold text-slate-700 dark:text-slate-300' : 'text-(--color-text)'}`}>{date.getDate()}</span>
                          {dayShutdowns.map((shutdown, index) => {
                            const status = getShutdownStatus(shutdown);
                            const isRejected = Number(shutdown.status) === 3;
                            const eventLabel = isRejected
                              ? `Rejected: ${shutdown.remarks || shutdown.reason || shutdown.shutdown_type || 'No reason provided'}`
                              : `${status.label}: ${shutdown.reason || shutdown.shutdown_type || 'Shutdown'}`;
                            const statusClass = status.color === 'amber' ? 'bg-amber-600' : status.color === 'red' ? 'bg-red-600' : 'bg-slate-600';
                            return <p
                              key={`${shutdown.id ?? shutdown.reason}-${index}`}
                              title={eventLabel}
                              className={`mt-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-white ${isRejected ? 'block' : 'hidden sm:block'} ${statusClass}`}
                            >
                              {eventLabel}
                            </p>;
                          })}
                          {dayMaintenance.map((record, index) => (
                            <p
                              key={`maintenance-${record.id ?? index}`}
                              title={`Scheduled maintenance${record.employee?.name ? ` · ${record.employee.name}` : ''}${record.status_label ? ` · ${record.status_label}` : ''}${record.remarks ? `: ${record.remarks}` : ''}`}
                              className="mt-1 hidden items-center gap-1 truncate rounded bg-violet-700 px-1.5 py-0.5 text-left text-[10px] font-medium text-white sm:flex"
                            >
                              <Hammer size={11} className="shrink-0" />
                              <span className="truncate">Maintenance{record.employee?.name ? ` · ${record.employee.name}` : ''}</span>
                            </p>
                          ))}
                          {(dayShutdowns.length > 0 || hasMaintenance) && (
                            <span className="mt-1 flex items-center gap-1.5 sm:hidden">
                              {dayShutdowns.length > 0 && <span className={`block h-1.5 w-1.5 rounded-full ${hasApprovedShutdown ? 'bg-red-600' : hasPendingShutdown ? 'bg-amber-600' : 'bg-slate-600'}`} />}
                              {hasMaintenance && <span className="block h-1.5 w-1.5 rounded-full bg-violet-700" />}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {shutdowns.length === 0 && maintenanceRecords.length === 0 && !shutdownQuery.isFetching && !maintenanceQuery.isFetching && <p className="mt-3 text-center text-sm text-(--color-text-muted)">No shutdowns or scheduled maintenance for this month.</p>}
                </>}
            </div>

            {shutdowns.length > 0 && (
              <section aria-label="Shutdown details">
                <h3 className="text-sm font-semibold text-(--color-text)">Shutdown details</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 ">
                  {shutdowns.map((shutdown) => {
                    const { start, end } = getShutdownDates(shutdown);
                    const isPending = Number(shutdown.status) === 1;
                    const status = getShutdownStatus(shutdown);
                    const statusBadgeColor = status.color === 'amber'
                      ? 'amber'
                      : status.color === 'red'
                        ? 'red'
                        : 'gray';
                    const statusAccent = status.color === 'amber'
                      ? 'border-l-amber-500'
                      : status.color === 'red'
                        ? 'border-l-red-500'
                        : 'border-l-slate-400';

                    return (
                      <div
                        key={shutdown.id ?? `${start}-${shutdown.reason}`}
                        className={`flex min-w-0 flex-col gap-3 rounded-xl border border-(--color-border) border-l-4 ${statusAccent} bg-(--color-surface)/70 p-4 shadow-sm`}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">
                              {start}{end && end !== start ? ` – ${end}` : ''}
                            </p>
                            <p className="mt-1 break-words text-sm font-semibold text-(--color-text)">
                              {shutdown.reason || shutdown.shutdown_type || 'Plant shutdown'}
                            </p>
                          </div>
                          <Badge color={statusBadgeColor} className="shrink-0">{status.label}</Badge>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-(--color-text-muted)">Affected shifts</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {shutdown.shifts?.length > 0
                                ? shutdown.shifts.map((shift) => (
                                  <Badge key={shift.id} color="primary">{shift.name}</Badge>
                                ))
                                : <span className="text-xs text-(--color-text-muted)">No shifts assigned</span>}
                            </div>
                          </div>
                          {Number(shutdown.status) === 3 && shutdown.remarks && (
                            <p className="rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-2.5 py-2 text-xs text-(--color-text-muted)">
                              <span className="font-semibold text-(--color-text)">Rejection reason: </span>
                              {shutdown.remarks}
                            </p>
                          )}
                        </div>

                        {isPending && (canApproveShutdown || canRejectShutdown) && (
                          <div className="flex flex-wrap items-center gap-2 border-t border-(--color-border) pt-3">
                            {canApproveShutdown && (
                              <Button
                                type="button"
                                onClick={() => setShutdownToApprove(shutdown)}
                                disabled={approvingShutdown || rejectingShutdown}
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm"
                              >
                                <Check size={16} />
                                Approve
                              </Button>
                            )}
                            {canRejectShutdown && (
                              <Button
                                type="button"
                                onClick={() => { setShutdownToReject(shutdown); setRejectionReason(''); }}
                                disabled={approvingShutdown || rejectingShutdown}
                                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
                              >
                                <XCircle size={16} />
                                Reject
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </section>
        ) : isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle size={22} className="animate-spin text-(--color-accent)" aria-label="Loading plants" />
          </div>
        ) : isError ? (
          <Feedback type="error" title="Unable to load plants" message="Please refresh the page and try again." />
        ) : hasSingleAssignedPlant ? (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-(--color-border) text-center text-sm text-(--color-text-muted)">
            The assigned plant could not be found. Contact an administrator.
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-(--color-border) text-(--color-text-muted)">
            <div className="text-center">
              <Building2 size={28} className="mx-auto mb-3 text-(--color-accent)" />
              <p className="text-sm">Select a plant to view its shutdown calendar</p>
            </div>
          </div>
        )}
      </main>

      {calendarContextMenu && (
        <div
          data-calendar-context-menu
          role="menu"
          aria-label="Calendar actions"
          style={{ position: 'fixed', left: calendarContextMenu.left, top: calendarContextMenu.top, zIndex: 10000 }}
          className="min-w-56 rounded-md border border-(--color-border-strong) bg-(--color-bg-elevated) p-1 text-(--color-text) shadow-xl"
          onContextMenu={(event) => event.preventDefault()}
        >
          {canScheduleShutdown && (
            <button
              type="button"
              role="menuitem"
              onClick={() => openShutdownRequest(calendarContextMenu.dates)}
              className="flex min-h-10 w-full items-center gap-3 rounded px-3 text-left text-sm hover:bg-(--color-accent-soft) focus:bg-(--color-accent-soft) focus:outline-none"
            >
              <Power size={16} /> Schedule Shutdown
            </button>
          )}
          {canScheduleMaintenance && (
            <button
              type="button"
              role="menuitem"
              onClick={() => openMaintenanceRequest(calendarContextMenu.dates)}
              className="flex min-h-10 w-full items-center gap-3 rounded px-3 text-left text-sm hover:bg-(--color-accent-soft) focus:bg-(--color-accent-soft) focus:outline-none"
            >
              <Hammer size={16} /> Schedule Maintenance
            </button>
          )}
        </div>
      )}

      <AddEditPlant key={`${editor.open}-${editor.plant?.id ?? 'new'}`} isOpen={editor.open} plant={editor.plant} saving={creating || updating} onClose={() => setEditor({ open: false, plant: null })} onSubmit={handleSave} />
      <ConfirmDelete isOpen={Boolean(deleteTarget)} title="Delete Plant" message={`Delete plant "${deleteTarget?.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      {shutdownRequestOpen && (
        <PlantShutdownForm
          key={`request-shutdown-${selectedPlant?.id}`}
          isOpen={shutdownRequestOpen}
          mode="request"
          plantId={selectedPlant?.id}
          shifts={selectedPlant?.shifts ?? []}
          initialValues={getShutdownDefaults(shutdownRequestDates)}
          hasSelectedDateGaps={hasDateGaps(shutdownRequestDates)}
          saving={submittingShutdown || markingShutdownAttendees}
          onClose={() => { setShutdownRequestOpen(false); setShutdownRequestDates([]); }}
          onSubmit={handleRequestShutdown}
        />
      )}
      {maintenanceRequestOpen && (
        <PlantMaintenanceForm
          key={`schedule-maintenance-${selectedPlant?.id}`}
          isOpen={maintenanceRequestOpen}
          plant={selectedPlant}
          dates={maintenanceDates}
          saving={submittingMaintenance}
          onClose={() => { setMaintenanceRequestOpen(false); setMaintenanceDates([]); }}
          onSubmit={handleScheduleMaintenance}
        />
      )}
      {shutdownToApprove && (
        <PlantShutdownForm
          key={`approve-shutdown-${shutdownToApprove.id}`}
          isOpen={Boolean(shutdownToApprove)}
          mode="approve"
          plantId={selectedPlant?.id}
          shifts={selectedPlant?.shifts ?? []}
          initialValues={shutdownToApprove}
          saving={approvingShutdown}
          onClose={() => setShutdownToApprove(null)}
          onSubmit={handleApproveShutdown}
        />
      )}
      <ConfirmDelete
        isOpen={Boolean(shutdownToReject)}
        title="Reject shutdown request"
        message="Provide a reason for rejecting this plant shutdown request."
        confirmLabel="Reject request"
        confirmLoadingLabel="Rejecting..."
        confirmClass="bg-red-600 hover:bg-red-700"
        confirmDisabled={!rejectionReason.trim()}
        icon={XCircle}
        onConfirm={handleRejectShutdown}
        onCancel={() => { setShutdownToReject(null); setRejectionReason(''); }}
      >
        <label className="block text-sm font-medium text-(--color-text)">
          Rejection reason
          <textarea
            autoFocus
            required
            rows={3}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text) focus:border-(--color-accent) focus:outline-none"
          />
        </label>
      </ConfirmDelete>
    </div>
  );
};

export default Plants;
