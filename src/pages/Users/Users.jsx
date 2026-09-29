import { useCallback, useMemo, useState } from 'react';
import { Plus, Search, User, Trash2, Pencil } from 'lucide-react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetEmployeesQuery,
} from '../../store/api';
import { useToast } from '../../contexts/ToastContext';
import usePermission from '../../hooks/usePermission';
import { useLocation } from 'react-router-dom';
import { getRouteConfig } from '../../constants/routes';
import SectionCard from '../../components/SectionCard';
import PageTable from '../../components/PageTable';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import RightModal from '../components/RightModal';
import Badge from '../../components/Badge';
import Switch from '../../components/Switch';
import ConfirmDelete from '../../components/ConfirmDelete';
import Button from '../../components/Button';
import { useRenderPerformance } from '../../utils/performance';
import { getApiErrorMessage } from '../../components/feedbackUtils';

const EMPTY_FORM = { name: '', username: '', email: '', password: '', role_id: '', employee_id: '', status: true };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_BADGES = { admin: 'blue', manager: 'gold', supervisor: 'aqua', employee: 'gray' };
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
const isSystemSuperAdmin = (user) => (
  String(user?.username ?? '').toLowerCase() === 'superadmin'
  || String(user?.email ?? '').toLowerCase() === 'superadmin@gmail.com'
);

const UserForm = ({ form, setForm, roles, employees, errors }) => {
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find((item) => String(item.id) === String(employeeId));
    setForm((current) => ({
      ...current,
      employee_id: employeeId,
      ...(employee ? {
        name: employee.name ?? '',
        username: employee.name ?? '',
        email: employee.email ?? '',
        password: current.id ? current.password : getDefaultPassword(employee.name),
      } : {}),
    }));
  };

  return (
    <>
      <SearchableSelect
        label="Employee"
        options={employees.map((employee) => ({
          value: employee.id,
          label: employee.name,
          searchText: `${employee.name ?? ''} ${employee.employee_code ?? ''} ${employee.designation?.name ?? ''}`,
          labelNode: (
            <span className="block min-w-0">
              <span className="block truncate font-medium">{employee.name}</span>
              <span className="block truncate text-xs text-(--color-text-muted)">
                {employee.employee_code || 'No employee ID'} · {employee.designation?.name || 'No designation'}
              </span>
            </span>
          ),
        }))}
        value={form.employee_id}
        onChange={handleEmployeeChange}
        placeholder="Select employee"
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
      <SearchableSelect
        label="Role"
        options={roles.map((role) => ({ value: role.id, label: role.name }))}
        value={form.role_id}
        onChange={(role_id) => setForm((current) => ({ ...current, role_id }))}
        placeholder="Select role"
        required
        error={errors.role_id}
      />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))} className="accent-primary-600 w-4 h-4" />
        <span className="text-sm dark:text-gray-300">Active account</span>
      </label>
    </>
  );
};

const Users = () => {
  const location = useLocation();
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isSuperAdmin, isReadOnly } = usePermission('/users');
  const pageTitle = getRouteConfig(location.pathname)?.name ?? 'Users';
  const { data: usersData, isLoading } = useGetUsersQuery();
  const { data: rolesData } = useGetRolesQuery();
  const { data: employeesData } = useGetEmployeesQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = useMemo(() => usersData?.data ?? usersData ?? [], [usersData]);
  const roles = useMemo(
    () => (rolesData?.data ?? rolesData ?? []).filter((role) => role.name?.toLowerCase().replace(/[\s_-]+/g, '') !== 'superadmin'),
    [rolesData],
  );
  const employees = useMemo(() => employeesData?.data ?? employeesData ?? [], [employeesData]);
  useRenderPerformance('getUsers', usersData);
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
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (isSystemSuperAdmin(user)) return false;
      const matchesSearch = !query || [user.name, user.username, user.email].some((value) => String(value ?? '').toLowerCase().includes(query));
      const matchesRole = !filterRole || String(user.role?.id ?? user.role_id) === String(filterRole);
      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

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

  const handleSave = async () => {
    const { id, name, username, email, password, role_id, employee_id, status } = modal.form;
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (!username.trim()) nextErrors.username = 'Username is required.';
    if (email && !EMAIL_REGEX.test(email.trim())) nextErrors.email = 'Please enter a valid email address.';
    if (!employee_id) nextErrors.employee_id = 'Employee is required.';
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
  };

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
    } catch (error) {
      toast(error?.data?.message ?? 'Unable to update user status.', 'error');
    }
  }, [canEdit, isReadOnly, isSuperAdmin, toast, updateUser]);

  const handleDelete = async () => {
    if (!canDelete || isReadOnly) {
      toast('You do not have permission to delete users.', 'error');
      return;
    }
    try {
      await deleteUser(deleteTarget.id).unwrap();
      toast('User deleted.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(error?.data?.message ?? 'Unable to delete user.', 'error');
    }
  };

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
        // sectionClass="max-w-7xl mx-auto"
        action={canCreate && !isReadOnly && (
          <Button type="button" onClick={openAdd} className="flex items-center gap-1.5">
            <Plus size={15} /> Add User
          </Button>
        )}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <InputField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, username, or email" leftIcon={<Search size={16} />} />
          <SearchableSelect options={roleOptions} value={filterRole} onChange={setFilterRole} placeholder="Filter by role" className="min-w-48" />
        </div>
        <PageTable columns={columns} rows={filteredUsers} total={filteredUsers.length} label="users" isLoading={isLoading} />
      </SectionCard>

      <RightModal isOpen={modal.open} onClose={closeModal} onSubmit={handleSave} title={modal.form.id ? `Edit — ${modal.form.name}` : 'Add User'} saving={creating || updating}>
        <UserForm form={modal.form} setForm={updateForm} roles={roles} employees={employees} errors={errors} />
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
