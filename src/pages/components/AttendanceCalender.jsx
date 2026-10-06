import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Info, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Feedback, LoadingState } from '../../components/Feedback';
import SearchableSelect from '../../components/SearchableSelect';
import { formatHours } from '../../utils/formatHours';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
	value: String(monthIndex),
	label: new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2000, monthIndex, 1)),
}));
const STATUS = {
	0: { label: 'Absent', cellClass: 'bg-rose-500/10', dotClass: 'bg-rose-500' },
	1: { label: 'Present', cellClass: 'bg-emerald-500/10', dotClass: 'bg-emerald-500' },
};

const dateKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const parseLocalDate = (value) => {
	if (!value) return null;
	const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
	return year && month && day ? new Date(year, month - 1, day) : null;
};
const formatTime = (value) => {
	if (!value) return '—';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Tooltip that portals near the trigger element
const RemarkTooltip = ({ remark }) => {
	const [visible, setVisible] = useState(false);
	const [style, setStyle] = useState({});
	const ref = useRef(null);

	const show = () => {
		if (!ref.current) return;
		const rect = ref.current.getBoundingClientRect();
		const top = rect.top + window.scrollY - 8;
		const left = rect.left + window.scrollX + rect.width / 2;
		setStyle({ position: 'absolute', top, left, transform: 'translate(-50%, -100%)', zIndex: 9999 });
		setVisible(true);
	};

	return (
		<span className="relative inline-flex">
			<button
				ref={ref}
				type="button"
				aria-label="View remark"
				onMouseEnter={show}
				onMouseLeave={() => setVisible(false)}
				onFocus={show}
				onBlur={() => setVisible(false)}
				onClick={(e) => { e.stopPropagation(); setVisible((v) => !v); }}
				className="flex items-center text-(--color-accent) hover:text-(--color-text)"
			>
				<Info size={11} />
			</button>
			{visible && createPortal(
				<div style={style} className="max-w-[200px] rounded-md border border-(--color-border-strong) bg-(--color-bg-elevated) px-2.5 py-1.5 text-[11px] leading-4 text-(--color-text) shadow-lg">
					{remark}
				</div>,
				document.body,
			)}
		</span>
	);
};

const AttendanceCalender = ({ month, joiningDate, onMonthChange, onYearChange, records = [], isLoading = false, error = false, onRetry }) => {
	const { dailyRecords, summary } = useMemo(() => {
		const grouped = new Map();

		records.forEach((record) => {
			const key = String(record.attendance_date ?? '').slice(0, 10);
			if (!key) return;
			const day = grouped.get(key) ?? { records: [], regular: 0, worked: 0, overtime: 0 };
			day.records.push(record);
			day.regular += Number(record.regular_hours) || 0;
			day.worked += Number(record.actual_worked_hours) || 0;
			day.overtime += Number(record.overtime_hours) || 0;
			grouped.set(key, day);
		});

		let present = 0;
		let absent = 0;
		let overtime = 0;
		grouped.forEach((day) => {
			const statuses = day.records.map((record) => Number(record.status));
			if (statuses.includes(1)) present += 1;
			else if (statuses.includes(0)) absent += 1;
			overtime += day.overtime;
		});

		return { dailyRecords: grouped, summary: { present, absent, overtime } };
	}, [records]);

	const calendarDays = useMemo(() => {
		const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
		const gridStart = new Date(firstOfMonth);
		gridStart.setDate(1 - firstOfMonth.getDay());
		return Array.from({ length: 42 }, (_, index) => {
			const date = new Date(gridStart);
			date.setDate(gridStart.getDate() + index);
			return date;
		});
	}, [month]);

	const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	const joinedOn = parseLocalDate(joiningDate);
	const earliestDate = joinedOn ?? new Date(today.getFullYear() - 50, 0, 1);
	const minimumMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
	const currentYear = today.getFullYear();
	const joinedYear = joinedOn?.getFullYear() ?? currentYear - 50;
	const firstYear = Math.min(joinedYear, currentYear);
	const yearOptions = Array.from({ length: currentYear - firstYear + 1 }, (_, index) => {
		const year = currentYear - index;
		return { value: String(year), label: String(year) };
	});
	const canGoPrevious = month.getFullYear() > minimumMonth.getFullYear()
		|| (month.getFullYear() === minimumMonth.getFullYear() && month.getMonth() > minimumMonth.getMonth());
	const canGoNext = month.getFullYear() < currentMonth.getFullYear()
		|| (month.getFullYear() === currentMonth.getFullYear() && month.getMonth() < currentMonth.getMonth());

	return (
		<section className="flex h-full min-h-0 flex-col gap-4" aria-label="Employee attendance calendar">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<span className="flex h-10 w-10 items-center justify-center rounded-md bg-(--color-accent-soft) text-(--color-accent)"><CalendarDays size={19} /></span>
					<div>
						<h2 className="text-lg font-semibold text-(--color-text)">{monthLabel}</h2>
						<p className="text-xs text-(--color-text-muted)">{summary.present} present days · {summary.absent} absent days · {formatHours(summary.overtime)} overtime</p>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<button type="button" aria-label="Previous month" title="Previous month" onClick={() => onMonthChange(-1)} disabled={!canGoPrevious} className="flex h-9 w-9 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-text) disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={17} /></button>
					<SearchableSelect
						ariaLabel="Select attendance month"
						options={MONTH_OPTIONS}
						value={String(month.getMonth())}
						onChange={(value) => onMonthChange(Number(value) - month.getMonth())}
						className="w-32"
						btnClass="!min-h-9 h-9 px-2"
						placeholder="Month"
						clearable={false}
					/>
					<SearchableSelect
						ariaLabel="Select attendance year"
						options={yearOptions}
						value={String(month.getFullYear())}
						onChange={(year) => onYearChange(Number(year))}
						className="w-24"
						btnClass="!min-h-9 h-9 px-2"
						placeholder="Year"
						clearable={false}
					/>
					<button type="button" onClick={() => onMonthChange(0)} className="h-9 rounded-md border border-(--color-border) px-3 text-sm font-medium text-(--color-text) hover:bg-(--color-accent-soft)">Today</button>
					<button type="button" aria-label="Refresh attendance" title="Refresh attendance" onClick={onRetry} disabled={isLoading} className="flex h-9 w-9 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-text) disabled:cursor-wait disabled:opacity-60">
						<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
					</button>
					<button type="button" aria-label="Next month" title="Next month" onClick={() => onMonthChange(1)} disabled={!canGoNext} className="flex h-9 w-9 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-text) disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={17} /></button>
				</div>
			</header>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-text-muted)" aria-label="Attendance status legend">
				{Object.entries(STATUS).map(([key, value]) => <span key={key} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${value.dotClass}`} />{value.label}</span>)}
			</div>

			{error ? (
				<Feedback type="error" title="Unable to load attendance" message="Try loading this month again." action={<button type="button" onClick={onRetry} className="mt-1 text-sm font-medium text-(--color-accent)">Retry</button>} />
			) : isLoading ? (
				<LoadingState message="Loading attendance..." className="flex-1" />
			) : (
				<div className="min-h-0 flex-1 overflow-auto rounded-md border border-(--color-border)" aria-busy={isLoading}>
					<div className="min-w-[760px]">
						<div className="grid grid-cols-7 border-b border-(--color-border) bg-(--color-accent-soft)">
							{WEEKDAYS.map((weekday) => <div key={weekday} className="px-2 py-2 text-center text-xs uppercase font-semibold text-(--color-text-muted)">{weekday}</div>)}
						</div>
						<div role="grid" className="grid grid-cols-7">
							{calendarDays.map((date) => {
								const key = dateKey(date);
								const beforeJoining = Boolean(joinedOn && date < joinedOn);
								const afterToday = date > today;
								const inEmploymentRange = !beforeJoining && !afterToday;
								const day = inEmploymentRange ? (dailyRecords.get(key) ?? null) : null;
								const isCurrentMonth = date.getMonth() === month.getMonth();
								const statuses = day?.records.map((record) => Number(record.status)) ?? [];
								const statusKey = statuses.includes(1) ? 1 : statuses.includes(0) ? 0 : statuses[0];
								const status = statusKey === undefined ? null : STATUS[statusKey] ?? { label: 'Recorded', cellClass: 'bg-(--color-accent-soft)', dotClass: 'bg-(--color-accent)' };
								const cellBackground = status?.cellClass ?? (isCurrentMonth ? 'bg-(--color-surface)' : 'bg-(--color-bg-elevated)');

								return (
									<article key={key} role="gridcell" aria-label={`${key}${status ? `, ${status.label}` : beforeJoining ? ', before joining date' : afterToday ? ', upcoming date' : ', no record'}`} className={`min-h-36 border-b border-r border-(--color-border) p-2 ${cellBackground} ${isCurrentMonth ? '' : 'text-(--color-text-muted)'} ${inEmploymentRange ? '' : 'opacity-40'}`}>
										{/* Date number */}
										<div className="mb-1.5 flex items-center justify-between gap-1">
											<time dateTime={key} className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${key === dateKey(new Date()) ? 'bg-(--color-accent) font-semibold text-white' : 'font-medium'}`}>{date.getDate()}</time>
										</div>

										{day ? (
											<div className="space-y-1.5">
												{/* Hours summary */}
												<div className="grid grid-cols-3 gap-x-1 text-[10px] leading-4">
													<span className="text-(--color-text-muted)">Reg</span>
													<span className="text-(--color-text-muted)">Work</span>
													<span className="text-(--color-text-muted) flex items-center gap-0.5">OT{day.overtime > 0 && <Clock3 size={9} className="text-amber-600" />}</span>
													<span className="font-semibold text-(--color-text)">{formatHours(day.regular)}</span>
													<span className="font-semibold text-(--color-text)">{formatHours(day.worked)}</span>
													<span className={`font-semibold ${day.overtime > 0 ? 'text-amber-600' : 'text-(--color-text)'}`}>{formatHours(day.overtime)}</span>
												</div>

												{/* Punch in/out table */}
												<div className="rounded border border-(--color-border) overflow-hidden">
													<table className="w-full text-[10px]">
														<thead>
															<tr className="bg-(--color-bg-elevated)">
																<th className="px-1 py-0.5 text-left font-medium text-(--color-text-muted)">In</th>
																<th className="px-1 py-0.5 text-left font-medium text-(--color-text-muted)">Out</th>
																<th className="w-4" />
															</tr>
														</thead>
														<tbody>
															{day.records.map((rec, idx) => (
																<tr key={rec.id ?? idx} className="border-t border-(--color-border)">
																	<td className="px-1 py-0.5 font-medium text-(--color-text)">{formatTime(rec.check_in)}</td>
																	<td className="px-1 py-0.5 font-medium text-(--color-text)">{formatTime(rec.check_out)}</td>
																	<td className="px-1 py-0.5 text-right">
																		{rec.remarks && <RemarkTooltip remark={rec.remarks} />}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										) : inEmploymentRange ? (
											<p className="text-[10px] text-(--color-text-muted)">No record</p>
										) : null}
									</article>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</section>
	);
};

export default AttendanceCalender;
