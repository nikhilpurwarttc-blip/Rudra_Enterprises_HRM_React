const env = import.meta.env;

export const API_BASE_URL = env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000/api`;
console.log(window.location.protocol, window.location.hostname, API_BASE_URL);
export const CSRF_URL = API_BASE_URL.replace(/\/api\/?$/, '/sanctum/csrf-cookie');
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('accept', 'application/json');
    headers.set('content-type', 'application/json');
    const csrfToken = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    if (csrfToken) headers.set('X-XSRF-TOKEN', decodeURIComponent(csrfToken));
    return headers;
  },
};
