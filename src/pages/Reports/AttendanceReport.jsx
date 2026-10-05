import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Clock3, UserCheck, UserX } from 'lucide-react';
import {
	useGetAttendanceReportFiltersQuery,
	useGetEmployeeAttendanceQuery,
	useGetEmployeesQuery,
} from '../../store/api';
import { Feedback } from '../../components/Feedback';
import SearchableSelect from '../../components/SearchableSelect';
import SectionCard from '../../components/SectionCard';
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
	const [departmentId, setDepartmentId] = useState('');
	const [shiftId, setShiftId] = useState('');
	const [month, setMonth] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1);
	});

	const filtersQuery = useGetAttendanceReportFiltersQuery();
	const departments = unwrap(filtersQuery.data?.departments);
	const shifts = unwrap(filtersQuery.data?.shifts);

	const employeesQuery = useGetEmployeesQuery({
		per_page: 100,
		...(departmentId ? { department_id: departmentId } : {}),
	});
	const allEmployees = unwrap(employeesQuery.data);
	const filteredEmployees = useMemo(() => {
		if (!shiftId) return allEmployees;
		return allEmployees.filter((emp) => String(emp.shift_id) === String(shiftId));
	}, [allEmployees, shiftId]);

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

	const employeeOptions = [
		{ value: '', label: 'Select employee' },
		...filteredEmployees.map((emp) => ({
			value: String(emp.id),
			label: emp.name,
			searchText: `${emp.name} ${emp.employee_code ?? ''}`,
			labelNode: (
				<span>
					<span className="block font-medium">{emp.name}</span>
					<span className="text-xs text-(--color-text-muted)">{emp.employee_code}</span>
				</span>
			),
		})),
	];

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
		<div className="space-y-4 p-4 sm:p-6">
			<SectionCard title={<span className="ml-2 inline-flex items-center gap-1.5"><CalendarDays size={15} />Attendance Calendar</span>}>
				{/* Filters */}
				<div className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
					<SearchableSelect
						ariaLabel="Select employee"
						label="Employee"
						options={employeeOptions}
						value={selectedEmployee}
						onChange={setSelectedEmployee}
						placeholder="Select employee"
						isLoading={employeesQuery.isLoading}
						showSearch
					/>
					<SearchableSelect
						ariaLabel="Filter by department"
						label="Department"
						options={[{ value: '', label: 'All departments' }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))]}
						value={departmentId}
						onChange={(v) => { setDepartmentId(v); setSelectedEmployee(''); }}
						placeholder="All departments"
						isLoading={filtersQuery.isLoading}
						showSearch={false}
					/>
					<SearchableSelect
						ariaLabel="Filter by shift"
						label="Shift"
						options={[{ value: '', label: 'All shifts' }, ...shifts.map((s) => ({ value: String(s.id), label: s.name }))]}
						value={shiftId}
						onChange={(v) => { setShiftId(v); setSelectedEmployee(''); }}
						placeholder="All shifts"
						isLoading={filtersQuery.isLoading}
						showSearch={false}
					/>
				</div>

				{/* Stats */}
				{selectedEmployee && (
					<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<StatCard icon={UserCheck} label="Present Days" value={stats.present} colorClass="bg-emerald-500/10 text-emerald-600" />
						<StatCard icon={UserX} label="Absent Days" value={stats.absent} colorClass="bg-rose-500/10 text-rose-600" />
						<StatCard icon={Clock3} label="Total OT Hours" value={`${stats.totalOT}h`} colorClass="bg-amber-500/10 text-amber-600" />
						<StatCard icon={Clock} label="Total Worked Hours" value={`${stats.totalWorked}h`} colorClass="bg-sky-500/10 text-sky-600" />
					</div>
				)}

				{/* Calendar or empty state */}
				{selectedEmployee ? (
					<AttendanceCalender
						month={month}
						onMonthChange={handleMonthChange}
						onYearChange={handleYearChange}
						records={records}
						isLoading={attendanceQuery.isLoading || attendanceQuery.isFetching}
						error={attendanceQuery.isError}
						onRetry={attendanceQuery.refetch}
					/>
				) : (
					<div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-(--color-border) text-(--color-text-muted)">
						<p className="text-sm">Select an employee to view their attendance calendar</p>
					</div>
				)}
			</SectionCard>
		</div>
	);
};

export default AttendanceReport;
