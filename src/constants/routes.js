export const ROUTES = [
  // Dashboard
  {
    key: 'dashboard',
    path: '/',
    name: 'Dashboard',
    breadcrumbs: ['Dashboard'],
    keywords: ['home', 'dashboard', 'main', 'overview'],
    permission: true,
    permissionKey: 'dashboard',
    permissionAction: 'view',
    group: 'General',
  },

  // Master Setup
  {
    key: 'plants',
    path: '/plants',
    name: 'Plant Management',
    breadcrumbs: ['Master Settings', 'Plants'],
    keywords: ['plants', 'plant management', 'locations', 'multi-plant'],
    permission: true,
    permissionKey: 'plants',
    permissionAction: 'view',
    group: 'Master Data',
  },
  {
    key: 'departments',
    path: '/departments',
    name: 'Departments',
    breadcrumbs: ['Master Settings', 'Departments'],
    keywords: ['departments', 'department list', 'master data'],
    permission: true,
    permissionKey: 'departments',
    permissionAction: 'view',
    group: 'Master Data',
  },
  {
    key: 'shifts',
    path: '/shifts',
    name: 'Shift Hours',
    breadcrumbs: ['Master Settings', 'Shift Hours'],
    keywords: ['shifts', 'shift timings', 'day shift', 'night shift', '12-hour shift'],
    permission: true,
    permissionKey: 'shifts',
    permissionAction: 'view',
    group: 'Master Data',
  },
  {
    key: 'festivals',
    path: '/festivals',
    name: 'Festivals & Holidays',
    breadcrumbs: ['Master Settings', 'Festivals & Holidays'],
    keywords: ['festivals', 'holidays', 'calendar', 'festival pay', 'off-days'],
    permission: true,
    permissionKey: 'festivals',
    permissionAction: 'view',
    group: 'Master Data',
  },
  {
    key: 'charges',
    path: '/charges',
    name: 'Charges & Allowances',
    breadcrumbs: ['Master Settings', 'Charges & Allowances'],
    keywords: ['charges', 'furnace cleaning', 'task rates', 'allowances', 'plant charges'],
    permission: true,
    permissionKey: 'charges',
    permissionAction: 'view',
    group: 'Master Data',
  },
  {
    key: 'designations',
    path: '/designations',
    name: 'Designations',
    breadcrumbs: ['Master Settings', 'Designations'],
    keywords: ['designations', 'job titles', 'positions', 'master data'],
    permission: true,
    permissionKey: 'designations',
    permissionAction: 'view',
    group: 'Master Data',
  },

  // Employee Management
  {
    key: 'employees',
    path: '/employees',
    name: 'Employee List',
    breadcrumbs: ['Employee Management'],
    keywords: ['employees', 'staff', 'workers', 'employee list', 'kyc', 'barcode'],
    permission: true,
    permissionKey: 'employees',
    permissionAction: 'view',
    group: 'Employee Management',
  },
  {
    key: 'employee-add',
    path: '/employees/add',
    name: 'Add Employee',
    breadcrumbs: ['Employee Management', 'Add Employee'],
    keywords: ['add employee', 'new employee', 'create employee'],
    permission: true,
    permissionKey: 'employees',
    permissionAction: 'create',
    group: 'Employee Management',
  },
  {
    key: 'employee-edit',
    path: '/employees/:id/edit',
    name: 'Edit Employee',
    breadcrumbs: ['Employee Management', 'Edit Employee'],
    keywords: ['edit employee', 'update employee'],
    permission: true,
    permissionKey: 'employees',
    permissionAction: 'edit',
    group: 'Employee Management',
  },
  {
    key: 'employee-view',
    path: '/employees/:id',
    name: 'Employee Profile',
    breadcrumbs: ['Employee Management', 'Profile'],
    keywords: ['employee profile', 'worker view', 'details', 'barcode'],
    permission: true,
    permissionKey: 'employee-view',
    permissionAction: 'view',
    group: 'Employee Management',
  },
  {
    key: 'employee-attendance',
    path: '/employees/:id/attendance',
    name: 'Employee Attendance',
    breadcrumbs: ['Employee Management', 'Attendance'],
    keywords: ['employee attendance', 'attendance history'],
    permission: true,
    permissionKey: 'employees',
    permissionAction: 'view',
    group: 'Employee Management',
  },
  {
    key: 'employee-salary',
    path: '/employees/:id/salary',
    name: 'Employee Salary',
    breadcrumbs: ['Employee Management', 'Salary'],
    keywords: ['employee salary', 'salary details', 'payroll'],
    permission: true,
    permissionKey: 'employees',
    permissionAction: 'view',
    group: 'Employee Management',
  },

  // Attendance Management
  {
    key: 'attendance',
    path: '/attendance',
    name: 'Daily Attendance',
    breadcrumbs: ['Attendance Management', 'Daily Attendance'],
    keywords: ['attendance', 'mark attendance', 'daily log', 'shift entry', 'deputation'],
    permission: true,
    permissionKey: 'attendance',
    permissionAction: 'view',
    group: 'Attendance',
  },

  // Advances & Finance
  {
    key: 'advances',
    path: '/advances',
    name: 'Cash & Bank Advances',
    breadcrumbs: ['Finance', 'Advances'],
    keywords: ['advances', 'cash advance', 'bank advance', 'loan recovery', 'salary advance'],
    permission: true,
    permissionKey: 'advances',
    permissionAction: 'view',
    group: 'Payroll & Finance',
  },

  // Reports
  {
    key: 'attendance-report',
    path: '/reports/attendance',
    name: 'Attendance Report',
    breadcrumbs: ['Reports', 'Attendance Report'],
    keywords: ['attendance report', 'daily attendance', 'monthly logs', 'deputation report', 'absenteeism'],
    permission: true,
    permissionKey: 'attendance-report',
    permissionAction: 'view',
    group: 'Reports',
  },
  {
    key: 'salary-report',
    path: '/reports/salary',
    name: 'Salary & Payroll Report',
    breadcrumbs: ['Reports', 'Salary Report'],
    keywords: ['salary report', 'payroll summary', 'ot calculations', 'furnace pay', 'gross pay', 'net salary'],
    permission: true,
    permissionKey: 'salary-report',
    permissionAction: 'view',
    group: 'Reports',
  },
  {
    key: 'maintenance-report',
    path: '/reports/maintenance',
    name: 'Maintenance & Powercut Report',
    breadcrumbs: ['Reports', 'Maintenance Report'],
    keywords: ['maintenance report', 'powercut hours', 'powercut present hours', 'downtime', 'shutdown compensation'],
    permission: true,
    permissionKey: 'maintenance-report',
    permissionAction: 'view',
    group: 'Reports',
  },

  // Settings & Security
  {
    key: 'roles',
    path: '/roles',
    name: 'Roles & Permissions',
    breadcrumbs: ['Settings', 'Roles & Permissions'],
    keywords: ['roles', 'role management', 'permissions', 'rbac', 'access control'],
    permission: true,
    permissionKey: 'roles',
    permissionAction: 'view',
    group: 'Settings',
  },
  {
    key: 'users',
    path: '/users',
    name: 'Users',
    breadcrumbs: ['Settings', 'Users'],
    keywords: ['users', 'user management', 'accounts', 'supervisors', 'plant heads', 'admin'],
    permission: true,
    permissionKey: 'users',
    permissionAction: 'view',
    group: 'Settings',
  }
];

/**
 * Get route config by path
 * @param {string} path - The route path
 * @returns {object|null} - Route configuration or null if not found
 */
export const getRouteConfig = (path) => {
  return ROUTES.find((route) => {
    if (route.path === path) return true;
    // match dynamic segments like :id
    const routeParts = route.path.split('/');
    const pathParts = path.split('/');
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
  }) || null;
};

/**
 * Get page name by path
 * @param {string} path - The route path
 * @returns {string} - Page name or empty string if not found
 */
export const getPageName = (path) => {
  const route = getRouteConfig(path);
  return route?.name || '';
};

/**
 * Get breadcrumbs by path
 * @param {string} path - The route path
 * @returns {array} - Breadcrumb array or empty array if not found
 */
export const getBreadcrumbs = (path) => {
  const route = getRouteConfig(path);
  return route?.breadcrumbs || [];
};

// Flat list of permissionable routes
export const ROUTE_PERMISSIONS = ROUTES
  .filter(r => r.permission)
  .map(r => ({ key: r.permissionKey, label: r.name, group: r.group, permissionKey: r.permissionKey, permissionAction: r.permissionAction }));

// Grouped: [{ group, routes: [{key, label}] }]
export const PERMISSION_GROUPS = ROUTE_PERMISSIONS.reduce((acc, r) => {
  if (!r.group) return acc;
  const g = acc.find(x => x.group === r.group);
  if (g) {
    if (!g.routes.some(route => route.key === r.key)) {
      g.routes.push({ key: r.key, label: r.label });
    }
  } else {
    acc.push({ group: r.group, routes: [{ key: r.key, label: r.label }] });
  }
  return acc;
}, []);