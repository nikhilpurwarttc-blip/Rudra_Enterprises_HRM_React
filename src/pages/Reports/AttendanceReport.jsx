import { useMemo, useState } from 'react';
import { Clock, Clock3, LoaderCircle, Search, UserCheck, UserRound, UserX } from 'lucide-react';
import {
	useGetAttendanceReportFiltersQuery,
	useGetEmployeeAttendanceQuery,
	useGetEmployeesQuery,
	useGetMaintenanceRecordsQuery,
	useGetPlantShutdownsQuery,
	useGetPlantsQuery,
} from '../../store/api';
import { Feedback } from '../../components/Feedback';
import InputField from '../../components/InputField';
import FilterModal from '../../components/FilterModal';
import AttendanceCalender from '../components/AttendanceCalender';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import usePermission from '../../hooks/usePermission';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];

const StatCard = ({ icon: Icon, label, value, colorClass }) => (
	<div className="flex items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-3">
		<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${colorClass}`}>
			<Icon size={17} />
		</span>
		<div>
			<p className="text-xs text-(--color-text-muted)">{label}</p>
			<p className="text-lg font-semibold text-(--color-text)">{value}</p>
		</div>
	</div>
);

const AttendanceReport = () => {
	const { can } = usePermission();
	const canViewShutdowns = can('plant-shutdowns', 'view');
	const canViewMaintenance = can('maintenance', 'view')
		|| can('maintenance-records', 'view')
		|| can('maintenance-report', 'view');
	const [selectedEmployee, setSelectedEmployee] = useState('');
	const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);
	const [plantId, setPlantId] = useState('');
	const [departmentId, setDepartmentId] = useState('');
	const [shiftId, setShiftId] = useState('');
	const [employeeSearch, setEmployeeSearch] = useState('');
	const debouncedEmployeeSearch = useDebouncedValue(employeeSearch.trim(), 250);
	const [month, setMonth] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1);
	});

	const filtersQuery = useGetAttendanceReportFiltersQuery();
	const plantsQuery = useGetPlantsQuery();
	const plants = unwrap(plantsQuery.data);

	const employeesQuery = useGetEmployeesQuery({
		per_page: 100,
		...(plantId ? { plant_id: plantId } : {}),
		...(departmentId ? { department_id: departmentId } : {}),
		...(debouncedEmployeeSearch ? { search: debouncedEmployeeSearch } : {}),
	});
	const allEmployees = unwrap(employeesQuery.data);
	const filteredEmployees = useMemo(() => {
		const query = employeeSearch.trim().toLocaleLowerCase();
		return allEmployees.filter((employee) => (
			(!shiftId || String(employee.shift_id) === String(shiftId))
			&& (!query || [employee.name, employee.employee_code].some((value) => String(value ?? '').toLocaleLowerCase().includes(query)))
		));
	}, [allEmployees, employeeSearch, shiftId]);
	const selectedEmployeeRecord = allEmployees.find((employee) => String(employee.id) === String(selectedEmployee)) ?? selectedEmployeeInfo;

	// Always fetch the full selected month
	const pad = (n) => String(n).padStart(2, '0');
	const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const gridStart = new Date(month.getFullYear(), month.getMonth(), 1);
	gridStart.setDate(1 - gridStart.getDay());
	const gridEnd = new Date(gridStart);
	gridEnd.setDate(gridStart.getDate() + 41);
	const dateFrom = formatDate(gridStart);
	const dateTo = formatDate(gridEnd);
	const summaryDateFrom = formatDate(new Date(month.getFullYear(), month.getMonth(), 1));
	const summaryDateTo = formatDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
	const selectedPlantId = selectedEmployeeRecord?.plant_id ?? selectedEmployeeRecord?.plant?.id;
	const shutdownsQuery = useGetPlantShutdownsQuery({
		plant_id: selectedPlantId,
		start_date: dateFrom,
		end_date: dateTo,
		per_page: 100,
	}, { skip: !selectedEmployee || !selectedPlantId || !canViewShutdowns });
	const maintenanceRecordsQuery = useGetMaintenanceRecordsQuery({
		plant_id: selectedPlantId,
		from_date: dateFrom,
		to_date: dateTo,
		per_page: 100,
	}, { skip: !selectedEmployee || !selectedPlantId || !canViewMaintenance });
	const shutdowns = unwrap(shutdownsQuery.data);
	const maintenanceRecords = unwrap(maintenanceRecordsQuery.data);

	const attendanceQuery = useGetEmployeeAttendanceQuery(
		{
			employeeId: selectedEmployee,
			date_from: dateFrom,
			date_to: dateTo,
			summary_date_from: summaryDateFrom,
			summary_date_to: summaryDateTo,
			per_page: 100,
		},
		{ skip: !selectedEmployee },
	);
	const records = useMemo(() => unwrap(attendanceQuery.data), [attendanceQuery.data]);
	const stats = attendanceQuery.currentData?.stats;

	const handleMonthChange = (offset) => {
		if (offset === 0) {
			const today = new Date();
			setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
			return;
		}
		setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
	};

	const handleYearChange = (year) => {
		setMonth((current) => new Date(year, current.getMonth(), 1));
	};

	const handleFilterApply = (nextFilters) => {
		setPlantId(nextFilters.plant || '');
		setDepartmentId(nextFilters.department || '');
		setShiftId(nextFilters.shift || '');
		setSelectedEmployee('');
		setSelectedEmployeeInfo(null);
	};

	if (filtersQuery.isError) {
		return <div className="p-4 sm:p-6"><Feedback type="error" title="Unable to load filters" message="Please refresh the page." /></div>;
	}

	return (
		<div className="flex min-h-0 flex-col lg:h-full lg:flex-row lg:overflow-hidden">
			<aside className="flex min-h-80 shrink-0 flex-col overflow-hidden border-r border-(--color-border) bg-(--color-bg-elevated) lg:min-h-0 lg:w-80">
				<div className="border-b border-(--color-border) px-4 py-4">
					<p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Attendance Report</p>
					<h1 className="mt-1 text-lg font-semibold text-(--color-text)">Employees <span className="ml-1 text-xs font-normal text-(--color-text-muted)">{filteredEmployees.length}</span></h1>
					<div className="mt-4 flex items-center gap-2">
						<InputField
							className="min-w-0 h-8 flex-1"
							aria-label="Search employees"
							value={employeeSearch}
							onChange={(event) => setEmployeeSearch(event.target.value)}
							placeholder="Search employees"
							leftIcon={<Search size={16} />}
							rightIcon={(employeeSearch.trim() !== debouncedEmployeeSearch || employeesQuery.isFetching) && <LoaderCircle size={15} className="animate-spin" />}
						/>
						<FilterModal
							title="Filter attendance employees"
							buttonLabel="Filter employees"
							values={{ plant: plantId, department: departmentId, shift: shiftId }}
							onApply={handleFilterApply}
							fields={[
								{
									key: 'plant',
									label: 'Plant',
									type: 'select',
									options: plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
									placeholder: 'All plants',
									isLoading: plantsQuery.isLoading,
									showSearch: false,
								},
								{
									key: 'department',
									label: 'Department',
									type: 'select',
									options: unwrap(filtersQuery.data?.departments).map((department) => ({ value: String(department.id), label: department.name })),
									placeholder: 'All departments',
									isLoading: filtersQuery.isLoading,
									showSearch: false,
								},
								{
									key: 'shift',
									label: 'Shift',
									type: 'select',
									options: unwrap(filtersQuery.data?.shifts).map((shift) => ({ value: String(shift.id), label: shift.name })),
									placeholder: 'All shifts',
									isLoading: filtersQuery.isLoading,
									showSearch: false,
								},
							]}
						/>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{employeesQuery.isError
						? <Feedback type="error" title="Unable to load employees" message="Please refresh the page and try again." />
						: employeesQuery.isLoading
							? <div className="flex justify-center py-8"><LoaderCircle size={20} className="animate-spin text-(--color-accent)" /></div>
							: filteredEmployees.length === 0
								? <p className="py-8 text-center text-sm text-(--color-text-muted)">No employees found.</p>
								: filteredEmployees.map((employee) => (
									<button
										key={employee.id}
										type="button"
										onClick={() => { setSelectedEmployee(String(employee.id)); setSelectedEmployeeInfo(employee); }}
										aria-pressed={String(selectedEmployee) === String(employee.id)}
										className={`mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${String(selectedEmployee) === String(employee.id) ? 'border-(--color-accent) bg-(--color-accent-soft)' : 'border-transparent hover:border-(--color-border) hover:bg-(--color-accent-soft)'}`}
									>
										{employee.image
											? <img src={employee.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
											: <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-sm font-semibold text-white">{String(employee.name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
										}
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-semibold text-(--color-text)">{employee.name}</span>
											<span className="mt-0.5 block truncate text-xs text-(--color-text-muted)">{employee.employee_code ?? 'No employee code'} · {employee.department?.name ?? 'No department'}</span>
										</span>
										{String(selectedEmployee) === String(employee.id) && <UserRound size={16} className="shrink-0 text-(--color-accent)" />}
									</button>
								))}
				</div>
			</aside>

			<main className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4">
				{selectedEmployee && (
					<>
						{/* <div className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
							<p className="text-xs text-(--color-text-muted)">Attendance for</p>
							<h2 className="mt-1 text-lg font-semibold text-(--color-text)">{selectedEmployeeRecord?.name ?? 'Selected employee'}</h2>
							{selectedEmployeeRecord?.employee_code && <p className="text-sm text-(--color-text-muted)">{selectedEmployeeRecord.employee_code}</p>}
						</div> */}
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<StatCard icon={UserCheck} label="Present Days" value={stats ? stats.present : '—'} colorClass="bg-emerald-500/10 text-emerald-600" />
							<StatCard icon={UserX} label="Absent Days" value={stats ? stats.absent : '—'} colorClass="bg-rose-500/10 text-rose-600" />
							<StatCard icon={Clock3} label="Total OT Hours" value={stats ? `${Number(stats.total_ot_hours).toFixed(1)}h` : '—'} colorClass="bg-amber-500/10 text-amber-600" />
							<StatCard icon={Clock} label="Total Worked Hours" value={stats ? `${Number(stats.total_worked_hours).toFixed(1)}h` : '—'} colorClass="bg-sky-500/10 text-sky-600" />
						</div>
						<AttendanceCalender
							month={month}
							joiningDate={selectedEmployeeRecord?.joining_date}
							onMonthChange={handleMonthChange}
							onYearChange={handleYearChange}
							records={records}
							shutdowns={shutdowns}
							maintenanceRecords={maintenanceRecords}
							isLoading={attendanceQuery.isLoading}
							error={attendanceQuery.isError}
							onRetry={attendanceQuery.refetch}
						/>
					</>
				)}
				{!selectedEmployee && (
					<div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-(--color-border) text-(--color-text-muted)">
						<div className="text-center">
							<UserRound size={28} className="mx-auto mb-3 text-(--color-accent)" />
							<p className="text-sm">Select an employee to view their attendance</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
};

export default AttendanceReport;
