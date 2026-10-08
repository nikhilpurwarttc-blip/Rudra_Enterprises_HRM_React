import SearchableSelect from '../../../components/SearchableSelect';
import SectionCard from '../../../components/SectionCard';
import UploadField from '../../../components/UploadField';

const EmployeeAdditionalDetails = ({ form, charges, updateForm, setField }) => (
  <SectionCard title="Photo and allowances">
    <div className="space-y-4">
      <UploadField
        label="Employee photo"
        value={form.image}
        onChange={(image) => updateForm((current) => ({ ...current, image }))}
        accept="image/jpeg,image/png,image/jpg"
        maxSize={2 * 1024 * 1024}
        previewOnSelect
      />
      <SearchableSelect
        label="Charges & allowances"
        options={charges}
        value={form.charge_ids}
        onChange={(value) => updateForm((current) => ({ ...current, charge_ids: value }))}
        multiSelect
        placeholder="Select charges"
      />
      <label className="flex items-center gap-2 text-sm text-(--color-text)">
        <input type="checkbox" checked={form.status === 1} onChange={setField('status')} className="h-4 w-4 accent-primary-600" />
        Active employee
      </label>
    </div>
  </SectionCard>
);

export default EmployeeAdditionalDetails;
