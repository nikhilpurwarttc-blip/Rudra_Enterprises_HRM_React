const env = import.meta.env;

export const API_BASE_URL = env.DEV ? '/api' : env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000/api`;
console.log(window.location.protocol, window.location.hostname, API_BASE_URL);
export const resolveApiAssetUrl = (url) => {
  if (!url) return null;

  const parsedUrl = new URL(url, window.location.origin);
  const isLoopbackHost = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(parsedUrl.hostname);
  const usesDevelopmentProxy = env.DEV && (
    !/^https?:\/\//i.test(url) || isLoopbackHost
  );

  if (usesDevelopmentProxy) return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  if (!/^https?:\/\//i.test(url) || isLoopbackHost) {
    const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
    return new URL(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`, `${apiOrigin}/`).href;
  }
  return parsedUrl.href;
};
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
