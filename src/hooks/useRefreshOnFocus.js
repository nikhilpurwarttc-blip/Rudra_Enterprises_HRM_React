import { useEffect, useRef } from 'react';

const useRefreshOnFocus = (refresh, enabled = true) => {
  const refreshRef = useRef(refresh);
  const lastRefreshTime = useRef(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshTime.current < 750) return;
      lastRefreshTime.current = now;
      refreshRef.current({ silent: true });
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [enabled]);
};

export default useRefreshOnFocus;
