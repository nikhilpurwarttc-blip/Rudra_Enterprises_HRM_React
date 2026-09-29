export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => (
  error?.data?.message
    ?? Object.values(error?.data?.errors ?? {}).flat()[0]
    ?? (error?.status === 'FETCH_ERROR' ? 'Unable to connect to the server.' : fallback)
);
