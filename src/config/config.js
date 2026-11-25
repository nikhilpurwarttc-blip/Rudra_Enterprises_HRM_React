const env = import.meta.env;

export const API_BASE_URL = env.DEV ? '/api' : env.VITE_API_URL || '/lcm/backend/api';
const parsedApiUrl = new URL(API_BASE_URL, window.location.origin);
const apiPathPrefix = parsedApiUrl.pathname.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const resolveApiAssetUrl = (url) => {
  if (!url) return null;

  const parsedUrl = new URL(url, window.location.origin);
  const isAbsoluteUrl = /^https?:\/\//i.test(url);
  const isLoopbackHost = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(parsedUrl.hostname);
  const usesDevelopmentProxy = env.DEV && (
    !isAbsoluteUrl || isLoopbackHost
  );

  if (usesDevelopmentProxy) return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  if (!isAbsoluteUrl || isLoopbackHost) {
    const alreadyHasApiPrefix = apiPathPrefix
      && (parsedUrl.pathname === apiPathPrefix || parsedUrl.pathname.startsWith(`${apiPathPrefix}/`));
    const assetPath = alreadyHasApiPrefix
      ? parsedUrl.pathname
      : `${apiPathPrefix}${parsedUrl.pathname}`;
    return new URL(`${assetPath}${parsedUrl.search}${parsedUrl.hash}`, parsedApiUrl.origin).href;
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
