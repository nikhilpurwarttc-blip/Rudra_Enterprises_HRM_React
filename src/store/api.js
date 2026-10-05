import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { clearCredentials, selectToken } from './authSlice';
import { API_CONFIG } from '../config/config';
import { recordApiResponse } from '../utils/performance';

const fetchTimings = new Map();

const toEmployeeRequestBody = (body, method = 'POST') => {
  if (!body?.image || !(body.image instanceof File)) return body;

  const formData = new FormData();
  if (method !== 'POST') formData.append('_method', method);
  Object.entries(body).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (key === 'charge_ids' && Array.isArray(value)) {
      value.forEach((chargeId) => formData.append('charge_ids[]', chargeId));
      return;
    }
    formData.append(key, value);
  });
  return formData;
};

const toEmployeeDocumentRequestBody = (body) => {
  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') formData.append(key, value);
  });
  return formData;
};

const getFetchUrl = (input) => (typeof input === 'string' ? input : input.url);

const timedFetch = async (input, init) => {
  const fetchStartedAt = performance.now();
  const response = await fetch(input, init);
  const responseReceivedAt = performance.now();
  const url = getFetchUrl(input);
  const timings = fetchTimings.get(url) ?? [];
  timings.push({ fetchStartedAt, responseReceivedAt });
  fetchTimings.set(url, timings);
  return response;
};

const rawBaseQuery = fetchBaseQuery({
  ...API_CONFIG,
  fetchFn: timedFetch,
  prepareHeaders: (headers, { getState, arg }) => {
    API_CONFIG.prepareHeaders(headers);
    if (arg?.body instanceof FormData) headers.delete('content-type');
    const token = selectToken(getState());
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

const buildSearchQuery = (resource, value) => {
  const params = {};
  const payload = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const search = String(payload.search ?? '').trim();
  const page = Number(payload.page ?? payload.currentPage ?? 1) || 1;
  const perPage = Number(payload.per_page ?? payload.perPage ?? 15) || 15;

  if (search) params.search = search;
  if (payload.plant_id !== undefined && payload.plant_id !== null && payload.plant_id !== '') params.plant_id = payload.plant_id;
  if (Array.isArray(payload.ids)) {
    params['ids[]'] = payload.ids.filter((id) => id !== null && id !== undefined && id !== '');
  } else if (payload.ids !== undefined && payload.ids !== null && payload.ids !== '') {
    params['ids[]'] = Array.isArray(payload.ids) ? payload.ids : [payload.ids];
  }
  if (page) params.page = page;
  if (perPage) params.per_page = perPage;

  return { url: resource, params };
};

const timedBaseQuery = async (args, api, extraOptions) => {
  const request = typeof args === 'string' ? { url: args, method: 'GET' } : args;
  const result = await rawBaseQuery(args, api, extraOptions);
  const requestUrl = `${API_CONFIG.baseUrl}${request.url}`;
  const timings = fetchTimings.get(requestUrl) ?? [];
  const responseTiming = timings.shift();
  if (timings.length === 0) fetchTimings.delete(requestUrl);
  const responseReceivedAt = responseTiming?.responseReceivedAt ?? performance.now();
  const durationMs = responseTiming
    ? responseTiming.responseReceivedAt - responseTiming.fetchStartedAt
    : null;
  const endpointName = api.endpoint ?? 'unknown';

  recordApiResponse(endpointName, responseReceivedAt);
  console.groupCollapsed(`[API] ${endpointName} ${request.method ?? 'GET'} ${request.url}`);
  console.log(JSON.stringify({
    endpoint: endpointName,
    method: request.method ?? 'GET',
    url: request.url,
    fetchDurationMs: durationMs == null ? 'unavailable' : Number(durationMs.toFixed(2)),
    resultAvailableAt: performance.now(),
    status: result.meta?.response?.status ?? result.error?.status ?? 'unknown',
    responseReceivedAt,
    ok: !result.error,
  }));
  console.groupEnd();

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: timedBaseQuery,
  tagTypes: ['User', 'Users', 'Employee', 'EmployeeDocument', 'EmployeeBankAccount', 'EmployeeAdvance', 'Attendance', 'Role', 'Permission', 'Shift', 'Charge', 'Plant', 'Department', 'Holiday', 'Designation'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({ url: '/login', method: 'POST', body: credentials }),
    }),
    logout: builder.mutation({
      query: () => ({ url: '/logout', method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    getUser: builder.query({
      query: () => '/user',
      providesTags: ['User'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          if (error?.error?.status === 401) dispatch(clearCredentials());
        }
      },
    }),

    // Users
    getUsers: builder.query({
      query: (arg) => buildSearchQuery('/users', arg),
      providesTags: ['Users'],
    }),
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Users', id }],
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Users', 'User'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Users'],
    }),

    // Employees
    getEmployees: builder.query({
      query: (arg) => buildSearchQuery('/employees', arg),
      providesTags: ['Employee'],
    }),
    getEmployeeById: builder.query({
      query: (id) => `/employees/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Employee', id }],
    }),
    getEmployeeAttendance: builder.query({
      query: ({ employeeId, ...params }) => ({ url: `/employees/${employeeId}/attendance`, params }),
      providesTags: ['Attendance'],
    }),
    createEmployee: builder.mutation({
      query: (body) => ({ url: '/employees', method: 'POST', body: toEmployeeRequestBody(body) }),
      invalidatesTags: ['Employee'],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...body }) => {
        const requestBody = toEmployeeRequestBody(body, 'PUT');
        return { url: `/employees/${id}`, method: requestBody instanceof FormData ? 'POST' : 'PUT', body: requestBody };
      },
      invalidatesTags: ['Employee'],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Employee'],
    }),
    getAttendanceFilters: builder.query({
      query: () => '/attendances/filters',
    }),
    getAttendanceReportFilters: builder.query({
      query: () => '/attendance-report/filters',
    }),
    getAttendanceReport: builder.query({
      query: (filters = {}) => {
        const params = { page: filters.page ?? 1, per_page: filters.per_page ?? 15 };
        ['date_from', 'date_to', 'plant_id', 'department_id', 'shift_id', 'search'].forEach((key) => {
          if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') params[key] = filters[key];
        });
        return { url: '/attendance-report', params };
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceRoster: builder.query({
      query: (filters = {}) => {
        const params = {
          page: filters.page ?? 1,
          per_page: filters.per_page ?? 15,
          date: filters.date,
        };
        ['plant_id', 'department_id', 'shift_id', 'search'].forEach((key) => {
          if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') params[key] = filters[key];
        });
        return { url: '/attendances/roster', params };
      },
      providesTags: ['Attendance'],
    }),
    checkInAttendance: builder.mutation({
      query: (body) => ({ url: '/attendances/check-in', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    checkOutAttendance: builder.mutation({
      query: (body) => ({ url: '/attendances/check-out', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    getEmployeeAdvances: builder.query({
      query: (filters = {}) => ({ url: '/employee-advances', params: filters }),
      providesTags: ['EmployeeAdvance'],
    }),
    createEmployeeAdvance: builder.mutation({
      query: (body) => ({ url: '/employee-advances', method: 'POST', body }),
      invalidatesTags: ['EmployeeAdvance'],
    }),
    updateEmployeeAdvance: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/employee-advances/${id}`, method: 'PUT', body }),
      invalidatesTags: ['EmployeeAdvance'],
    }),
    recoverEmployeeAdvance: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/employee-advances/${id}/recover`, method: 'POST', body }),
      invalidatesTags: ['EmployeeAdvance'],
    }),
    cancelEmployeeAdvance: builder.mutation({
      query: (id) => ({ url: `/employee-advances/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['EmployeeAdvance'],
    }),
    getEmployeeDocuments: builder.query({
      query: (employeeId) => `/employee-documents?employee_id=${employeeId}`,
      providesTags: (_result, _error, employeeId) => [{ type: 'EmployeeDocument', id: employeeId }],
    }),
    createEmployeeDocument: builder.mutation({
      query: (body) => ({ url: '/employee-documents', method: 'POST', body: toEmployeeDocumentRequestBody(body) }),
      invalidatesTags: (_result, _error, body) => [{ type: 'EmployeeDocument', id: body.employee_id }],
    }),
    deleteEmployeeDocument: builder.mutation({
      query: (id) => ({ url: `/employee-documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmployeeDocument'],
    }),
    getEmployeeBankAccounts: builder.query({
      query: (employeeId) => `/employee-bank-accounts?employee_id=${employeeId}`,
      providesTags: (_result, _error, employeeId) => [{ type: 'EmployeeBankAccount', id: employeeId }],
    }),
    createEmployeeBankAccount: builder.mutation({
      query: (body) => ({ url: '/employee-bank-accounts', method: 'POST', body }),
      invalidatesTags: (_result, _error, body) => [{ type: 'EmployeeBankAccount', id: body.employee_id }],
    }),
    deleteEmployeeBankAccount: builder.mutation({
      query: (id) => ({ url: `/employee-bank-accounts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmployeeBankAccount'],
    }),

    // Shifts
    getShifts: builder.query({
      query: (arg) => buildSearchQuery('/shifts', arg),
      providesTags: ['Shift'],
    }),
    createShift: builder.mutation({
      query: (body) => ({ url: '/shifts', method: 'POST', body }),
      invalidatesTags: ['Shift'],
    }),
    updateShift: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/shifts/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Shift'],
    }),
    deleteShift: builder.mutation({
      query: (id) => ({ url: `/shifts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Shift'],
    }),

    // Master data
    getPlants: builder.query({
      query: (arg) => buildSearchQuery('/plants', arg),
      providesTags: ['Plant'],
    }),
    createPlant: builder.mutation({
      query: (body) => ({ url: '/plants', method: 'POST', body }),
      invalidatesTags: ['Plant', 'Department', 'Holiday'],
    }),
    updatePlant: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/plants/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Plant', 'Department', 'Holiday'],
    }),
    deletePlant: builder.mutation({
      query: (id) => ({ url: `/plants/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Plant', 'Department', 'Holiday'],
    }),
    getDepartments: builder.query({
      query: (arg) => {
        if (typeof arg === 'number' || typeof arg === 'string') {
          return buildSearchQuery('/departments', { plant_id: arg, per_page: 15 });
        }
        return buildSearchQuery('/departments', arg);
      },
      providesTags: ['Department'],
    }),
    getDesignations: builder.query({
      query: (arg) => buildSearchQuery('/designations', arg),
      providesTags: ['Designation'],
    }),
    createDesignation: builder.mutation({
      query: (body) => ({ url: '/designations', method: 'POST', body }),
      invalidatesTags: ['Designation'],
    }),
    updateDesignation: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/designations/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Designation', 'Employee'],
    }),
    deleteDesignation: builder.mutation({
      query: (id) => ({ url: `/designations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Designation', 'Employee'],
    }),
    createDepartment: builder.mutation({
      query: (body) => ({ url: '/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),
    updateDepartment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Department'],
    }),
    deleteDepartment: builder.mutation({
      query: (id) => ({ url: `/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Department'],
    }),
    getHolidays: builder.query({
      query: (plantId) => plantId ? `/holidays?plant_id=${plantId}` : '/holidays',
      providesTags: ['Holiday'],
    }),
    createHoliday: builder.mutation({
      query: (body) => ({ url: '/holidays', method: 'POST', body }),
      invalidatesTags: ['Holiday'],
    }),
    updateHoliday: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/holidays/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Holiday'],
    }),
    deleteHoliday: builder.mutation({
      query: (id) => ({ url: `/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Holiday'],
    }),

    // Charges
    getCharges: builder.query({
      query: (arg) => buildSearchQuery('/charges', arg),
      providesTags: ['Charge'],
    }),
    createCharge: builder.mutation({
      query: (body) => ({ url: '/charges', method: 'POST', body }),
      invalidatesTags: ['Charge'],
    }),
    updateCharge: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/charges/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Charge'],
    }),
    deleteCharge: builder.mutation({
      query: (id) => ({ url: `/charges/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Charge'],
    }),

    // Roles
    getRoles: builder.query({
      query: (arg) => buildSearchQuery('/roles', arg),
      providesTags: ['Role'],
    }),
    createRole: builder.mutation({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      invalidatesTags: ['Role', 'User'],
    }),
    updateRole: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/roles/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Role', 'User'],
    }),
    deleteRole: builder.mutation({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Role', 'User'],
    }),

    // Permissions
    getPermissions: builder.query({
      query: () => '/permissions',
      providesTags: ['Permission'],
    }),
    seedPermissions: builder.mutation({
      query: (body) => ({ url: '/permissions/seed', method: 'POST', body }),
      invalidatesTags: ['Permission'],
    }),
    createPermission: builder.mutation({
      query: (body) => ({ url: '/permissions', method: 'POST', body }),
      invalidatesTags: ['Permission'],
    }),
    updatePermission: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/permissions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Permission'],
    }),
    deletePermission: builder.mutation({
      query: (id) => ({ url: `/permissions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Permission'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetUserQuery,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetEmployeesQuery,
  useLazyGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useGetEmployeeAttendanceQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetAttendanceFiltersQuery,
  useGetAttendanceReportFiltersQuery,
  useGetAttendanceReportQuery,
  useGetAttendanceRosterQuery,
  useCheckInAttendanceMutation,
  useCheckOutAttendanceMutation,
  useGetEmployeeAdvancesQuery,
  useCreateEmployeeAdvanceMutation,
  useUpdateEmployeeAdvanceMutation,
  useRecoverEmployeeAdvanceMutation,
  useCancelEmployeeAdvanceMutation,
  useGetEmployeeDocumentsQuery,
  useCreateEmployeeDocumentMutation,
  useDeleteEmployeeDocumentMutation,
  useGetEmployeeBankAccountsQuery,
  useCreateEmployeeBankAccountMutation,
  useDeleteEmployeeBankAccountMutation,
  useGetShiftsQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useGetPlantsQuery,
  useCreatePlantMutation,
  useUpdatePlantMutation,
  useDeletePlantMutation,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
  useCreateDesignationMutation,
  useUpdateDesignationMutation,
  useDeleteDesignationMutation,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useGetChargesQuery,
  useCreateChargeMutation,
  useUpdateChargeMutation,
  useDeleteChargeMutation,
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useSeedPermissionsMutation,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
} = api;
