import InputField from '../../../components/InputField';
import SectionCard from '../../../components/SectionCard';

const EmployeeContactDetails = ({ form, errors, setField }) => {
  const handleMobileChange = (event) => {
    const mobileNumber = event.target.value.replace(/\D/g, '').slice(0, 10);
    setField('mobile_number')({ target: { type: 'tel', value: mobileNumber } });
  };

  return (
    <SectionCard title="Contact details">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <InputField label="Mobile number" type="tel" inputMode="numeric" maxLength={10} value={form.mobile_number} onChange={handleMobileChange} error={errors.mobile_number} required />
        <InputField label="Email address" type="email" value={form.email} onChange={setField('email')} error={errors.email} />
        <InputField label="Address" value={form.address} onChange={setField('address')} error={errors.address} />
      </div>
    </SectionCard>
  );
};

export default EmployeeContactDetails;
