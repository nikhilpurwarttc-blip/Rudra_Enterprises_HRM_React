import { twMerge } from 'tailwind-merge';

const Chip = ({
  children,
  selected = false,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  const isInteractive = typeof onClick === 'function';

  return (
    <button
      type="button"
      aria-pressed={isInteractive ? selected : undefined}
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        `inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          selected
            ? 'border-(--color-accent) bg-(--color-accent) text-white'
            : 'border-(--color-border) bg-(--color-surface) text-(--color-text-muted) hover:border-(--color-accent) hover:text-(--color-accent)'
        } disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Chip;
