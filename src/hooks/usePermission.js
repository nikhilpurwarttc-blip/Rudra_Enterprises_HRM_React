import { useSelector } from 'react-redux';
import { selectPermissions, selectRole, selectIsReadOnly } from '../store/authSlice';
import { ROUTES, getRouteConfig } from '../constants/routes';

export default function usePermission(routePath) {
  const permissions = useSelector(selectPermissions); // { module: [actions] } | null
  const role        = useSelector(selectRole);
  const isReadOnly  = useSelector(selectIsReadOnly);

  const roleName       = (typeof role === 'string' ? role : role?.name ?? '').toLowerCase().trim();
  const cleanRole      = roleName.replace(/[\s_-]+/g, '');
  const isSuperAdmin   = cleanRole === 'superadmin';
  const isAdmin        = ['admin', 'superadmin', 'administrator'].includes(cleanRole);
  const hasPermissions = permissions != null && typeof permissions === 'object' && Object.keys(permissions).length > 0;

  // Only Super Admin has unrestricted bypass. Admin and all other roles strictly respect assigned permissions.
  const can = (permKey, action = 'view') => {
    // if (isSuperAdmin) return true;
    if (!permissions || typeof permissions !== 'object') return false;
    const actions = permissions[permKey];
    return Array.isArray(actions) && actions.includes(action);
  };

  if (routePath) {
    const route         = getRouteConfig(routePath) || ROUTES.find((r) => r.path === routePath);
    const permKey       = route?.permissionKey ?? routePath;
    const defaultAction = route?.permissionAction ?? 'view';

    return {
      canView:   can(permKey, 'view'),
      canCreate: !isReadOnly && can(permKey, 'create'),
      canEdit:   !isReadOnly && can(permKey, 'edit'),
      canDelete: !isReadOnly && can(permKey, 'delete'),
      canAccess: can(permKey, defaultAction),
      can:       (action) => !isReadOnly ? can(permKey, action) : action === 'view' && can(permKey, action),
      isAdmin,
      isSuperAdmin,
      isReadOnly,
      roleName,
    };
  }

  return { can, isAdmin, isSuperAdmin, isReadOnly, hasPermissions, roleName };
}
