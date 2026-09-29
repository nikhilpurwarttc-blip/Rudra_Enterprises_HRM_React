import { lazy, Suspense, useEffect } from 'react';
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

const Dashboard        = lazy(() => import('./pages/Dashboard/Dashboard'));
const Plants           = lazy(() => import('./pages/MasterData/Plants'));
const Departments      = lazy(() => import('./pages/MasterData/Departments'));
const Shifts           = lazy(() => import('./pages/MasterData/Shifts'));
const Festivals        = lazy(() => import('./pages/MasterData/Festivals'));
const Charges          = lazy(() => import('./pages/MasterData/Charges'));
const Designations     = lazy(() => import('./pages/MasterData/Designations'));
const Employees        = lazy(() => import('./pages/Employee/Employees'));
const Attendance       = lazy(() => import('./pages/Attendance/Marking'));
const Advances         = lazy(() => import('./pages/Payroll/Advances'));
const AttendanceReport = lazy(() => import('./pages/Reports/AttendanceReport'));
const SalaryReport     = lazy(() => import('./pages/Reports/SalaryReport'));
const MaintenanceReport = lazy(() => import('./pages/Reports/MaintenanceReport'));
const Users            = lazy(() => import('./pages/Users/Users'));
const Roles            = lazy(() => import('./pages/Users/Roles'));

const Loading = () => (
  <LoadingState message="Loading workspace..." className="min-h-[60vh]" />
);

const AuthGuard = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const cachedUser = useSelector(selectUser);
  const location = useLocation();
  const { data: user, isLoading } = useGetUserQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (user) dispatch(setUser(user));
  }, [dispatch, user]);

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading && !cachedUser) return <Loading />;
  return children;
};

const PermissionRoute = ({ path, action = 'view', children }) => {
  const { canAccess, canView } = usePermission(path);
  const route = getRouteConfig(path);
  const pageName = route?.name ?? 'Page';

  const isAllowed = action === 'view' ? canView : canAccess;
  if (!isAllowed) {
    return <AccessDenied pageName={pageName} routePath={path} />;
  }

  return children;
};

const HomeRoute = () => {
  // const { can, isSuperAdmin } = usePermission();
  // const canDashboard = isSuperAdmin || can('dashboard', 'view');
  const { can } = usePermission();
  const canDashboard = can('dashboard', 'view');

  if (canDashboard) {
    return <Dashboard />;
  }

  // Find first accessible route if user has no dashboard permission
  const firstAccessible = ROUTES.find((r) => {
    if (r.path === '/' || r.path.includes(':')) return false;
    const permKey = r.permissionKey ?? r.path;
    const action = r.permissionAction ?? 'view';
    return can(permKey, action);
  });

  if (firstAccessible) {
    return <Navigate to={firstAccessible.path} replace />;
  }

  return <AccessDenied pageName="Dashboard" routePath="/" noAccessAtAll />;
};

const Logout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  useEffect(() => {
    logout().finally(() => {
      dispatch(api.util.resetApiState());
      dispatch(clearCredentials());
      navigate('/login', { replace: true });
    });
  }, [dispatch, logout, navigate]);

  return <Loading />;
};

const ProtectedRoutes = () => (
  <AuthGuard>
    <MainLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/"                       element={<HomeRoute />} />
          <Route path="/plants"                 element={<PermissionRoute path="/plants"><Plants /></PermissionRoute>} />
          <Route path="/departments"            element={<PermissionRoute path="/departments"><Departments /></PermissionRoute>} />
          <Route path="/shifts"                 element={<PermissionRoute path="/shifts"><Shifts /></PermissionRoute>} />
          <Route path="/festivals"              element={<PermissionRoute path="/festivals"><Festivals /></PermissionRoute>} />
          <Route path="/charges"                element={<PermissionRoute path="/charges"><Charges /></PermissionRoute>} />
          <Route path="/designations"           element={<PermissionRoute path="/designations"><Designations /></PermissionRoute>} />
          <Route path="/employees"              element={<PermissionRoute path="/employees"><Employees /></PermissionRoute>} />
          <Route path="/employees/add"          element={<PermissionRoute path="/employees/add" action="create"><Employees /></PermissionRoute>} />
          <Route path="/employees/:id/edit"     element={<PermissionRoute path="/employees/:id/edit" action="edit"><Employees /></PermissionRoute>} />
          <Route path="/employees/:id/attendance" element={<PermissionRoute path="/employees/:id/attendance"><Employees /></PermissionRoute>} />
          <Route path="/employees/:id/salary"   element={<PermissionRoute path="/employees/:id/salary"><Employees /></PermissionRoute>} />
          <Route path="/employees/:id"          element={<PermissionRoute path="/employees/:id"><Employees /></PermissionRoute>} />
          <Route path="/attendance"             element={<PermissionRoute path="/attendance"><Attendance /></PermissionRoute>} />
          <Route path="/advances"               element={<PermissionRoute path="/advances"><Advances /></PermissionRoute>} />
          <Route path="/reports/attendance"     element={<PermissionRoute path="/reports/attendance"><AttendanceReport /></PermissionRoute>} />
          <Route path="/reports/salary"         element={<PermissionRoute path="/reports/salary"><SalaryReport /></PermissionRoute>} />
          <Route path="/reports/maintenance"    element={<PermissionRoute path="/reports/maintenance"><MaintenanceReport /></PermissionRoute>} />
          <Route path="/users"                  element={<PermissionRoute path="/users"><Users /></PermissionRoute>} />
          <Route path="/roles"                  element={<PermissionRoute path="/roles"><Roles /></PermissionRoute>} />
          <Route path="/logout"                 element={<Logout />} />
          <Route path="*"                       element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  </AuthGuard>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/*"     element={<ProtectedRoutes />} />
  </Routes>
);

export default App;
