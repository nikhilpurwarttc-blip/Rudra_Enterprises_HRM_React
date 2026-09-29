import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { api } from './api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    immutableCheck: false,
    serializableCheck: false,
  }).concat(api.middleware),
});
