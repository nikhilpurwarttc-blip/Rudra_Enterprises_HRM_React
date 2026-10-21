import { useCallback, useMemo, useState } from 'react';
import {
	useGetEmployeeAttendanceQuery,
	useGetMaintenanceRecordsQuery,
	useGetPlantShutdownsQuery,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import AttendanceCalender from '../components/AttendanceCalender';

const formatDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const unwrapList = (value) => Array.isArray(value) ? value : value?.data ?? [];
const parseDate = (value) => {
	if (!value) return null;
	const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
	return year && month && day ? new Date(year, month - 1, day) : null;
};

const EmployeeAttendance = ({ employeeId, joiningDate, plantId }) => {
	const { can } = usePermission();
	const canViewShutdowns = can('plant-shutdowns', 'view');
	const canViewMaintenance = can('maintenance', 'view')
		|| can('maintenance-records', 'view')
		|| can('maintenance-report', 'view');
	const [month, setMonth] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1);
	});

	// Memoize today so it doesn't recreate on every render
	const today = useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}, []);

	const joinedOn = useMemo(() => parseDate(joiningDate), [joiningDate]);

	const { dateFrom, dateTo, validDateRange } = useMemo(() => {
		const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
		const gridStart = new Date(monthStart);
		gridStart.setDate(1 - gridStart.getDay());
		const gridEnd = new Date(gridStart);
		gridEnd.setDate(gridStart.getDate() + 41);
		const from = joinedOn && joinedOn > gridStart ? joinedOn : gridStart;
		const to = gridEnd > today ? today : gridEnd;
		return { dateFrom: from, dateTo: to, validDateRange: from <= to };
	}, [month, joinedOn, today]);

	const query = useGetEmployeeAttendanceQuery(
		{ employeeId, date_from: formatDate(dateFrom), date_to: formatDate(dateTo), per_page: 100 },
		{ skip: !employeeId || !validDateRange },
	);
	const records = useMemo(() => Array.isArray(query.data?.data) ? query.data.data : [], [query.data]);
	const shutdownsQuery = useGetPlantShutdownsQuery({
		plant_id: plantId,
		start_date: formatDate(dateFrom),
		end_date: formatDate(dateTo),
		per_page: 100,
	}, { skip: !employeeId || !plantId || !validDateRange || !canViewShutdowns });
	const maintenanceRecordsQuery = useGetMaintenanceRecordsQuery({
		plant_id: plantId,
		from_date: formatDate(dateFrom),
		to_date: formatDate(dateTo),
		per_page: 100,
	}, { skip: !employeeId || !plantId || !validDateRange || !canViewMaintenance });
	const shutdowns = useMemo(() => unwrapList(shutdownsQuery.data), [shutdownsQuery.data]);
	const maintenanceRecords = useMemo(() => unwrapList(maintenanceRecordsQuery.data), [maintenanceRecordsQuery.data]);

	// Shared bounds calculation — eliminates duplication between changeMonth and changeYear
	const getMonthBounds = useCallback(() => {
		const now = new Date();
		const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const earliestMonth = joinedOn
			? new Date(joinedOn.getFullYear(), joinedOn.getMonth(), 1)
			: new Date(now.getFullYear() - 50, 0, 1);
		const minimumMonth = earliestMonth > currentMonth ? currentMonth : earliestMonth;
		return { currentMonth, minimumMonth };
	}, [joinedOn]);

	const clampMonth = useCallback((target) => {
		const { currentMonth, minimumMonth } = getMonthBounds();
		if (target < minimumMonth) return minimumMonth;
		if (target > currentMonth) return currentMonth;
		return target;
	}, [getMonthBounds]);

	const changeMonth = useCallback((offset) => {
		if (offset === 0) {
			const { currentMonth } = getMonthBounds();
			setMonth(currentMonth);
			return;
		}
		setMonth((current) => clampMonth(new Date(current.getFullYear(), current.getMonth() + offset, 1)));
	}, [getMonthBounds, clampMonth]);

	const changeYear = useCallback((year) => {
		setMonth((current) => clampMonth(new Date(year, current.getMonth(), 1)));
	}, [clampMonth]);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
			<AttendanceCalender
				month={month}
				joiningDate={joiningDate}
				onMonthChange={changeMonth}
				onYearChange={changeYear}
				records={records}
				shutdowns={shutdowns}
				maintenanceRecords={maintenanceRecords}
				isLoading={query.isLoading}
				error={query.isError}
				onRetry={query.refetch}
			/>
		</div>
	);
};

export default EmployeeAttendance;
