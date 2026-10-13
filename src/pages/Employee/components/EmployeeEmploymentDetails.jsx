import InputField from '../../../components/InputField';
import SearchableSelect from '../../../components/SearchableSelect';
import SectionCard from '../../../components/SectionCard';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EmployeeEmploymentDetails = ({ form, errors, plants, departments, designations, shifts, setField, selectField, updateForm }) => (
  <SectionCard title="Employment assignment">
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="Joining date" type="date" value={form.joining_date} onChange={setField('joining_date')} error={errors.joining_date} />
      <SearchableSelect label="Plant" options={plants} value={String(form.plant_id)} onChange={selectField('plant_id')} placeholder="Select plant" error={errors.plant_id} />
      <SearchableSelect label="Department" options={departments} value={String(form.department_id)} onChange={selectField('department_id')} placeholder="Select department" error={errors.department_id} />
      <SearchableSelect label="Designation" options={designations} value={String(form.designation_id)} onChange={selectField('designation_id')} placeholder="Select designation" error={errors.designation_id} />
      <SearchableSelect label="Shift" options={shifts} value={String(form.shift_id)} onChange={selectField('shift_id')} placeholder="Select shift" error={errors.shift_id} />
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-(--color-text)">Weekly off days</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {WEEKDAYS.map((day, dayIndex) => (
            <label key={day} className="inline-flex items-center gap-2 text-sm text-(--color-text)">
              <input
                type="checkbox"
                checked={(form.weekly_off_days ?? []).includes(dayIndex)}
                onChange={(event) => updateForm((current) => ({
                  ...current,
                  weekly_off_days: event.target.checked
                    ? [...(current.weekly_off_days ?? []), dayIndex].sort((left, right) => left - right)
                    : (current.weekly_off_days ?? []).filter((value) => value !== dayIndex),
                }))}
                className="h-4 w-4 accent-primary-600"
              />
              {day}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-(--color-text-muted)">Unselected days are treated as scheduled working days in the attendance report.</p>
      </fieldset>
    </div>
  </SectionCard>
);

export default EmployeeEmploymentDetails;
