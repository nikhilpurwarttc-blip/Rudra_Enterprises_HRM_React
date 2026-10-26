export const NOTIFICATION_ACTION_ROUTES = {
  attendance_verification: { path: "/attendance", permission: "attendance" },
  employee_approval: { path: "/employees", permission: "employees" },
  payroll_approval: { path: "/reports/salary", permission: "salary-report" },
  advance_recovery: { path: "/advances", permission: "advances" },
};

export const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const getPendingNotificationActions = (dashboard, attendanceCount, can) => {
  const actions = Array.isArray(dashboard?.pending_actions)
    ? dashboard.pending_actions
    : [];

  return [...new Map(actions
    .filter((action) => action?.type && action.type !== "shutdown_approval")
    .filter((action) => {
      const route = NOTIFICATION_ACTION_ROUTES[action.type];
      return route && can(route.permission, "view");
    })
    .map((action) => action.type === "attendance_verification"
      ? { ...action, count: attendanceCount }
      : action)
    .filter((action) => Number.isFinite(Number(action.count)) && Number(action.count) > 0)
    .map((action) => [action.type, action])).values()];
};

export const getPendingShutdownCount = (response, shutdowns) => {
  const total = Number(response?.meta?.total ?? response?.total ?? shutdowns.length);
  return Number.isFinite(total) ? Math.max(total, shutdowns.length) : shutdowns.length;
};

export const getNotificationCount = ({ dashboard, attendanceCount, shutdownResponse, shutdowns, can }) => {
  const actionNotifications = getPendingNotificationActions(dashboard, attendanceCount, can).length;
  return actionNotifications + getPendingShutdownCount(shutdownResponse, shutdowns);
};
