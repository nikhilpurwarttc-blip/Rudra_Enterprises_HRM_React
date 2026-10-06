import React, { useId } from "react";
import clsx from "clsx";

/**
 * Reusable Chip Switcher component following InputField UI legacy
 * @param {string} [label] - Floating label text
 * @param {Array<{value: string|number, label: string}>} options - Options list
 * @param {string|number} value - Currently selected option value
 * @param {function} onChange - Selection callback returning the selected value
 * @param {string} [helperText] - Helper text below input
 * @param {string} [error] - Error message string
 * @param {boolean} [required] - Shows required asterisk
 * @param {boolean} [disabled] - Disables interactions
 * @param {string} [className] - Optional custom outer class
 */
const ChipSwitcher = ({
  label,
  options = [],
  value,
  onChange,
  helperText,
  error,
  required = false,
  disabled = false,
  className,
  ...props
}) => {
  const switcherId = useId();
  const descriptionId = `${switcherId}-description`;

  return (
    <div className="w-auto">
      <div
        id={switcherId}
        role="radiogroup"
        aria-invalid={Boolean(error)}
        aria-describedby={helperText || error ? descriptionId : undefined}
        className={clsx(
          "relative flex min-h-12 items-center rounded-md border bg-transparent p-1.5 transition-colors",
          disabled && "opacity-60 cursor-not-allowed bg-[var(--color-accent-soft)]/20",
          !disabled &&
            "focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]",
          error
            ? "border-[var(--color-danger)] focus-within:border-[var(--color-danger)] focus-within:ring-[var(--color-danger)]"
            : "border-[var(--color-border-strong)]",
          className,
        )}
        {...props}
      >
        {label && (
          <span className="pointer-events-none absolute -top-2 left-3 bg-[var(--color-bg-elevated)] px-1 text-xs leading-none text-[var(--color-text-muted)]">
            {label}
            {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </span>
        )}

        <div className="flex w-full items-center gap-1">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option.value)}
                className={clsx(
                  "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                  disabled && "cursor-not-allowed",
                  isSelected
                    ? "bg-[var(--color-accent)] font-semibold text-white shadow-sm"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text)]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {(helperText || error) && (
        <p
          id={descriptionId}
          role={error ? "alert" : undefined}
          className={clsx(
            "mt-1 rounded-md px-2 py-1.5 text-xs",
            error
              ? "border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 font-medium text-[var(--color-danger)]"
              : "px-1 text-[var(--color-text-muted)]",
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default ChipSwitcher;