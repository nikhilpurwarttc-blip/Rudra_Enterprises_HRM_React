import { LoaderCircle } from 'lucide-react';

const Switch = ({
  checked,
  onClick,
  disabled = false,
  loading = false,
  title,
  className = '',
  activeClassName = 'bg-(--color-accent)',
  inactiveClassName = 'bg-(--color-border-strong)',
  ariaLabel,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const backgroundClass = checked ? activeClassName : inactiveClassName;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || title}
      aria-busy={loading}
      title={title}
      onClick={onClick}
      disabled={isDisabled}
      className={`relative inline-flex h-5 w-10 items-center justify-center rounded-full transition-colors duration-100 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)
        disabled:opacity-50 ${loading ? 'cursor-wait' : ''} ${backgroundClass} ${className}`}
      {...props}
    >
      {loading ? (
        <LoaderCircle size={12} className="animate-spin text-white" />
      ) : (
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-(--color-bg-elevated) shadow
            transform transition-transform duration-100 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      )}
    </button>
  );
};

export default Switch;
