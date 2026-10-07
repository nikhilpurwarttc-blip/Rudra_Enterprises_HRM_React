import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, Plus, Search, User, Trash2, Pencil } from 'lucide-react';
import {
  useLazyGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useLazyGetEmployeesQuery,
  useLazyGetRolesQuery,
} from '../../store/api';
import { useToast } from '../../contexts/ToastContext';
import usePermission from '../../hooks/usePermission';
import { useLocation } from 'react-router-dom';
import { getRouteConfig } from '../../constants/routes';
import SectionCard from '../../components/SectionCard';
import PageTable from '../../components/PageTable';
import InputField from '../../components/InputField';
import AsyncSearchableSelect from '../../components/AsyncSearchableSelect';
import SearchableSelect from '../../components/SearchableSelect';
import RightModal from '../components/RightModal';
import Badge from '../../components/Badge';
import Switch from '../../components/Switch';
import ConfirmDelete from '../../components/ConfirmDelete';
import Button from '../../components/Button';
import ChipSwitcher from '../../components/ChipSwitcher';
import { useRenderPerformance } from '../../utils/performance';
import { getApiErrorMessage } from '../../components/feedbackUtils';

const EMPTY_FORM = { name: '', username: '', email: '', password: '', role_id: '', employee_id: '', selected_role: null, selected_employee: null, status: true };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_BADGES = { admin: 'blue', manager: 'gold', supervisor: 'aqua', employee: 'gray' };
const STATUS_OPTIONS = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
];

const FIELD_LABELS = {
  employee_id: 'Employee',
  name: 'Full name',
  username: 'Username',
  email: 'Email',
  password: 'Password',
  role_id: 'Role',
};
const getDefaultPassword = (name) => {
  const firstName = String(name ?? '').trim().split(/\s+/)[0];
  return firstName ? `${firstName}@123` : '';
};
const getEmployeeOptionValue = (employee) => employee.id;
const getEmployeeOptionLabel = (employee) => `${employee.name ?? ''} · ${employee.employee_code || 'No employee ID'} · ${employee.designation?.name || 'No designation'}`;
const getRoleOptionValue = (role) => role.id;
const getRoleOptionLabel = (role) => role.name;
// Identify system superadmin by username only — never hardcode email as a credential check
const isSystemSuperAdmin = (user) => String(user?.username ?? '').toLowerCase() === 'superadmin';

const UserForm = ({ form, setForm, roles, employees, loadEmployees, loadRoles, errors }) => {
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const handleEmployeeChange = (employeeId, employee) => {
    setForm((current) => ({
      ...current,
      employee_id: employeeId,
      selected_employee: employee ?? null,
      ...(employee ? {
        name: employee.name ?? '',
        username: employee.name ?? '',
        email: employee.email ?? '',
        password: current.id ? current.password : getDefaultPassword(),
      } : {}),
    }));
  };

  return (
    <>
      <AsyncSearchableSelect
        label="Employee"
        value={form.employee_id}
        onChange={handleEmployeeChange}
        loadOptions={loadEmployees}
        selectedOptions={[
          ...employees.filter((employee) => String(employee.id) === String(form.employee_id)),
          ...(form.selected_employee ? [form.selected_employee] : []),
        ]}
        getOptionValue={getEmployeeOptionValue}
        getOptionLabel={getEmployeeOptionLabel}
        placeholder="Select employee"
        perPage={15}
        debounceMs={250}
        error={errors.employee_id}
      />
      <InputField label="Full Name" value={form.name} onChange={set('name')} required error={errors.name} />
      <InputField label="Username" value={form.username} onChange={set('username')} required error={errors.username} />
      <InputField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
      <InputField
        label={form.id ? 'New Password (leave blank to keep)' : 'Password'}
        type="password"
        value={form.password}
        onChange={set('password')}
        required={!form.id}
        error={errors.password}
      />
      <AsyncSearchableSelect
        label="Role"
        value={form.role_id}
        onChange={(role_id, role) => setForm((current) => ({ ...current, role_id, selected_role: role ?? null }))}
        loadOptions={loadRoles}
        selectedOptions={[
          ...roles.filter((role) => String(role.id) === String(form.role_id)),
          ...(form.selected_role ? [form.selected_role] : []),
        ]}
        getOptionValue={getRoleOptionValue}
        getOptionLabel={getRoleOptionLabel}
        placeholder="Select role"
        perPage={100}
        debounceMs={250}
        required
        error={errors.role_id}
      />
      <ChipSwitcher
        label="Account Status"
        options={STATUS_OPTIONS}
        value={form.status}
        onChange={(val) => setForm((current) => ({ ...current, status: Boolean(val) }))}
      />
    </>
  );
};

const Users = () => {
  const location = useLocation();
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isSuperAdmin, isReadOnly } = usePermission('/users');
  const pageTitle = getRouteConfig(location.pathname)?.name ?? 'Users';
  const [fetchUsers, { isLoading, isFetching }] = useLazyGetUsersQuery();
  const { data: rolesData } = useGetRolesQuery({ per_page: 100 });
  const [fetchEmployeeOptions] = useLazyGetEmployeesQuery();
  const [fetchRoleOptions] = useLazyGetRolesQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [loadedUsers, setLoadedUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const requestVersion = useRef(0);
  const loadingUsers = useRef(false);
  const searchTimeout = useRef(null);
  const users = useMemo(() => loadedUsers.filter((user) => !isSystemSuperAdmin(user)), [loadedUsers]);
  const roles = useMemo(
    () => (rolesData?.data ?? rolesData ?? []).filter((role) => role.name?.toLowerCase().replace(/[\s_-]+/g, '') !== 'superadmin'),
    [rolesData],
  );
  // Stable empty array — avoids new reference on every render causing child re-renders
  const employees = useMemo(() => [], []);
  useRenderPerformance('getUsers', loadedUsers);
  useRenderPerformance('getRoles', rolesData);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modal, setModal] = useState({ open: false, form: { ...EMPTY_FORM } });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});

  const roleOptions = useMemo(
    () => [{ value: '', label: 'All Roles' }, ...roles.map((role) => ({ value: role.id, label: role.name }))],
    [roles],
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = !filterRole || String(user.role?.id ?? user.role_id) === String(filterRole);
      return matchesRole;
    });
  }, [users, filterRole]);

  const loadUserPage = useCallback(async (page, query, replace = false, version = requestVersion.current) => {
    if (loadingUsers.current) return;

    loadingUsers.current = true;
    try {
      const response = await fetchUsers({ page, per_page: 15, search: query }).unwrap();
      if (version !== requestVersion.current) return;

      const pageUsers = response?.data ?? response ?? [];
      setLoadedUsers((current) => {
        if (replace) return pageUsers;

        const existingIds = new Set(current.map((user) => user.id));
        return [...current, ...pageUsers.filter((user) => !existingIds.has(user.id))];
      });
      setTotalUsers(Number(response?.meta?.total ?? pageUsers.length));
      setCurrentPage(Number(response?.meta?.current_page ?? page));
      setLastPage(Number(response?.meta?.last_page ?? page));
      setHasLoadError(false);
    } catch {
      if (version === requestVersion.current) setHasLoadError(true);
    } finally {
      if (version === requestVersion.current) loadingUsers.current = false;
    }
  }, [fetchUsers]);

  const refreshUsers = useCallback(() => {
    const version = ++requestVersion.current;
    loadingUsers.current = false;
    setLoadedUsers([]);
    setTotalUsers(0);
    setCurrentPage(0);
    setLastPage(1);
    setHasLoadError(false);
    return loadUserPage(1, debouncedSearch, true, version);
  }, [debouncedSearch, loadUserPage]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadUserPage(1, '', true), 0);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearTimeout(searchTimeout.current);
      requestVersion.current += 1;
      loadingUsers.current = false;
    };
  }, [loadUserPage]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    const query = value.trim();
    const version = ++requestVersion.current;
    loadingUsers.current = false;
    setSearch(value);
    setLoadedUsers([]);
    setTotalUsers(0);
    setCurrentPage(0);
    setLastPage(1);
    setHasLoadError(false);
    window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(() => {
      setDebouncedSearch(query);
      loadUserPage(1, query, true, version);
    }, 250);
  };

  const handleUserTableScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (
      debouncedSearch === search.trim()
      && currentPage < lastPage
      && !loadingUsers.current
      && scrollHeight - scrollTop - clientHeight < 120
    ) {
      loadUserPage(currentPage + 1, debouncedSearch);
    }
  };

  const isSearchPending = debouncedSearch !== search.trim();
  const isUserLoading = isSearchPending || isLoading || isFetching;

  const openAdd = useCallback(() => {
    setErrors({});
    setModal({ open: true, form: { ...EMPTY_FORM } });
  }, []);

  const openEdit = useCallback((user) => {
    setErrors({});
    setModal({
      open: true,
      form: {
        id: user.id,
        name: user.name ?? '',
        username: user.username ?? '',
        email: user.email ?? '',
        password: '',
        role_id: user.role?.id ?? user.role_id ?? '',
        employee_id: user.employee_id ?? user.employee?.id ?? '',
        selected_role: user.role ?? null,
        selected_employee: user.employee ?? null,
        status: Boolean(user.status),
      },
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false, form: { ...EMPTY_FORM } });
    setErrors({});
  }, []);

  const updateForm = useCallback((update) => {
    setModal((current) => ({ ...current, form: typeof update === 'function' ? update(current.form) : update }));
  }, []);

  const loadEmployeeOptions = useCallback(({ search: query, page, perPage }) => (
    fetchEmployeeOptions({ search: query, page, per_page: perPage }).unwrap()
  ), [fetchEmployeeOptions]);
  const loadRoleOptions = useCallback(({ search: query, page, perPage }) => (
    fetchRoleOptions({ search: query, page, per_page: perPage }).unwrap()
  ), [fetchRoleOptions]);

  const handleSave = useCallback(async () => {
    const { id, name, username, email, password, role_id, employee_id, status } = modal.form;
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (!username.trim()) nextErrors.username = 'Username is required.';
    if (email && !EMAIL_REGEX.test(email.trim())) nextErrors.email = 'Please enter a valid email address.';
    // if (!employee_id) nextErrors.employee_id = 'Employee is required.';
    if (!role_id) nextErrors.role_id = 'Role is required.';
    if (!id && !password) nextErrors.password = 'Password is required for new users.';
    if (password && password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstError = Object.entries(nextErrors)[0];
      toast(`${FIELD_LABELS[firstError[0]] ?? 'Form'}: ${firstError[1]}`, 'error');
      return;
    }

    const payload = { name: name.trim(), username: username.trim().toLowerCase(), email: email.trim().toLowerCase() || null, role_id, employee_id: employee_id || null, status };
    if (password) payload.password = password;
    try {
      if (id) {
        if (!canEdit || isReadOnly) {
          toast('You do not have permission to edit users.', 'error');
          return;
        }
        await updateUser({ id, ...payload }).unwrap();
        toast('User updated successfully.', 'success');
      } else {
        if (!canCreate || isReadOnly) {
          toast('You do not have permission to create users.', 'error');
          return;
        }
        await createUser({ ...payload, password }).unwrap();
        toast('User created successfully.', 'success');
      }
      await refreshUsers();
      closeModal();
    } catch (error) {
      const serverErrors = error?.data?.errors ?? {};
      const inlineErrors = Object.fromEntries(
        Object.entries(serverErrors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages]),
      );
      if (Object.keys(inlineErrors).length) setErrors(inlineErrors);
      const firstError = Object.entries(inlineErrors)[0];
      const message = firstError
        ? `${FIELD_LABELS[firstError[0]] ?? 'Form'}: ${firstError[1]}`
        : getApiErrorMessage(error, 'Unable to save user.');
      toast(message, 'error');
    }
  }, [canCreate, canEdit, isReadOnly, modal.form, refreshUsers, closeModal, createUser, updateUser, toast]);

  const handleStatusChange = useCallback(async (user) => {
    if (!canEdit || isReadOnly) return;
    const targetRoleName = (user.role?.name ?? '').toLowerCase().replace(/[\s_-]+/g, '');
    const isTargetAdmin = ['superadmin', 'admin', 'administrator'].includes(targetRoleName);
    if (!isSuperAdmin && isTargetAdmin) {
      toast('You cannot change the status of administrator accounts.', 'error');
      return;
    }
    try {
      await updateUser({ id: user.id, status: !user.status }).unwrap();
      await refreshUsers();
    } catch (error) {
      toast(error?.data?.message ?? 'Unable to update user status.', 'error');
    }
  }, [canEdit, isReadOnly, isSuperAdmin, refreshUsers, toast, updateUser]);

  const handleDelete = useCallback(async () => {
    if (!canDelete || isReadOnly) {
      toast('You do not have permission to delete users.', 'error');
      return;
    }
    try {
      await deleteUser(deleteTarget?.id).unwrap();
      await refreshUsers();
      toast('User deleted.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(error?.data?.message ?? 'Unable to delete user.', 'error');
    }
  }, [canDelete, isReadOnly, deleteTarget, deleteUser, refreshUsers, toast]);

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (user) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white"><User size={13} /></span>
          <span className="font-medium text-(--color-text)">{user.name}</span>
        </div>
      ),
    },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email', render: (user) => user.email || '—' },
    {
      key: 'role',
      label: 'Role',
      render: (user) => {
        const roleName = user.role?.name ?? '—';
        return <Badge color={ROLE_BADGES[roleName.toLowerCase()] ?? 'gray'}>{roleName}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Active',
      render: (user) => {
        const targetRoleName = (user.role?.name ?? '').toLowerCase().replace(/[\s_-]+/g, '');
        const isTargetAdmin = ['superadmin', 'admin', 'administrator'].includes(targetRoleName);
        const isTargetProtected = !isSuperAdmin && isTargetAdmin;
        const canToggle = canEdit && !isReadOnly && !isTargetProtected;

        return (
          <Switch
            checked={Boolean(user.status)}
            disabled={!canToggle}
            onClick={() => canToggle && handleStatusChange(user)}
            ariaLabel={user.status ? 'Active' : 'Inactive'}
          />
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (user) => {
        const targetRoleName = (user.role?.name ?? '').toLowerCase().replace(/[\s_-]+/g, '');
        const isTargetAdmin = ['superadmin', 'admin', 'administrator'].includes(targetRoleName);
        const isTargetProtected = !isSuperAdmin && isTargetAdmin;

        const canEditUser = canEdit && !isReadOnly && !isTargetProtected;
        const canDeleteUser = canDelete && !isReadOnly && !isTargetProtected;

        return (
          <div className="flex items-center gap-2">
            {canEditUser && (
              <button
                type="button"
                variant="ghost"
                onClick={() => openEdit(user)}
                className="min-h-0 border-0 bg-transparent p-0 px-1 text-sm font-medium text-[var(--color-accent)] shadow-none hover:bg-transparent"
              >
                <Pencil size={16} />
              </button>
            )}
            {canDeleteUser && (
              <button
                type="button"
                variant="ghost"
                onClick={() => setDeleteTarget(user)}
                className="min-h-0 border-0 bg-transparent p-0 px-1 text-sm font-medium text-red-500 shadow-none hover:bg-transparent"
              >
                <Trash2 size={16} />
              </button>
            )}
            {!canEditUser && !canDeleteUser && (
              <span className="text-xs text-[var(--color-text-muted)]">—</span>
            )}
          </div>
        );
      },
    },
  ], [canDelete, canEdit, isSuperAdmin, isReadOnly, openEdit, handleStatusChange]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SectionCard
        title={pageTitle}
        action={canCreate && !isReadOnly && (
          <Button type="button" onClick={openAdd} className="flex items-center gap-1.5">
            <Plus size={15} /> Add User
          </Button>
        )}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <InputField value={search} onChange={handleSearchChange} placeholder="Search name, username, or email" leftIcon={<Search size={16} />} />
          <SearchableSelect options={roleOptions} value={filterRole} onChange={setFilterRole} placeholder="Filter by role" className="min-w-48" />
          {isUserLoading && <span className="flex items-center gap-1.5 px-2 text-xs text-(--color-text-muted)" role="status"><LoaderCircle size={14} className="animate-spin" />{loadedUsers.length ? `Loading users (${loadedUsers.length}${totalUsers ? ` of ${totalUsers}` : ''})` : 'Loading users...'}</span>}
        </div>
        <PageTable
          columns={columns}
          rows={filteredUsers}
          total={totalUsers}
          label="users"
          isLoading={filteredUsers.length === 0 && isUserLoading}
          emptyText={hasLoadError ? 'Unable to load users' : 'No users found'}
          onScroll={handleUserTableScroll}
        />
        {hasLoadError && filteredUsers.length > 0 && <p className="text-sm text-red-500" role="status">Unable to load the next page of users.</p>}
      </SectionCard>

      <RightModal isOpen={modal.open} onClose={closeModal} onSubmit={handleSave} title={modal.form.id ? `Edit — ${modal.form.name}` : 'Add User'} saving={creating || updating}>
        <UserForm form={modal.form} setForm={updateForm} roles={roles} employees={employees} loadEmployees={loadEmployeeOptions} loadRoles={loadRoleOptions} errors={errors} />
      </RightModal>

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete User"
        message={`Delete user "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Users;