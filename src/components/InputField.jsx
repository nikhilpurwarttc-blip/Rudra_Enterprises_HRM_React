import { useId, useState } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";

const InputField = ({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  helperText,
  error,
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="w-auto">
      <div
        className={clsx(
          "relative flex min-h-12 items-center rounded-md border bg-transparent px-3 transition-colors",
          disabled && "opacity-60 cursor-not-allowed bg-[var(--color-accent-soft)]/20",
          !disabled && "focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]",
          error ? "border-[var(--color-danger)] focus-within:border-[var(--color-danger)] focus-within:ring-[var(--color-danger)]" : "border-[var(--color-border-strong)]",
          className,
        )}
      >
        {label && (
          <label
            htmlFor={inputId}
            className="pointer-events-none absolute -top-2 left-3 bg-[var(--color-bg-elevated)] px-1 text-xs leading-none text-[var(--color-text-muted)]"
          >
            {label}{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}
        {leftIcon && <span className="mr-2 shrink-0 text-[var(--color-text-muted)]">{leftIcon}</span>}
        <input
          id={inputId}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={helperText || error ? descriptionId : undefined}
          className={clsx(
            "min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]",
            disabled && "cursor-not-allowed text-[var(--color-text-muted)]",
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="ml-2 shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : rightIcon ? <span className="ml-2 shrink-0 text-[var(--color-text-muted)]">{rightIcon}</span> : null}
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

export default InputField;
