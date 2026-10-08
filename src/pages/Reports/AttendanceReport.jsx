import { useEffect, useMemo, useState } from 'react';
import { Clock, Clock3, LoaderCircle, Search, UserCheck, UserRound, UserX } from 'lucide-react';
import {
	useGetAttendanceReportFiltersQuery,
	useGetEmployeeAttendanceQuery,
	useGetEmployeesQuery,
	useGetPlantsQuery,
} from '../../store/api';
import { Feedback } from '../../components/Feedback';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import AttendanceCalender from '../components/AttendanceCalender';

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
	const [selectedEmployee, setSelectedEmployee] = useState('');
	const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);
	const [plantId, setPlantId] = useState('');
	const [departmentId, setDepartmentId] = useState('');
	const [shiftId, setShiftId] = useState('');
	const [employeeSearch, setEmployeeSearch] = useState('');
	const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState('');
	const [month, setMonth] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1);
	});

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedEmployeeSearch(employeeSearch.trim()), 250);
		return () => window.clearTimeout(timer);
	}, [employeeSearch]);

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

	const attendanceQuery = useGetEmployeeAttendanceQuery(
		{ employeeId: selectedEmployee, date_from: dateFrom, date_to: dateTo, per_page: 100 },
		{ skip: !selectedEmployee },
	);
	const records = useMemo(() => unwrap(attendanceQuery.data), [attendanceQuery.data]);

	const stats = useMemo(() => {
		const grouped = new Map();
		records.forEach((rec) => {
			const key = String(rec.attendance_date ?? '').slice(0, 10);
			if (!key) return;
			const day = grouped.get(key) ?? { statuses: [], overtime: 0, worked: 0 };
			day.statuses.push(Number(rec.status));
			day.overtime += Number(rec.overtime_hours) || 0;
			day.worked += Number(rec.actual_worked_hours) || 0;
			grouped.set(key, day);
		});
		let present = 0, absent = 0, totalOT = 0, totalWorked = 0;
		grouped.forEach((day) => {
			if (day.statuses.includes(1)) present += 1;
			else if (day.statuses.includes(0)) absent += 1;
			totalOT += day.overtime;
			totalWorked += day.worked;
		});
		return { present, absent, totalOT: totalOT.toFixed(1), totalWorked: totalWorked.toFixed(1) };
	}, [records]);

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

	if (filtersQuery.isError) {
		return <div className="p-4 sm:p-6"><Feedback type="error" title="Unable to load filters" message="Please refresh the page." /></div>;
	}

	return (
		<div className="flex min-h-0 flex-col lg:h-full lg:flex-row lg:overflow-hidden">
			<aside className="flex min-h-80 shrink-0 flex-col overflow-hidden border-r border-(--color-border) bg-(--color-bg-elevated) lg:min-h-0 lg:w-80">
				<div className="border-b border-(--color-border) px-4 py-4">
					<p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Attendance Report</p>
					<h1 className="mt-1 text-lg font-semibold text-(--color-text)">Employees <span className="ml-1 text-xs font-normal text-(--color-text-muted)">{filteredEmployees.length}</span></h1>
					<div className="mt-4 space-y-3">
						<InputField
							aria-label="Search employees"
							value={employeeSearch}
							onChange={(event) => setEmployeeSearch(event.target.value)}
							placeholder="Search employees"
							leftIcon={<Search size={16} />}
							rightIcon={(employeeSearch.trim() !== debouncedEmployeeSearch || employeesQuery.isFetching) && <LoaderCircle size={15} className="animate-spin" />}
						/>
						<SearchableSelect
							ariaLabel="Filter employees by plant"
							options={[{ value: '', label: 'All Plants' }, ...plants.map((plant) => ({ value: String(plant.id), label: plant.name }))]}
							value={plantId}
							onChange={(value) => { setPlantId(value); setDepartmentId(''); setShiftId(''); setSelectedEmployee(''); setSelectedEmployeeInfo(null); }}
							placeholder="All Plants"
							isLoading={plantsQuery.isLoading}
							showSearch={false}
						/>
						{/*
						<SearchableSelect
							ariaLabel="Filter by department"
							options={[{ value: '', label: 'All departments' }, ...unwrap(filtersQuery.data?.departments).map((department) => ({ value: String(department.id), label: department.name }))]}
							value={departmentId}
							onChange={(value) => { setDepartmentId(value); setSelectedEmployee(''); setSelectedEmployeeInfo(null); }}
							placeholder="All departments"
							isLoading={filtersQuery.isLoading}
							showSearch={false}
						/>
						<SearchableSelect
							ariaLabel="Filter by shift"
							options={[{ value: '', label: 'All shifts' }, ...unwrap(filtersQuery.data?.shifts).map((shift) => ({ value: String(shift.id), label: shift.name }))]}
							value={shiftId}
							onChange={(value) => { setShiftId(value); setSelectedEmployee(''); setSelectedEmployeeInfo(null); }}
							placeholder="All shifts"
							isLoading={filtersQuery.isLoading}
							showSearch={false}
						/>
						*/}
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
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-sm font-semibold text-white">{String(employee.name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
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
							<StatCard icon={UserCheck} label="Present Days" value={stats.present} colorClass="bg-emerald-500/10 text-emerald-600" />
							<StatCard icon={UserX} label="Absent Days" value={stats.absent} colorClass="bg-rose-500/10 text-rose-600" />
							<StatCard icon={Clock3} label="Total OT Hours" value={`${stats.totalOT}h`} colorClass="bg-amber-500/10 text-amber-600" />
							<StatCard icon={Clock} label="Total Worked Hours" value={`${stats.totalWorked}h`} colorClass="bg-sky-500/10 text-sky-600" />
						</div>
						<AttendanceCalender
							month={month}
							onMonthChange={handleMonthChange}
							onYearChange={handleYearChange}
							records={records}
							isLoading={attendanceQuery.isLoading || attendanceQuery.isFetching}
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
