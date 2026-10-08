import { lazy, memo, Suspense, useEffect, useMemo, useTransition } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials, selectIsAuthenticated, selectUser, setUser } from './store/authSlice';
import { api, useGetUserQuery, useLogoutMutation } from './store/api';
import Login from './pages/Auth/Login';
import MainLayout from './layout/MainLayout';
import usePermission from './hooks/usePermission';
import { ROUTES, getRouteConfig } from './constants/routes';
import AccessDenied from './components/AccessDenied';
import { LoadingState } from './components/Feedback';

// ── Lazy page imports ─────────────────────────────────────────────────────────
const Dashboard         = lazy(() => import('./pages/Dashboard/Dashboard'));
const Plants            = lazy(() => import('./pages/MasterData/Plants'));
const Departments       = lazy(() => import('./pages/MasterData/Departments'));
const Shifts            = lazy(() => import('./pages/MasterData/Shifts'));
const Festivals         = lazy(() => import('./pages/MasterData/Festivals'));
const Charges           = lazy(() => import('./pages/MasterData/Charges'));
const Designations      = lazy(() => import('./pages/MasterData/Designations'));
const Employees         = lazy(() => import('./pages/Employee/Employees'));
const Attendance        = lazy(() => import('./pages/Attendance/Marking'));
const Advances          = lazy(() => import('./pages/Payroll/Advances'));
const AttendanceReport  = lazy(() => import('./pages/Reports/AttendanceReport'));
const SalaryReport      = lazy(() => import('./pages/Reports/SalaryReport'));
const MaintenanceReport = lazy(() => import('./pages/Reports/MaintenanceReport'));
const Users             = lazy(() => import('./pages/Users/Users'));
const Roles             = lazy(() => import('./pages/Users/Roles'));

// ── Shared loading fallback ───────────────────────────────────────────────────
const Loading = () => (
  <LoadingState message="Loading workspace..." className="min-h-[60vh]" />
);

// ── AuthGuard ─────────────────────────────────────────────────────────────────
// Skips the /user refetch when a cached user already exists so the layout
// never flashes a spinner on subsequent navigations.
const AuthGuard = ({ children }) => {
  const dispatch       = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const cachedUser     = useSelector(selectUser);
  const location       = useLocation();

  const { data: user, isLoading } = useGetUserQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (user) dispatch(setUser(user));
  }, [dispatch, user]);

  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading && !cachedUser) return <Loading />;
  return children;
};

// ── PermissionRoute ───────────────────────────────────────────────────────────
// memo: re-renders only when path/action/children identity changes.
// getRouteConfig result is stable per path so we memoize it.
const PermissionRoute = memo(({ path, action = 'view', children }) => {
  const { canAccess, canView } = usePermission(path);
  const pageName = useMemo(() => getRouteConfig(path)?.name ?? 'Page', [path]);
  const isAllowed = action === 'view' ? canView : canAccess;
  return isAllowed ? children : <AccessDenied pageName={pageName} routePath={path} />;
});

// ── HomeRoute ─────────────────────────────────────────────────────────────────
const HomeRoute = () => {
  const { can } = usePermission();
  if (can('dashboard', 'view')) return <Dashboard />;

  const firstAccessible = ROUTES.find((r) => {
    if (r.path === '/' || r.path.includes(':')) return false;
    return can(r.permissionKey ?? r.path, r.permissionAction ?? 'view');
  });

  return firstAccessible
    ? <Navigate to={firstAccessible.path} replace />
    : <AccessDenied pageName="Dashboard" routePath="/" noAccessAtAll />;
};

// ── Logout ────────────────────────────────────────────────────────────────────
const Logout = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [logout]  = useLogoutMutation();

  useEffect(() => {
    logout().finally(() => {
      dispatch(api.util.resetApiState());
      dispatch(clearCredentials());
      navigate('/login', { replace: true });
    });
  }, [dispatch, logout, navigate]);

  return <Loading />;
};

// ── ProtectedRoutes ───────────────────────────────────────────────────────────
// pageKey: only the first two segments so /employees/* sub-routes share one
// Suspense boundary (no full remount when drilling into an employee profile).
// useTransition defers the Suspense fallback — the current page stays visible
// while the next chunk loads, then swaps in with a fade animation.
const ProtectedRoutes = () => {
  const location = useLocation();
  const [, startTransition] = useTransition(); // eslint-disable-line no-unused-vars
  const pageKey = location.pathname.split('/').slice(0, 2).join('/');

  return (
    <AuthGuard>
      <MainLayout isPending={false}>
        <Suspense key={pageKey} fallback={<Loading />}>
          <Routes location={location}>
            <Route path="/"                         element={<HomeRoute />} />
            <Route path="/plants"                   element={<PermissionRoute path="/plants"><Plants /></PermissionRoute>} />
            <Route path="/departments"              element={<PermissionRoute path="/departments"><Departments /></PermissionRoute>} />
            <Route path="/shifts"                   element={<PermissionRoute path="/shifts"><Shifts /></PermissionRoute>} />
            <Route path="/festivals"                element={<PermissionRoute path="/festivals"><Festivals /></PermissionRoute>} />
            <Route path="/charges"                  element={<PermissionRoute path="/charges"><Charges /></PermissionRoute>} />
            <Route path="/designations"             element={<PermissionRoute path="/designations"><Designations /></PermissionRoute>} />
            <Route path="/employees"                element={<PermissionRoute path="/employees"><Employees /></PermissionRoute>} />
            <Route path="/employees/add"            element={<PermissionRoute path="/employees/add" action="create"><Employees /></PermissionRoute>} />
            <Route path="/employees/:id/edit"       element={<PermissionRoute path="/employees/:id/edit" action="edit"><Employees /></PermissionRoute>} />
            <Route path="/employees/:id/attendance" element={<PermissionRoute path="/employees/:id/attendance"><Employees /></PermissionRoute>} />
            <Route path="/employees/:id/salary"     element={<PermissionRoute path="/employees/:id/salary"><Employees /></PermissionRoute>} />
            <Route path="/employees/:id"            element={<PermissionRoute path="/employees/:id"><Employees /></PermissionRoute>} />
            <Route path="/attendance"               element={<PermissionRoute path="/attendance"><Attendance /></PermissionRoute>} />
            <Route path="/advances"                 element={<PermissionRoute path="/advances"><Advances /></PermissionRoute>} />
            <Route path="/reports/attendance"       element={<PermissionRoute path="/reports/attendance"><AttendanceReport /></PermissionRoute>} />
            <Route path="/reports/salary"           element={<PermissionRoute path="/reports/salary"><SalaryReport /></PermissionRoute>} />
            <Route path="/reports/maintenance"      element={<PermissionRoute path="/reports/maintenance"><MaintenanceReport /></PermissionRoute>} />
            <Route path="/users"                    element={<PermissionRoute path="/users"><Users /></PermissionRoute>} />
            <Route path="/roles"                    element={<PermissionRoute path="/roles"><Roles /></PermissionRoute>} />
            <Route path="/logout"                   element={<Logout />} />
            <Route path="*"                         element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </AuthGuard>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/*"     element={<ProtectedRoutes />} />
  </Routes>
);

export default App;
