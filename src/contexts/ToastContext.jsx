/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={18} className="text-green-500 shrink-0" />,
  error: <XCircle size={18} className="text-red-500 shrink-0" />,
  warning: <AlertCircle size={18} className="text-yellow-500 shrink-0" />,
  info: <Info size={18} className="text-primary-500 shrink-0" />,
};

const BG = {
  success: 'border-green-200 dark:border-green-800',
  error: 'border-red-200 dark:border-red-800',
  warning: 'border-yellow-200 dark:border-yellow-800',
  info: 'border-primary-200 dark:border-primary-800',
};

let id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((tid) =>
    setToasts((t) => t.filter((x) => x.id !== tid)), []);

  const toast = useCallback((message, type = 'info', duration = 7000) => {
    const tid = ++id;
    setToasts((t) => [...t, { id: tid, message, type }]);
    setTimeout(() => dismiss(tid), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-white dark:bg-gray-900 dark:text-white text-sm max-w-sm animate-slide-in ${BG[t.type]}`}
            >
              {ICONS[t.type]}
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
