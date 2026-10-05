import { useMemo, useState } from 'react';
import { useGetEmployeeAttendanceQuery } from '../../store/api';
import AttendanceCalender from '../components/AttendanceCalender';

const formatDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const parseDate = (value) => {
	if (!value) return null;
	const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
	return year && month && day ? new Date(year, month - 1, day) : null;
};

const EmployeeAttendance = ({ employeeId, joiningDate }) => {
	const [month, setMonth] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1);
	});
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const joinedOn = parseDate(joiningDate);
	const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
	const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
	const gridStart = new Date(monthStart);
	gridStart.setDate(1 - gridStart.getDay());
	const gridEnd = new Date(gridStart);
	gridEnd.setDate(gridStart.getDate() + 41);
	const dateFrom = joinedOn && joinedOn > gridStart ? joinedOn : gridStart;
	const dateTo = gridEnd > today ? today : gridEnd;
	const validDateRange = dateFrom <= dateTo;
	const query = useGetEmployeeAttendanceQuery({ employeeId, date_from: formatDate(dateFrom), date_to: formatDate(dateTo), per_page: 100 }, { skip: !employeeId || !validDateRange });
	const records = useMemo(() => Array.isArray(query.data?.data) ? query.data.data : [], [query.data]);

	const changeMonth = (offset) => {
		const now = new Date();
		const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const joined = parseDate(joiningDate);
		const earliestMonth = joined
			? new Date(joined.getFullYear(), joined.getMonth(), 1)
			: new Date(now.getFullYear() - 50, 0, 1);
		const minimumMonth = earliestMonth > currentMonth ? currentMonth : earliestMonth;
		if (offset === 0) {
			setMonth(currentMonth);
			return;
		}
		setMonth((current) => {
			const target = new Date(current.getFullYear(), current.getMonth() + offset, 1);
			if (target < minimumMonth) return minimumMonth;
			if (target > currentMonth) return currentMonth;
			return target;
		});
	};
	const changeYear = (year) => {
		const now = new Date();
		const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const joined = parseDate(joiningDate);
		const earliestMonth = joined
			? new Date(joined.getFullYear(), joined.getMonth(), 1)
			: new Date(now.getFullYear() - 50, 0, 1);
		const minimumMonth = earliestMonth > currentMonth ? currentMonth : earliestMonth;
		setMonth((current) => {
			const target = new Date(year, current.getMonth(), 1);
			if (target < minimumMonth) return minimumMonth;
			if (target > currentMonth) return currentMonth;
			return target;
		});
	};

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
			<AttendanceCalender
				month={month}
				joiningDate={joiningDate}
				onMonthChange={changeMonth}
				onYearChange={changeYear}
				records={records}
				isLoading={query.isLoading || query.isFetching}
				error={query.isError}
				onRetry={query.refetch}
			/>
		</div>
	);
};

export default EmployeeAttendance;
