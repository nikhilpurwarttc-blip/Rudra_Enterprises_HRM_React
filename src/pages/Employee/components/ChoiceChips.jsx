import Chip from '../../../components/Chip';
import { InlineError } from '../../../components/Feedback';

const ChoiceChips = ({ label, value, options, onChange, error }) => (
  <fieldset>
    <legend className="mb-2 text-sm font-medium text-(--color-text)">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip key={option} selected={value === option} onClick={() => onChange(option)}>
          {option}
        </Chip>
      ))}
    </div>
    <InlineError message={error} className="mt-1" />
  </fieldset>
);

export default ChoiceChips;
