import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MoreVertical, Pencil, Plus, Search, UserRound, IdCard, WalletCards } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateEmployeeMutation,
  useCreateEmployeeBankAccountMutation,
  useCreateEmployeeDocumentMutation,
  useDeleteEmployeeBankAccountMutation,
  useDeleteEmployeeDocumentMutation,
  useGetChargesQuery,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useGetEmployeeBankAccountsQuery,
  useGetEmployeeDocumentsQuery,
  useGetPlantsQuery,
  useGetShiftsQuery,
  useUpdateEmployeeMutation,
} from '../../store/api';
import usePermission from '../../hooks/usePermission';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/Button';
import InputField from '../../components/InputField';
import { Feedback } from '../../components/Feedback';
import AddEditEmployee from './AddEditEmployee';
import EmployeeProfile from './EmployeeProfile';
import { getApiErrorMessage } from '../../components/feedbackUtils';
import { useRenderPerformance } from '../../utils/performance';

const unwrap = (value) => Array.isArray(value) ? value : value?.data ?? [];
const initials = (name) => String(name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const EmployeePlaceholder = ({ employee, type }) => {
  const isAttendance = type === 'attendance';
  const Icon = isAttendance ? CalendarDays : WalletCards;
  const title = isAttendance ? 'Attendance' : 'Salary';

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <Icon size={36} className="mx-auto mb-3 text-(--color-accent)" />
        <h2 className="text-lg font-semibold text-(--color-text)">{employee.name} {title}</h2>
        <p className="mt-2 text-sm text-(--color-text-muted)">{title} details for this employee will appear here.</p>
      </div>
    </div>
  );
};

const Employees = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { canCreate, canEdit, isReadOnly } = usePermission('/employees');
  const { data, isLoading, isError } = useGetEmployeesQuery();
  const { data: selectedEmployeeData } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: plantsData } = useGetPlantsQuery();
  const { data: departmentsData } = useGetDepartmentsQuery();
  const { data: designationsData } = useGetDesignationsQuery();
  const { data: shiftsData } = useGetShiftsQuery();
  const { data: chargesData } = useGetChargesQuery();
  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const [createEmployeeDocument, { isLoading: savingDocument }] = useCreateEmployeeDocumentMutation();
  const [deleteEmployeeDocument] = useDeleteEmployeeDocumentMutation();
  const [createEmployeeBankAccount, { isLoading: savingAccount }] = useCreateEmployeeBankAccountMutation();
  const [deleteEmployeeBankAccount] = useDeleteEmployeeBankAccountMutation();
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [menuEmployeeId, setMenuEmployeeId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [errors, setErrors] = useState({});

  const employeesData = unwrap(data);
  const plants = unwrap(plantsData);
  const departments = unwrap(departmentsData);
  const designations = unwrap(designationsData);
  const shifts = unwrap(shiftsData);
  const charges = unwrap(chargesData);
  const selectedEmployee = employeesData.find((employee) => String(employee.id) === String(id)) ?? (selectedEmployeeData?.data ?? selectedEmployeeData);
  const workflowEmployee = selectedEmployee ?? createdEmployee;
  const workflowEmployeeId = workflowEmployee?.id ?? (location.pathname.endsWith('/edit') ? id : null);
  const { data: employeeDocumentsData, isLoading: employeeDocumentsLoading } = useGetEmployeeDocumentsQuery(workflowEmployeeId, { skip: !workflowEmployeeId });
  const { data: employeeAccountsData, isLoading: employeeAccountsLoading } = useGetEmployeeBankAccountsQuery(workflowEmployeeId, { skip: !workflowEmployeeId });
  const employeeDocuments = unwrap(employeeDocumentsData);
  const employeeAccounts = unwrap(employeeAccountsData);
  const isAddRoute = location.pathname === '/employees/add';
  const isEditRoute = location.pathname.endsWith('/edit');
  const activeView = location.pathname.endsWith('/attendance')
    ? 'attendance'
    : location.pathname.endsWith('/salary')
      ? 'salary'
      : 'profile';

  useRenderPerformance('getEmployees', data);

  const employees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employeesData.filter((employee) => !query || [
      employee.employee_code,
      employee.name,
      employee.barcode,
      employee.mobile_number,
      employee.plant?.name,
      employee.department?.name,
    ].some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [employeesData, search]);

  const openEmployeeView = (employee, view = 'profile') => {
    setMenuEmployeeId(null);
    setMenuPosition(null);
    navigate(view === 'profile' ? `/employees/${employee.id}` : `/employees/${employee.id}/${view}`);
  };

  useEffect(() => {
    const closeMenuWhenClickingOutside = (event) => {
      if (!event.target.closest('[data-employee-menu]')) {
        setMenuEmployeeId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', closeMenuWhenClickingOutside);
    return () => document.removeEventListener('mousedown', closeMenuWhenClickingOutside);
  }, []);

  const handleSave = async (payload) => {
    try {
      const savedEmployee = payload.id
        ? await updateEmployee(payload).unwrap()
        : await createEmployee(payload).unwrap();
      const employeeRecord = savedEmployee?.data ?? savedEmployee;
      setCreatedEmployee(employeeRecord);
      toast(payload.id ? 'Employee updated successfully.' : 'Employee created successfully.', 'success');
      setErrors({});
      return employeeRecord;
    } catch (error) {
      setErrors(error?.data?.errors ?? {});
      toast(getApiErrorMessage(error, 'Unable to save employee.'), 'error');
      return null;
    }
  };

  const handleSaveDocument = async (payload) => {
    try {
      await createEmployeeDocument(payload).unwrap();
      toast('KYC document submitted.', 'success');
      return true;
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to submit KYC document.'), 'error');
      return false;
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteEmployeeDocument(documentId).unwrap();
      toast('KYC document removed.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to remove KYC document.'), 'error');
    }
  };

  const handleSaveAccount = async (payload) => {
    try {
      await createEmployeeBankAccount(payload).unwrap();
      toast('Bank account details submitted.', 'success');
      return true;
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to submit bank account details.'), 'error');
      return false;
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      await deleteEmployeeBankAccount(accountId).unwrap();
      toast('Bank account removed.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to remove bank account.'), 'error');
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <aside className="flex w-full max-w-md shrink-0 flex-col border-r border-(--color-border) bg-(--color-bg-elevated) lg:w-92">
        <div className="border-b border-(--color-border) px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Employee Management</p>
              <h1 className="text-lg font-semibold text-(--color-text)">Employees <span className="ml-1 text-xs font-normal text-(--color-text-muted)">{employeesData.length}</span></h1>
            </div>
            {canCreate && !isReadOnly && <Button type="button" onClick={() => { setCreatedEmployee(null); navigate('/employees/add'); }} className="flex items-center gap-1.5 "><Plus size={18} /></Button>}
          </div>
          <div className="mt-4"><InputField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" leftIcon={<Search size={16} />} /></div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading && <p className="py-10 text-center text-sm text-(--color-text-muted)">Loading employees...</p>}
          {isError && <Feedback type="error" title="Unable to load employees" message="Please refresh the page and try again." />}
          {!isLoading && !isError && employees.length === 0 && <p className="py-10 text-center text-sm text-(--color-text-muted)">No employees found.</p>}
          {!isLoading && !isError && employees.map((employee) => (
            <div
              key={employee.id}
              role="button"
              tabIndex={0}
              onClick={() => openEmployeeView(employee)}
              onKeyDown={(event) => event.key === 'Enter' && openEmployeeView(employee)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuEmployeeId(employee.id);
                setMenuPosition({ x: event.clientX, y: event.clientY });
              }}
              className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${String(id) === String(employee.id) ? 'border-(--color-accent) bg-(--color-accent-soft)' : 'border-transparent hover:border-(--color-border) hover:bg-(--color-accent-soft)'}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-sm font-semibold text-white">{initials(employee.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-(--color-text)">{employee.name}</span>
                <span className="mt-0.5 block truncate text-xs text-(--color-text-muted)">{employee.employee_code} · {employee.plant?.name}</span>
                <span className="mt-1 block truncate text-xs text-(--color-accent)">{employee.department?.name ?? employee.designation?.name}</span>
              </span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${employee.status ? 'bg-emerald-500' : 'bg-(--color-border-strong)'}`} />
              <div className="relative shrink-0">
                <button type="button" aria-label={`Actions for ${employee.name}`} onClick={(event) => { event.stopPropagation(); setMenuPosition(null); setMenuEmployeeId((current) => current === employee.id ? null : employee.id); }} className="rounded p-1 text-(--color-text-muted) hover:bg-(--color-border) hover:text-(--color-text)"><MoreVertical size={17} /></button>
                {menuEmployeeId === employee.id && <div data-employee-menu className={`${menuPosition ? 'fixed' : 'absolute right-0 top-8'} z-20 w-48 rounded-lg border border-(--color-border) bg-(--color-surface-strong) p-1 shadow-lg`} style={menuPosition ? { left: menuPosition.x, top: menuPosition.y } : undefined} onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => openEmployeeView(employee)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><IdCard size={18} /> Profile</button>
                  <button type="button" onClick={() => openEmployeeView(employee, 'attendance')} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><CalendarDays size={15} /> Attendance</button>
                  <button type="button" onClick={() => openEmployeeView(employee, 'salary')} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><WalletCards size={15} /> Salary</button>
                  {canEdit && !isReadOnly && <button type="button" onClick={() => { setMenuEmployeeId(null); navigate(`/employees/${employee.id}/edit`); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-(--color-accent-soft)"><Pencil size={15} /> Edit {employee.name}</button>}
                </div>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden bg-(--color-bg)">
        {(isAddRoute || isEditRoute) && <AddEditEmployee key={`edit-${id ?? 'new'}-${isEditRoute ? selectedEmployee?.id ?? '' : ''}`} employee={isEditRoute ? selectedEmployee : createdEmployee ?? undefined} plants={plants} departments={departments} designations={designations} shifts={shifts} charges={charges} documents={employeeDocuments} accounts={employeeAccounts} documentsLoading={employeeDocumentsLoading} accountsLoading={employeeAccountsLoading} errors={errors} saving={creating || updating} savingDocument={savingDocument} savingAccount={savingAccount} onClose={() => { setCreatedEmployee(null); navigate('/employees'); }} onSubmit={handleSave} onSaveDocument={handleSaveDocument} onDeleteDocument={handleDeleteDocument} onSaveAccount={handleSaveAccount} onDeleteAccount={handleDeleteAccount} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'profile' && <EmployeeProfile employeeId={selectedEmployee.id} embedded onClose={() => navigate('/employees')} />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'attendance' && <EmployeePlaceholder employee={selectedEmployee} type="attendance" />}
        {!isAddRoute && !isEditRoute && selectedEmployee && activeView === 'salary' && <EmployeePlaceholder employee={selectedEmployee} type="salary" />}
        {!isAddRoute && !isEditRoute && !selectedEmployee && <div className="flex h-full items-center justify-center p-8"><div className="max-w-sm text-center text-(--color-text-muted)"><UserRound size={28} className="mx-auto mb-4 text-(--color-accent)" /><h2 className="text-base font-semibold text-(--color-text)">Select an employee</h2><p className="mt-1 text-sm">Choose an employee from the list to view their profile.</p></div></div>}
      </main>
    </div>
  );
};

export default Employees;
