import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer, { clearCredentials, setCredentials } from './authSlice';
import { api } from './api';

const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  matcher: isAnyOf(clearCredentials, setCredentials),
  effect: (_action, { dispatch }) => {
    dispatch(api.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .prepend(authListenerMiddleware.middleware)
    .concat(api.middleware),
});

export { setupListeners };
