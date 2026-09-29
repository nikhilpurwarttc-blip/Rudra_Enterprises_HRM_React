import InputField from '../../../components/InputField';
import SearchableSelect from '../../../components/SearchableSelect';
import SectionCard from '../../../components/SectionCard';

const EmployeeEmploymentDetails = ({ form, errors, plants, departments, designations, shifts, setField, selectField }) => (
  <SectionCard title="Employment assignment">
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="Joining date" type="date" value={form.joining_date} onChange={setField('joining_date')} error={errors.joining_date} />
      <SearchableSelect label="Plant" options={plants} value={String(form.plant_id)} onChange={selectField('plant_id')} placeholder="Select plant" error={errors.plant_id} />
      <SearchableSelect label="Department" options={departments} value={String(form.department_id)} onChange={selectField('department_id')} placeholder="Select department" error={errors.department_id} />
      <SearchableSelect label="Designation" options={designations} value={String(form.designation_id)} onChange={selectField('designation_id')} placeholder="Select designation" error={errors.designation_id} />
      <SearchableSelect label="Shift" options={shifts} value={String(form.shift_id)} onChange={selectField('shift_id')} placeholder="Select shift" error={errors.shift_id} />
    </div>
  </SectionCard>
);

export default EmployeeEmploymentDetails;
