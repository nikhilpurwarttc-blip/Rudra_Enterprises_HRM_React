import { createSlice } from '@reduxjs/toolkit';

const storedSession = localStorage.getItem('hrm_session') === '1';

// Laravel's /user endpoint wraps the response in a `data` key (Laravel Resource).
// The login endpoint does NOT wrap. This helper normalises both shapes.
const unwrapUser = (user) => {
  if (!user) return null;
  return user.data ?? user;
};

const authSlice = createSlice({
  name: 'auth',
  initialState: { token: null, user: null, authenticated: storedSession },
  reducers: {
    setCredentials: (state, action) => {
      const { user } = action.payload;
      state.token = null;
      state.user = unwrapUser(user);
      state.authenticated = true;
      localStorage.setItem('hrm_session', '1');
    },
    clearCredentials: (state) => {
      state.token = null;
      state.user = null;
      state.authenticated = false;
      localStorage.removeItem('hrm_session');
    },
    setUser: (state, action) => {
      state.user = unwrapUser(action.payload);
    },
  },
});

export const { setCredentials, clearCredentials, setUser } = authSlice.actions;

export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => unwrapUser(state.auth.user);
export const selectIsAuthenticated = (state) => state.auth.authenticated;
export const selectRole = (state) => unwrapUser(state.auth.user)?.role ?? null;
export const selectRoleName = (state) => {
  const role = unwrapUser(state.auth.user)?.role;
  return (typeof role === 'string' ? role : role?.name ?? '').trim();
};
export const selectUserType = (state) => unwrapUser(state.auth.user)?.role ?? null;
export const selectPermissions = (state) => unwrapUser(state.auth.user)?.permissions ?? null;
export const selectIsReadOnly = (state) => unwrapUser(state.auth.user)?.is_read_only ?? false;

export default authSlice.reducer;
