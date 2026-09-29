import InputField from '../../../components/InputField';
import SectionCard from '../../../components/SectionCard';

const EmployeeContactDetails = ({ form, errors, setField }) => (
  <SectionCard title="Contact details">
    <div className="space-y-4">
      <InputField label="Mobile number" value={form.mobile_number} onChange={setField('mobile_number')} error={errors.mobile_number} />
      <InputField label="Email address" type="email" value={form.email} onChange={setField('email')} error={errors.email} />
      <InputField label="Address" value={form.address} onChange={setField('address')} error={errors.address} />
    </div>
  </SectionCard>
);

export default EmployeeContactDetails;
