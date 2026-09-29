import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';

const styles = {
  error: {
    icon: AlertCircle,
    iconClass: 'text-(--color-danger)',
    title: 'Something went wrong',
  },
  empty: {
    icon: Inbox,
    iconClass: 'text-(--color-text-muted)',
    title: 'No records found',
  },
};

export const Feedback = ({ type = 'error', title, message, action, className = '' }) => {
  const config = styles[type] ?? styles.error;
  const Icon = config.icon;

  return (
    <div role={type === 'error' ? 'alert' : undefined} className={`flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center ${className}`}>
      <Icon size={28} className={config.iconClass} aria-hidden="true" />
      <p className="text-sm font-semibold text-(--color-text)">{title ?? config.title}</p>
      {message && <p className="max-w-md text-sm text-(--color-text-muted)">{message}</p>}
      {action}
    </div>
  );
};

export const LoadingState = ({ message = 'Loading...', className = '' }) => (
  <div role="status" className={`flex min-h-32 items-center justify-center gap-2 p-6 text-sm text-(--color-text-muted) ${className}`}>
    <LoaderCircle size={18} className="animate-spin text-(--color-accent)" aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export const InlineError = ({ message, className = '' }) => (
  message ? <p role="alert" className={`text-sm text-(--color-danger) ${className}`}>{message}</p> : null
);

