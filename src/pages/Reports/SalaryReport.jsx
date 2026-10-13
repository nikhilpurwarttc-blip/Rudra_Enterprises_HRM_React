import { useMemo, useState } from 'react';
import { Download, Filter, RefreshCw } from 'lucide-react';
import AccessDenied from '../../components/AccessDenied';
import Button from '../../components/Button';
import { Feedback, InlineError, LoadingState } from '../../components/Feedback';
import usePermission from '../../hooks/usePermission';
import {
  useCreatePayrollMutation,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
  useGetMonthlySalaryReportQuery,
  useGetPlantsQuery,
  useGetStatutorySalaryReportQuery,
  useGetYearlySalaryReportQuery,
  useLazyExportMonthlySalaryReportQuery,
  useLazyExportYearlySalaryReportQuery,
  useLockPayrollEmployeeMutation,
} from '../../store/api';
import {
  SalaryReportFilters,
  SalaryReportSummary,
  SalaryReportTable,
  SalaryReportTabs,
} from './SalaryReportComponents';

const unwrapList = (response) => {
  const list = response?.data ?? response;
  return Array.isArray(list) ? list : [];
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getErrorMessage = (error) => (
  error?.data?.message
  ?? error?.error
  ?? error?.message
  ?? 'The report could not be loaded. Please try again.'
);

const isValidYear = (value) => /^\d{4}$/.test(value) && Number(value) >= 2000;
const isValidPayrollMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const SalaryReport = () => {
  const { canView, can, isReadOnly } = usePermission('/reports/salary');
  const { can: canModule } = usePermission();
  const [activeReport, setActiveReport] = useState('monthly');
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [statutoryType, setStatutoryType] = useState('esi');
  const [plantIds, setPlantIds] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [exportError, setExportError] = useState('');
  const [payrollError, setPayrollError] = useState('');
  const [payrollMessage, setPayrollMessage] = useState('');
  const [lockingEmployeeId, setLockingEmployeeId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const canViewPlants = canModule('plants', 'view');
  const canViewDepartments = canModule('departments', 'view');
  const canViewDesignations = canModule('designations', 'view');
  const canLockEmployees = !isReadOnly
    && (
      (canModule('salary-report', 'create') && canModule('salary-report', 'edit'))
      || (canModule('payrolls', 'create') && canModule('payrolls', 'edit'))
    );
  const plantsQuery = useGetPlantsQuery({ per_page: 100 }, { skip: !canViewPlants });
  const departmentsQuery = useGetDepartmentsQuery(
    { per_page: 100, ...(plantIds.length === 1 ? { plant_id: plantIds[0] } : {}) },
    { skip: !canViewDepartments },
  );
  const designationsQuery = useGetDesignationsQuery({ per_page: 100 }, { skip: !canViewDesignations });
  const plants = unwrapList(plantsQuery.data);
  const departments = unwrapList(departmentsQuery.data);
  const designations = unwrapList(designationsQuery.data);
  const plantOptions = useMemo(() => [
    ...plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
  ], [plants]);
  const departmentOptions = useMemo(() => [
    { value: '', label: 'All departments' },
    ...departments.map((department) => ({ value: String(department.id), label: department.name })),
  ], [departments]);
  const designationOptions = useMemo(() => [
    { value: '', label: 'All designations' },
    ...designations.map((designation) => ({ value: String(designation.id), label: designation.name })),
  ], [designations]);
  const yearOptions = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const yearValue = String(new Date().getFullYear() - index);
    return { value: yearValue, label: yearValue };
  }), []);

  const reportFilters = useMemo(() => ({
    ...(plantIds.length ? { 'plant_ids[]': plantIds } : {}),
    ...(departmentId ? { department_id: departmentId } : {}),
    ...(designationId ? { designation_id: designationId } : {}),
  }), [plantIds, departmentId, designationId]);
  const validPayrollMonth = isValidPayrollMonth(payrollMonth);
  const [reportYear, reportMonth] = validPayrollMonth
    ? payrollMonth.split('-').map(Number)
    : [undefined, undefined];
  const validYear = isValidYear(year);
  const monthlyQuery = useGetMonthlySalaryReportQuery(
    { ...reportFilters, month: reportMonth, year: reportYear },
    { skip: activeReport !== 'monthly' || !validPayrollMonth },
  );
  const yearlyQuery = useGetYearlySalaryReportQuery(
    { ...reportFilters, year: Number(year) },
    { skip: activeReport !== 'yearly' || !validYear },
  );
  const statutoryQuery = useGetStatutorySalaryReportQuery(
    { ...reportFilters, type: statutoryType, payroll_month: payrollMonth },
    { skip: activeReport !== 'statutory' || !validPayrollMonth },
  );
  const [createPayroll, { isLoading: generatingPayroll }] = useCreatePayrollMutation();
  const [lockPayrollEmployee] = useLockPayrollEmployeeMutation();
  const [exportMonthly] = useLazyExportMonthlySalaryReportQuery();
  const [exportYearly] = useLazyExportYearlySalaryReportQuery();

  if (!canView) {
    return <AccessDenied pageName="salary and payroll reports" routePath="/reports/salary" />;
  }

  const selectedQuery = {
    monthly: monthlyQuery,
    yearly: yearlyQuery,
    statutory: statutoryQuery,
  }[activeReport];
  const response = selectedQuery.data?.data;
  const rows = activeReport === 'monthly'
    ? response?.items ?? []
    : activeReport === 'yearly'
      ? response?.employees ?? []
      : response?.items ?? [];
  const summary = activeReport === 'statutory' ? response?.summary : response?.totals;
  const hasActiveFilters = plantIds.length > 0 || Boolean(departmentId) || Boolean(designationId);

  const handleExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      if (activeReport === 'yearly' && !validYear) {
        setExportError('Enter a valid calendar year.');
        return;
      }
      if (activeReport === 'monthly' && !validPayrollMonth) {
        setExportError('Select a valid payroll month.');
        return;
      }
      const params = activeReport === 'monthly'
        ? { ...reportFilters, month: reportMonth, year: reportYear }
        : { ...reportFilters, year: Number(year) };
      const blob = activeReport === 'monthly'
        ? await exportMonthly(params).unwrap()
        : await exportYearly(params).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = activeReport === 'monthly'
        ? `Monthly_Salary_Report_${payrollMonth}.csv`
        : `Yearly_Salary_Report_${year}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const responseBlob = error?.data instanceof Blob ? error.data : null;
      if (responseBlob) {
        try {
          const errorBody = JSON.parse(await responseBlob.text());
          setExportError(errorBody.message ?? 'The CSV export failed. Please try again.');
        } catch {
          setExportError('The CSV export failed. Please try again.');
        }
      } else {
        setExportError(getErrorMessage(error));
      }
    } finally {
      setExporting(false);
    }
  };

  const handleLockEmployee = async (row) => {
    if (!validPayrollMonth) {
      setPayrollError('Select a valid payroll month before locking salary.');
      return;
    }

    setPayrollError('');
    setPayrollMessage('');
    setLockingEmployeeId(String(row.employee_id));
    try {
      let payrollId = row.payroll_id;
      if (!payrollId) {
        const payrollPlantId = plantIds.length === 1
          ? plantIds[0]
          : plantIds.length > 1
            ? [row.working_plant_id, row.home_plant_id].find((plantId) => plantIds.includes(String(plantId)))
            : null;
        if (plantIds.length > 1 && !payrollPlantId) {
          throw new Error('Unable to determine the employee plant for payroll generation. Refresh the report and try again.');
        }
        const result = await createPayroll({
          payroll_month: payrollMonth,
          ...(payrollPlantId ? { plant_id: Number(payrollPlantId) } : {}),
        }).unwrap();
        const payroll = result?.data ?? result;
        payrollId = payroll?.id;
      }
      if (!payrollId) {
        throw new Error('Payroll was generated but its identifier was not returned. Refresh the report and try again.');
      }
      await lockPayrollEmployee({ payrollId, employeeId: row.employee_id }).unwrap();
      setPayrollMessage(`${row.employee_name || 'Employee'}'s salary snapshot is locked for ${payrollMonth}.`);
    } catch (error) {
      setPayrollError(getErrorMessage(error));
    } finally {
      setLockingEmployeeId('');
    }
  };

  const handleReportChange = (report) => {
    setActiveReport(report);
    setExportError('');
    setPayrollError('');
    setPayrollMessage('');
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto p-2 sm:p-3">
      {/* <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-(--color-text)">Salary &amp; Payroll Report</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">View employee payroll calculations and statutory contributions.</p>
        </div>
      </header> */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SalaryReportTabs activeReport={activeReport} onChange={handleReportChange} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFiltersVisible((visible) => !visible)}
            aria-label={filtersVisible ? 'Hide salary report filters' : 'Show salary report filters'}
            aria-expanded={filtersVisible}
            aria-controls="salary-report-filters"
            title={hasActiveFilters ? 'Filters applied' : 'Filters'}
            className={`h-11 w-11 p-0 ${hasActiveFilters ? 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)' : ''}`}
          >
            <Filter size={16} aria-hidden="true" />
            <span className="sr-only">Filters</span>
          </Button>
          <Button
            type="button"
            onClick={() => selectedQuery.refetch()}
            disabled={selectedQuery.isFetching || (activeReport === 'yearly' ? !validYear : !validPayrollMonth)}
            aria-label="Refresh salary report"
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={selectedQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" />
            {selectedQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          {can('export') && activeReport !== 'statutory' && (
            <Button
              type="button"
              onClick={handleExport}
              disabled={exporting || selectedQuery.isFetching || (activeReport === 'yearly' ? !validYear : !validPayrollMonth)}
              className="flex items-center gap-2"
            >
              <Download size={16} /> {exporting ? 'Preparing CSV…' : 'Export CSV'}
            </Button>
          )}
        </div>
      </div>

      {filtersVisible && (
        <div id="salary-report-filters">
          <SalaryReportFilters
            activeReport={activeReport}
            payrollMonth={payrollMonth}
            onPayrollMonthChange={(event) => {
              setPayrollMonth(event.target.value);
              setPayrollError('');
              setPayrollMessage('');
            }}
            year={year}
            onYearChange={setYear}
            yearOptions={yearOptions}
            statutoryType={statutoryType}
            onStatutoryTypeChange={setStatutoryType}
            plantIds={plantIds}
            onPlantChange={(value) => { setPlantIds(value); setDepartmentId(''); }}
            plantOptions={plantOptions}
            isLoadingPlants={plantsQuery.isLoading}
            canViewPlants={canViewPlants}
            departmentId={departmentId}
            onDepartmentChange={setDepartmentId}
            departmentOptions={departmentOptions}
            isLoadingDepartments={departmentsQuery.isLoading}
            canViewDepartments={canViewDepartments}
            designationId={designationId}
            onDesignationChange={setDesignationId}
            designationOptions={designationOptions}
            isLoadingDesignations={designationsQuery.isLoading}
            canViewDesignations={canViewDesignations}
          />
        </div>
      )}

      {/* {activeReport === 'monthly' && canLockEmployees && (
        <div className="space-y-0.5 text-[11px] leading-tight text-(--color-text-muted)">
          <p>Salary previews use verified attendance and assigned charges. These actions require Salary Report Create and Edit permissions.</p>
          <p><strong>Generate &amp; lock</strong> creates or refreshes the month’s draft payroll, then freezes this employee’s calculation. <strong>Lock salary</strong> freezes this employee’s calculation in an existing draft. Neither action approves or pays payroll; batch approval and payment remain separate.</p>
        </div>
      )} */}
      {exportError && <InlineError message={exportError} />}
      {payrollError && <InlineError message={payrollError} />}
      {payrollMessage && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{payrollMessage}</p>}
      {activeReport === 'monthly' && !validPayrollMonth ? (
        <InlineError message="Select a valid payroll month to view employee salary calculations." />
      ) : activeReport === 'yearly' && !validYear ? (
        <InlineError message="Enter a valid calendar year from 2000 onward to view this report." />
      ) : selectedQuery.isError ? (
        <Feedback type="error" title="Unable to load salary report" message={getErrorMessage(selectedQuery.error)} />
      ) : selectedQuery.isLoading && !response ? (
        <LoadingState message="Loading salary report…" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {(plantsQuery.isError || departmentsQuery.isError || designationsQuery.isError) && (
            <p role="status" className="text-xs text-(--color-text-muted)">
              Some organization filters are unavailable for your role; the report data is still shown.
            </p>
          )}
          <SalaryReportSummary activeReport={activeReport} summary={summary} />
          {selectedQuery.isFetching && (
            <p role="status" className="text-xs text-(--color-text-muted)">Updating report…</p>
          )}
          <SalaryReportTable
            activeReport={activeReport}
            rows={rows}
            isLoading={selectedQuery.isFetching || generatingPayroll}
            payrollMonth={payrollMonth}
            chargeColumns={response?.charge_columns ?? []}
            onLockEmployee={handleLockEmployee}
            lockingEmployeeId={lockingEmployeeId}
            canLockEmployees={canLockEmployees}
            isLocking={generatingPayroll || Boolean(lockingEmployeeId)}
          />
        </div>
      )}
    </div>
  );
};

export default SalaryReport;
