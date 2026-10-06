import { useEffect, useState } from 'react';
import { Plus, Trash2, Shield, Users, ChevronRight, ChevronDown, Save, Zap } from 'lucide-react';
import {
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useSeedPermissionsMutation,
  useGetPlantsQuery,
} from '../../store/api';
import { useToast } from '../../contexts/ToastContext';
import InputField from '../../components/InputField';
import SearchableSelect from '../../components/SearchableSelect';
import Button from '../../components/Button';
import Switch from '../../components/Switch';
import ConfirmDelete from '../../components/ConfirmDelete';
import { PERMISSION_GROUPS, ROUTE_PERMISSIONS } from '../../constants/routes';
import usePermission from '../../hooks/usePermission';
import { useRenderPerformance } from '../../utils/performance';

const STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'shutdown', 'import', 'export'];
const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  shutdown: 'Shutdown',
  import: 'Import',
  export: 'Export',
};

// ── helpers ───────────────────────────────────────────────────────────────────

const unwrapCollection = (value) => {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.data) ? value.data : [];
};

const isSystemSuperAdminRole = (role) => (
  role?.name?.toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin'
);

// Convert role.permissions array [{ id, module, action }] → { module: [actions] }
const roleToMap = (role) => {
  const map = {};
  unwrapCollection(role?.permissions).forEach(({ module, action }) => {
    if (!map[module]) map[module] = [];
    if (!map[module].includes(action)) map[module].push(action);
  });
  return map;
};

// Convert { module: [actions] } + allPermissions → permission ID array for backend
const mapToIds = (permMap, allPermissions) => {
  const availablePermissions = unwrapCollection(allPermissions);
  if (!availablePermissions.length) return [];
  const ids = [];
  availablePermissions.forEach(({ id, module, action }) => {
    if (permMap[module]?.includes(action) && Number(id) > 0) ids.push(Number(id));
  });
  return ids;
};

// Toggle all actions for a group
const toggleGroup = (map, routes) => {
  const allFull = routes.every(r => {
    const actions = r.actions ?? [];
    return actions.length > 0 && actions.every(a => map[r.key]?.includes(a));
  });
  const next = { ...map };
  routes.forEach(r => { next[r.key] = allFull ? [] : [...(r.actions ?? [])]; });
  return next;
};

// Toggle all actions for a single row
const toggleRow = (map, key, actions = []) => {
  const allFull = actions.length > 0 && actions.every(a => map[key]?.includes(a));
  return { ...map, [key]: allFull ? [] : [...actions] };
};

// Toggle a single action for a row
const toggleCell = (map, key, action, checked) => {
  const curr = map[key] ?? [];
  const next = checked ? [...curr, action] : curr.filter(a => a !== action);
  return { ...map, [key]: next };
};

// ── PermissionMatrix ──────────────────────────────────────────────────────────

const PermissionMatrix = ({ permissions, onChange, allPermissions, readOnly = false }) => {
  const [collapsed, setCollapsed] = useState(
    Object.fromEntries(PERMISSION_GROUPS.map(({ group }) => [group, false]))
  );

  return (
    <div className="space-y-2">
      {PERMISSION_GROUPS.map(({ group, routes }) => {
        const isOpen  = !collapsed[group];
        const routesWithActions = routes.map(route => {
          const available = new Set(
            allPermissions
              .filter(permission => permission.module === route.key)
              .map(permission => permission.action),
          );
          const actions = [
            ...STANDARD_ACTIONS.filter(action => available.has(action)),
            ...[...available].filter(action => !STANDARD_ACTIONS.includes(action)).sort(),
          ];
          return { ...route, actions };
        });
        const availableGroupActions = new Set(routesWithActions.flatMap(route => route.actions));
        const groupActions = [
          ...STANDARD_ACTIONS.filter(action => availableGroupActions.has(action)),
          ...[...availableGroupActions].filter(action => !STANDARD_ACTIONS.includes(action)).sort(),
        ];
        const allFull = routesWithActions.every(route => (
          route.actions.length > 0 && route.actions.every(action => permissions[route.key]?.includes(action))
        ));
        const anySet  = routesWithActions.some(route => route.actions.some(action => permissions[route.key]?.includes(action)));

        return (
          <div key={group} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
            {/* Group header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-accent-soft)] select-none">
              <button type="button" onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
                className="flex items-center gap-2 flex-1 text-left">
                <ChevronDown size={14}
                  className={`text-[var(--color-text-muted)] transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                <span className="text-sm font-semibold text-[var(--color-text)]">{group}</span>
                <span className="text-xs text-[var(--color-text-muted)]">({routes.length})</span>
              </button>
              {!readOnly ? (
                <button type="button" onClick={() => onChange(toggleGroup(permissions, routesWithActions))}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    allFull
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : anySet
                        ? 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}>
                  {allFull ? 'All on' : anySet ? 'Partial' : 'All off'}
                </button>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  allFull
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : anySet
                      ? 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}>
                  {allFull ? 'Full Access' : anySet ? 'Partial' : 'No Access'}
                </span>
              )}
            </div>

            {/* Routes table */}
            {isOpen && (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="sticky left-0 z-10 bg-(--color-bg-elevated) text-left py-1.5 pl-4 pr-2 text-xs font-medium text-[var(--color-text-muted)] min-w-48">Page</th>
                    {groupActions.map(a => (
                          <th key={a} className="text-center py-1.5 px-3 text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">{ACTION_LABELS[a] ?? a}</th>
                    ))}
                    {!readOnly && (
                      <th className="text-center py-1.5 px-3 text-xs font-medium text-[var(--color-text-muted)]">All</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {routesWithActions.map(({ key, label, actions }) => (
                    <tr key={key} className="border-t border-[var(--color-border)]/50 hover:bg-[var(--color-accent-soft)]/40">
                      <td className="sticky left-0 z-10 bg-(--color-surface) py-2 pl-4 pr-2 text-sm text-[var(--color-text)]">{label}</td>
                      {groupActions.map(action => (
                        <td key={action} className="text-center py-2 px-3">
                          <input
                            type="checkbox"
                            disabled={readOnly || !actions.includes(action)}
                            checked={actions.includes(action) && (permissions[key]?.includes(action) ?? false)}
                            onChange={e => !readOnly && onChange(toggleCell(permissions, key, action, e.target.checked))}
                            className={`w-4 h-4 accent-[var(--color-accent)] ${readOnly || !actions.includes(action) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                          />
                        </td>
                      ))}
                      {!readOnly && (
                        <td className="text-center py-2 px-3">
                          {actions.length > 0 && (
                            <input
                              type="checkbox"
                              checked={actions.every(a => permissions[key]?.includes(a))}
                              onChange={() => onChange(toggleRow(permissions, key, actions))}
                              className="w-4 h-4 cursor-pointer accent-[var(--color-accent)]"
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── RoleCard ──────────────────────────────────────────────────────────────────

const RoleCard = ({ role, selected, onClick, onDelete, canDelete = false }) => {
  const isProtectedRole = ['superadmin', 'admin', 'administrator'].includes(
    (role?.name ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  );

  return (
    <div onClick={onClick}
      className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-accent-soft)]/50'
      }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          selected ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
        }`}>
          <Shield size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{role.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {role.description || `${role.users_count ?? 0} user${role.users_count !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          role.status
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {role.status ? 'Active' : 'Off'}
        </span>
        {canDelete && !isProtectedRole && (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-opacity"
            title="Delete">
            <Trash2 size={12} />
          </button>
        )}
        <ChevronRight size={14} className={`text-[var(--color-text-muted)] transition-transform ${selected ? 'rotate-90 text-[var(--color-accent)]' : ''}`} />
      </div>
    </div>
  );
};

// ── RoleEditor ────────────────────────────────────────────────────────────────

const RoleEditor = ({ role, plants, plantsLoading, plantsError, allPermissions, permissionsLoading, onSave, onCancel, isSaving, isCreate, readOnly = false }) => {
  const [name,        setName]        = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [status,      setStatus]      = useState(role != null ? Boolean(role.status) : true);
  const [permissions, setPermissions] = useState(() => roleToMap(role));
  const [plantIds, setPlantIds] = useState(() => (role?.plant_ids ?? []).map(Number));
  const [nameError,   setNameError]   = useState('');

  const handleSave = () => {
    if (readOnly) return;
    if (!name.trim()) { setNameError('Role name is required.'); return; }
    const permissionIds = mapToIds(permissions, allPermissions);
    onSave({ name: name.trim(), description, status, permissions: permissionIds, plant_ids: plantIds });
  };

  // Count selected permissions
  const selectedCount = Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0);

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 space-y-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {isCreate ? 'New Role' : 'Edit Role'}
          </p>
          {readOnly && (
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              View Only
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="Role Name" value={name}
            disabled={readOnly}
            onChange={(e) => { setName(e.target.value); setNameError(''); }}
            error={nameError} required />
        <SearchableSelect
          label="Plants this role can access"
          options={plants.map((plant) => ({
            value: plant.id,
            label: `${plant.plant_code ? `${plant.plant_code} · ` : ''}${plant.name}`,
            searchText: `${plant.plant_code ?? ''} ${plant.name ?? ''} ${plant.address ?? ''}`,
          }))}
          value={plantIds}
          onChange={setPlantIds}
          placeholder="Select one or more plants"
          multiSelect
          isLoading={plantsLoading}
          disabled={readOnly || plantsError}
        />
          <InputField label="Description" value={description}
            disabled={readOnly}
            onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={status} disabled={readOnly} onClick={() => !readOnly && setStatus(v => !v)} ariaLabel="Active" />
            <span className="text-sm text-[var(--color-text-muted)]">{status ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              {selectedCount} permission{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
            {!readOnly && (
              <Button type="button" onClick={handleSave} disabled={isSaving || permissionsLoading}>
                {isSaving
                  ? 'Saving…'
                  : permissionsLoading
                    ? 'Loading permissions…'
                  : <span className="flex items-center gap-1.5"><Save size={13} />{isCreate ? 'Create Role' : 'Save Changes'}</span>
                }
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Matrix */}
      {permissionsLoading ? (
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          Loading permissions…
        </div>
      ) : allPermissions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          No permissions seeded yet — use the Seed button on the left.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <PermissionMatrix permissions={permissions} onChange={setPermissions} allPermissions={allPermissions} readOnly={readOnly} />
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const Roles = () => {
  const toast = useToast();
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('/roles');
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();
  const { data: permsData, isLoading: permissionsLoading, isError: permissionsError } = useGetPermissionsQuery();
  const { data: plantsData, isLoading: plantsLoading, isError: plantsError } = useGetPlantsQuery();
  useRenderPerformance('getRoles', rolesData);
  useRenderPerformance('getPermissions', permsData);
  const [createRole, { isLoading: creating }]        = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }]        = useUpdateRoleMutation();
  const [deleteRole]                                 = useDeleteRoleMutation();
  const [seedPermissions, { isLoading: seeding }]    = useSeedPermissionsMutation();

  const roles          = unwrapCollection(rolesData).filter((role) => !isSystemSuperAdminRole(role));
  const allPermissions = unwrapCollection(permsData);
  const plants = unwrapCollection(plantsData);

  const [selectedRole, setSelectedRole] = useState(null);
  const [isCreating,   setIsCreating]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const liveRole   = roles.find(r => r.id === selectedRole?.id) ?? null;
  const showEditor = isCreating || liveRole != null;

  const handleSave = async ({ name, description, status, permissions, plant_ids }) => {
    try {
      if (isCreating) {
        const res = await createRole({ name, description, status, permissions, plant_ids }).unwrap();
        toast('Role created.', 'success');
        setSelectedRole(res?.data ?? res);
        setIsCreating(false);
      } else {
        await updateRole({ id: liveRole.id, name, description, status, permissions, plant_ids }).unwrap();
        toast('Role saved.', 'success');
      }
    } catch (e) {
      const msg = e?.data?.message
        ?? Object.values(e?.data?.errors ?? {}).flat()[0]
        ?? 'Failed to save role.';
      toast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRole(deleteTarget.id).unwrap();
      toast('Role deleted.', 'success');
      if (selectedRole?.id === deleteTarget.id) { setSelectedRole(null); setIsCreating(false); }
      setDeleteTarget(null);
    } catch (e) {
      toast(e?.data?.message ?? 'Failed to delete role.', 'error');
    }
  };

  const handleSeed = async () => {
    try {
      const res = await seedPermissions().unwrap();
      toast(res.message, 'success');
    } catch (e) {
      toast(e?.data?.message ?? 'Failed to seed permissions.', 'error');
    }
  };

  const canSeed = canCreate && !isReadOnly && !permissionsLoading;

  useEffect(() => {
    if (!canSeed) return;
    seedPermissions({ modules: [...new Set(ROUTE_PERMISSIONS.map(route => route.permissionKey))] });
  }, [canSeed, seedPermissions]);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-[var(--color-accent)]" />
            <span className="text-sm font-semibold text-[var(--color-text)]">Roles</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
              {roles.length}
            </span>
          </div>
          {canCreate && !isReadOnly && (
            <Button
              type="button"
              onClick={() => { setIsCreating(true); setSelectedRole(null); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
            >
              <Plus size={12} /> New
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {rolesLoading ? (
            <p className="text-center py-10 text-sm text-[var(--color-text-muted)]">Loading…</p>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-[var(--color-text-muted)]">
              <Users size={28} className="opacity-30" />
              <p className="text-sm">No roles yet</p>
            </div>
          ) : roles.map(role => (
            <RoleCard key={role.id} role={role}
              canDelete={canDelete && !isReadOnly}
              selected={!isCreating && liveRole?.id === role.id}
              onClick={() => { setSelectedRole(role); setIsCreating(false); }}
              onDelete={() => setDeleteTarget(role)} />
          ))}
        </div>

        {permissionsError && canCreate && !isReadOnly && (
          <div className="px-3 py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-danger)]">Unable to load permissions.</p>
          </div>
        )}
        {allPermissions.length === 0 && canSeed && (
          <div className="px-3 py-3 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSeed}
              disabled={seeding}
              className="w-full justify-center gap-2 px-3 py-2 text-xs"
            >
              <Zap size={13} /> {seeding ? 'Seeding…' : 'Seed Permissions'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5">
        {showEditor ? (
          <RoleEditor
            key={isCreating ? 'new' : liveRole?.id}
            role={isCreating ? null : liveRole}
            plants={plants}
            allPermissions={allPermissions}
            permissionsLoading={permissionsLoading || plantsLoading || seeding}
            plantsLoading={plantsLoading}
            plantsError={plantsError}
            onSave={handleSave}
            onCancel={() => { setIsCreating(false); setSelectedRole(null); }}
            isSaving={creating || updating}
            isCreate={isCreating}
            readOnly={isCreating ? (!canCreate || isReadOnly) : (!canEdit || isReadOnly)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)]">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center">
              <Shield size={28} className="text-[var(--color-accent)] opacity-60" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text)]">Select a role to manage permissions</p>
            <p className="text-xs text-center max-w-xs">
              Pick a role from the left or create a new one. Set name, description, status and permissions — all saved together.
            </p>
            {allPermissions.length === 0 && canSeed && (
              <Button type="button" onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-4 py-2 text-sm">
                <Zap size={14} /> {seeding ? 'Seeding…' : 'Seed Permissions First'}
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmDelete
        isOpen={Boolean(deleteTarget)}
        title="Delete Role"
        message={`Delete "${deleteTarget?.name}"?${
          deleteTarget?.users_count > 0
            ? ` ⚠️ ${deleteTarget.users_count} user(s) are assigned this role.`
            : ' This cannot be undone.'
        }`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Roles;
