import Chip from './Chip';
import { InlineError } from './Feedback';

const ChoiceChips = ({
  label,
  value,
  options,
  onChange,
  error,
  disabled = false,
  icon: Icon,
  multiple = false,
}) => (
  <fieldset>
    <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-(--color-text)">
      {Icon && <Icon size={14} className="text-(--color-accent)" />}
      {label}
    </legend>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const normalizedOption = typeof option === 'object' && option !== null
          ? option
          : { value: option, label: option };
        const selectedValues = Array.isArray(value) ? value : [value];
        const selected = multiple
          ? selectedValues.includes(normalizedOption.value)
          : value === normalizedOption.value;
        const handleClick = () => {
          if (!multiple) {
            onChange(normalizedOption.value);
            return;
          }
          onChange(
            selected
              ? selectedValues.filter((selectedValue) => selectedValue !== normalizedOption.value)
              : [...selectedValues.filter((selectedValue) => selectedValue !== ''), normalizedOption.value],
          );
        };
        return (
          <Chip
            key={normalizedOption.value}
            selected={selected}
            disabled={disabled || normalizedOption.disabled}
            onClick={handleClick}
          >
            {normalizedOption.labelNode ?? normalizedOption.label}
          </Chip>
        );
      })}
    </div>
    <InlineError message={error} className="mt-1" />
  </fieldset>
);

export default ChoiceChips;
