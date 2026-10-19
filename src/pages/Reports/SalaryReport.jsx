import { useMemo, useState } from 'react';
import { Banknote, Building2, CreditCard, Download, RefreshCw } from 'lucide-react';
import AccessDenied from '../../components/AccessDenied';
import Button from '../../components/Button';
import { Feedback, InlineError, LoadingState } from '../../components/Feedback';
import FilterModal from '../../components/FilterModal';
import InputField from '../../components/InputField';
import usePermission from '../../hooks/usePermission';
import RightModal from '../components/RightModal';
import {
  useGenerateEmployeePayrollMutation,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
  useGetMonthlySalaryReportQuery,
  useGetPlantsQuery,
  useGetStatutorySalaryReportQuery,
  useGetYearlySalaryReportQuery,
  useLazyExportMonthlySalaryReportQuery,
  useLazyExportYearlySalaryReportQuery,
  useLazyGetPayrollEmployeePaymentAccountsQuery,
  useLockPayrollEmployeeMutation,
  usePayPayrollEmployeeMutation,
} from '../../store/api';
import { SalaryReportSummary, SalaryReportTable, SalaryReportTabs } from './SalaryReportComponents';
import SearchableSelect from '../../components/SearchableSelect';

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
  ?? Object.values(error?.data?.errors ?? {})[0]?.[0]
  ?? error?.error
  ?? error?.message
  ?? 'The report could not be loaded. Please try again.'
);

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const isValidYear = (value) => /^\d{4}$/.test(value) && Number(value) >= 2000;
const isValidPayrollMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'imps', label: 'IMPS' },
];

const SalaryReport = () => {
  const { canView, can, isReadOnly } = usePermission('/reports/salary');
  const { can: canModule } = usePermission();
  const [activeReport, setActiveReport] = useState('monthly');
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [deductionTypeIds, setDeductionTypeIds] = useState([]);
  const [plantIds, setPlantIds] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [exportError, setExportError] = useState('');
  const [payrollError, setPayrollError] = useState('');
  const [payrollMessage, setPayrollMessage] = useState('');
  const [lockingEmployeeId, setLockingEmployeeId] = useState('');
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [loadingPaymentAccounts, setLoadingPaymentAccounts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const canViewPlants = canModule('plants', 'view');
  const canViewDepartments = canModule('departments', 'view');
  const canViewDesignations = canModule('designations', 'view');
  const canPayEmployees = !isReadOnly
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
    ...Object.fromEntries(plantIds.map((plantId, index) => [`plant_ids[${index}]`, plantId])),
    ...(departmentId ? { department_id: Number(departmentId) } : {}),
    ...(designationId ? { designation_id: Number(designationId) } : {}),
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
    { ...reportFilters, type: 'all', payroll_month: payrollMonth },
    { skip: activeReport !== 'statutory' || !validPayrollMonth },
  );
  const [generateEmployeePayroll, { isLoading: generatingPayroll }] = useGenerateEmployeePayrollMutation();
  const [lockPayrollEmployee, { isLoading: lockingPayrollEmployee }] = useLockPayrollEmployeeMutation();
  const [loadPaymentAccounts] = useLazyGetPayrollEmployeePaymentAccountsQuery();
  const [payPayrollEmployee, { isLoading: recordingPayment }] = usePayPayrollEmployeeMutation();
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
  const refreshReport = async () => {
    setManualRefreshing(true);
    try {
      await selectedQuery.refetch();
    } finally {
      setManualRefreshing(false);
    }
  };
  const response = selectedQuery.data?.data;
  const reportRows = activeReport === 'monthly'
    ? response?.items ?? []
    : activeReport === 'yearly'
      ? response?.employees ?? []
      : response?.items ?? [];
  const statutoryDeductionTypes = response?.deduction_types ?? [];
  const visibleDeductionTypes = deductionTypeIds.length
    ? statutoryDeductionTypes.filter((type) => deductionTypeIds.includes(String(type.id)))
    : statutoryDeductionTypes;
  const rows = activeReport === 'statutory' && statutoryDeductionTypes.length
    ? reportRows.map((row) => {
      const deductions = Object.fromEntries(
        visibleDeductionTypes
          .filter((type) => row.deductions?.[type.id])
          .map((type) => [type.id, row.deductions[type.id]]),
      );
      const employeeShare = Object.values(deductions)
        .reduce((total, contribution) => total + (Number(contribution.employee_share) || 0), 0);
      const employerShare = Object.values(deductions)
        .reduce((total, contribution) => total + (Number(contribution.employer_share) || 0), 0);
      return {
        ...row,
        deductions,
        employee_share: employeeShare,
        employer_share: employerShare,
        total_contribution: employeeShare + employerShare,
      };
    }).filter((row) => row.employee_share > 0 || row.employer_share > 0)
    : reportRows;
  const statutorySummary = activeReport === 'statutory' && response?.summary && statutoryDeductionTypes.length
    ? visibleDeductionTypes.reduce((totals, type) => {
      const categoryTotals = response.deduction_totals?.[type.id] ?? {};
      totals.total_employee_contribution += Number(categoryTotals.employee_share) || 0;
      totals.total_employer_contribution += Number(categoryTotals.employer_share) || 0;
      return totals;
    }, {
      ...response.summary,
      total_employees: rows.length,
      total_basic_pay: rows.reduce((total, row) => total + (Number(row.basic_pay) || 0), 0),
      total_wages: rows.reduce((total, row) => total + (Number(row.basic_pay) || 0), 0),
      total_employee_contribution: 0,
      total_employer_contribution: 0,
      grand_total: 0,
    })
    : null;
  const displayedStatutorySummary = statutorySummary ?? (activeReport === 'statutory' ? response?.summary : null);
  if (displayedStatutorySummary && statutorySummary) {
    displayedStatutorySummary.grand_total = displayedStatutorySummary.total_employee_contribution
      + displayedStatutorySummary.total_employer_contribution;
  }
  const summary = activeReport === 'statutory' ? displayedStatutorySummary : response?.totals;
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

  const closePaymentPanel = () => {
    if (generatingPayroll || lockingPayrollEmployee || recordingPayment || lockingEmployeeId) return;
    setPaymentTarget(null);
    setPaymentDetails(null);
    setPaymentError('');
    setPaymentMode('cash');
    setPaymentBankAccountId('');
    setPaymentReference('');
  };

  const handlePayEmployee = async (row) => {
    if (!validPayrollMonth) {
      setPayrollError('Select a valid payroll month before opening payment.');
      return;
    }

    setPayrollError('');
    setPayrollMessage('');
    const details = {
      employee: {
        id: row.employee_id,
        name: row.employee_name,
        employee_code: row.employee_code,
        designation: row.designation_name,
      },
      payroll: {
        id: row.payroll_id,
        month: payrollMonth,
        status: row.payroll_status,
      },
      item: {
        gross_salary: row.gross_salary,
        total_deductions: row.total_deductions,
        net_salary: row.net_salary,
        present_days: row.present_days,
        regular_hours: row.regular_hours,
        overtime_hours: row.overtime_hours,
      },
      bank_accounts: [],
    };
    setPaymentDetails(details);
    setPaymentTarget({ payrollId: row.payroll_id, employeeId: row.employee_id, row });
    setPaymentMode('cash');
    setPaymentReference('');
    setPaymentBankAccountId('');
    setPaymentError('');
    setLoadingPaymentAccounts(true);
    try {
      const accountsResponse = await loadPaymentAccounts(row.employee_id).unwrap();
      const accounts = accountsResponse?.data ?? accountsResponse;
      const primaryAccount = accounts.find((account) => account.is_primary) ?? accounts[0];
      setPaymentDetails((current) => current
        ? { ...current, bank_accounts: accounts }
        : current);
      setPaymentBankAccountId(primaryAccount ? String(primaryAccount.id) : '');
    } catch (error) {
      setPaymentError(getErrorMessage(error));
    } finally {
      setLoadingPaymentAccounts(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget) return;
    const isCashPayment = paymentMode === 'cash';
    if (!isCashPayment && !paymentBankAccountId) {
      setPaymentError('Select an active employee bank account for this payment mode.');
      return;
    }
    if (!isCashPayment && !paymentReference.trim()) {
      setPaymentError('Enter the bank transaction reference number.');
      return;
    }

    setPaymentError('');
    setLockingEmployeeId(String(paymentTarget.employeeId));
    try {
      let payrollId = paymentTarget.payrollId;
      if (!payrollId) {
        const { row } = paymentTarget;
        const payrollPlantId = plantIds.length === 1
          ? plantIds[0]
          : plantIds.length > 1
            ? [row.working_plant_id, row.home_plant_id].find((plantId) => plantIds.includes(String(plantId)))
            : null;
        if (plantIds.length > 1 && !payrollPlantId) {
          throw new Error('Unable to determine the employee plant for payroll generation. Refresh the report and try again.');
        }
        const result = await generateEmployeePayroll({
          employeeId: paymentTarget.employeeId,
          payroll_month: payrollMonth,
          ...(payrollPlantId ? { plant_id: Number(payrollPlantId) } : {}),
        }).unwrap();
        const payroll = result?.data ?? result;
        payrollId = payroll?.id;
        setPaymentTarget((current) => current
          ? { ...current, payrollId }
          : current);
        setPaymentDetails((current) => current
          ? { ...current, payroll: { ...current.payroll, id: payrollId } }
          : current);
      }
      if (!payrollId) {
        throw new Error('Payroll was generated but its identifier was not returned. Refresh the report and try again.');
      }
      if (!paymentTarget.row.is_locked) {
        await lockPayrollEmployee({ payrollId, employeeId: paymentTarget.employeeId }).unwrap();
        setPaymentTarget((current) => current
          ? { ...current, row: { ...current.row, is_locked: true } }
          : current);
      }
      const paymentResponse = await payPayrollEmployee({
        payrollId,
        employeeId: paymentTarget.employeeId,
        payment_mode: paymentMode,
        ...(isCashPayment ? {} : {
          employee_bank_account_id: Number(paymentBankAccountId),
          payment_reference: paymentReference.trim(),
        }),
      }).unwrap();
      const paidItem = paymentResponse?.data?.data ?? paymentResponse?.data ?? paymentResponse;
      setPayrollMessage(`${paymentDetails?.employee?.name || paymentTarget.row.employee_name || 'Employee'} paid ${formatCurrency(paidItem?.net_salary ?? paymentDetails?.item?.net_salary ?? paymentTarget.row.net_salary)} by ${PAYMENT_MODES.find((mode) => mode.value === paymentMode)?.label ?? paymentMode}.`);
      setPaymentTarget(null);
      setPaymentDetails(null);
      setPaymentMode('cash');
      setPaymentBankAccountId('');
      setPaymentReference('');
      await monthlyQuery.refetch();
    } catch (error) {
      setPaymentError(getErrorMessage(error));
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
          <FilterModal
            title="Filter salary report"
            values={{
              payrollMonth,
              year,
              deductionTypeIds,
              plants: plantIds.map(String),
              department: departmentId,
              designation: designationId,
            }}
            onApply={(nextFilters) => {
              setPayrollMonth(nextFilters.payrollMonth || currentMonth());
              setYear(nextFilters.year || String(new Date().getFullYear()));
              setDeductionTypeIds((nextFilters.deductionTypeIds ?? []).map(String));
              setPlantIds((nextFilters.plants ?? []).map(Number).filter(Number.isFinite));
              setDepartmentId(nextFilters.department || '');
              setDesignationId(nextFilters.designation || '');
              setPayrollError('');
              setPayrollMessage('');
            }}
            fields={[
              {
                key: 'payrollMonth',
                label: 'Payroll month',
                type: 'month',
                visible: activeReport === 'monthly' || activeReport === 'statutory',
              },
              {
                key: 'year',
                label: 'Calendar year',
                type: 'select',
                options: yearOptions,
                placeholder: 'Select calendar year',
                visible: activeReport === 'yearly',
              },
              {
                key: 'deductionTypeIds',
                label: 'Deduction types',
                type: 'multiselect',
                options: statutoryDeductionTypes.map((type) => ({
                  value: String(type.id),
                  label: type.code ? `${type.name} (${type.code})` : type.name,
                })),
                placeholder: 'All deduction types',
                isLoading: statutoryQuery.isLoading,
                visible: activeReport === 'statutory',
              },
              {
                key: 'plants',
                label: 'Plants',
                type: 'multiselect',
                permission: 'plants',
                options: plantOptions,
                placeholder: 'All plants',
                isLoading: plantsQuery.isLoading,
              },
              {
                key: 'department',
                label: 'Department',
                type: 'select',
                permission: 'departments',
                options: departmentOptions,
                placeholder: 'All departments',
                isLoading: departmentsQuery.isLoading,
              },
              {
                key: 'designation',
                label: 'Designation',
                type: 'select',
                permission: 'designations',
                options: designationOptions,
                placeholder: 'All designations',
                isLoading: designationsQuery.isLoading,
              },
            ]}
          />
          <Button
            type="button"
            variant='ghost'
            onClick={refreshReport}
            disabled={manualRefreshing || selectedQuery.isLoading || (activeReport === 'yearly' ? !validYear : !validPayrollMonth)}
            aria-label="Refresh salary report"
          // className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={manualRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
            {/* {selectedQuery.isFetching ? 'Refreshing…' : 'Refresh'} */}
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
          <SalaryReportTable
            activeReport={activeReport}
            rows={rows}
            isLoading={selectedQuery.isLoading}
            payrollMonth={payrollMonth}
            chargeColumns={response?.charge_columns ?? []}
            deductionTypes={visibleDeductionTypes}
            onPayEmployee={handlePayEmployee}
            payingEmployeeId={lockingEmployeeId}
            canPayEmployees={canPayEmployees}
            isPaying={generatingPayroll || lockingPayrollEmployee || recordingPayment || Boolean(lockingEmployeeId)}
            refreshReport={refreshReport}
            isRefreshing={manualRefreshing}
          />
        </div>
      )}

      <RightModal
        isOpen={Boolean(paymentTarget && paymentDetails)}
        onClose={closePaymentPanel}
        onSubmit={handleRecordPayment}
        title={`Pay employee${paymentDetails?.employee?.name ? ` · ${paymentDetails.employee.name}` : ''}`}
        saving={generatingPayroll || lockingPayrollEmployee || recordingPayment}
        submitDisabled={loadingPaymentAccounts}
        submitLabel="Record Payment"
        submitLoadingLabel="Generating, locking & recording…"
        className="max-w-xs"
      >
        {paymentDetails && (
          <>
            <section className="rounded-lg border border-(--color-border) bg-(--color-bg-elevated) p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-(--color-text)">{paymentDetails.employee?.name}</p>
                  <p className="mt-0.5 text-xs text-(--color-text-muted)">
                    {paymentDetails.employee?.employee_code || `Employee #${paymentDetails.employee?.id}`}
                    {paymentDetails.employee?.designation ? ` · ${paymentDetails.employee.designation}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-(--color-text-muted)">
                    Payroll {paymentDetails.payroll?.month} · {paymentDetails.payroll?.id ? `#${paymentDetails.payroll.id}` : 'will be generated on payment'}
                  </p>
                </div>
                <Banknote size={20} className="shrink-0 text-(--color-accent)" aria-hidden="true" />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-(--color-text-muted)">Gross pay</dt>
                <dd className="text-right font-medium text-(--color-text)">{formatCurrency(paymentDetails.item?.gross_salary)}</dd>
                <dt className="text-(--color-text-muted)">Deductions</dt>
                <dd className="text-right font-medium text-(--color-text)">{formatCurrency(paymentDetails.item?.total_deductions)}</dd>
                <dt className="border-t border-(--color-border) pt-2 font-semibold text-(--color-text)">Net payable</dt>
                <dd className="border-t border-(--color-border) pt-2 text-right text-base font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(paymentDetails.item?.net_salary)}
                </dd>
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-(--color-text)">
                <Building2 size={16} aria-hidden="true" /> Employee bank accounts
              </h3>
              {paymentDetails.bank_accounts?.length ? (
                paymentDetails.bank_accounts.map((account) => (
                  <div key={account.id} className="rounded-lg border border-(--color-border) p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-(--color-text)">{account.bank_name}</span>
                      {account.is_primary && (
                        <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[10px] font-semibold text-(--color-accent)">Primary</span>
                      )}
                    </div>
                    <p className="mt-1 text-(--color-text-muted)">A/C {account.account_number}</p>
                    <p className="text-xs text-(--color-text-muted)">
                      {account.account_holder_name}{account.ifsc_code ? ` · IFSC ${account.ifsc_code}` : ''}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-(--color-border-strong) p-3 text-xs text-(--color-text-muted)">
                  {loadingPaymentAccounts
                    ? 'Loading active bank accounts…'
                    : 'No active bank account is on file. Add an employee bank account before selecting a bank payment mode; Cash remains available.'}
                </p>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-(--color-text)">
                <CreditCard size={16} aria-hidden="true" /> Payment details
              </h3>
              <div>
                <SearchableSelect
                  label="Payment Mode"
                  id="salary-payment-mode"
                  value={paymentMode}
                  onChange={(value) => {
                    setPaymentMode(value);
                    setPaymentError('');
                  }}
                  options={PAYMENT_MODES}
                />
              </div>

              {paymentMode !== 'cash' && (
                <>
                  <div>
                    <SearchableSelect
                      label="Payment Account"
                      id="salary-payment-account"
                      value={paymentBankAccountId}
                      onChange={(value) => setPaymentBankAccountId(value)}
                      options={(paymentDetails.bank_accounts ?? []).map((account) => ({
                        value: account.id,
                        label: `${account.bank_name} · ${account.account_number}${account.is_primary ? ' · Primary' : ''}`
                      }))}
                    />
                  </div>
                  <InputField
                    label="Transaction number / reference"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Enter bank transaction reference"
                    required
                    autoComplete="off"
                  />
                </>
              )}
              {paymentError && <InlineError message={paymentError} />}
              <p className="text-xs text-(--color-text-muted)">
                This report amount is a preview. Record Payment generates and locks only this employee’s payroll calculation, then marks this employee paid.
              </p>
            </section>
          </>
        )}
      </RightModal>
    </div>
  );
};

export default SalaryReport;
