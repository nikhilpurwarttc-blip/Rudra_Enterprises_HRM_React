import { Trash2 } from 'lucide-react';
import Button from '../../../components/Button';
import EmployeeAdditionalDetails from './EmployeeAdditionalDetails';
import EmployeeContactDetails from './EmployeeContactDetails';
import EmployeeEmploymentDetails from './EmployeeEmploymentDetails';
import EmployeePersonalDetails from './EmployeePersonalDetails';

const EmployeeDetailsSection = ({
  form,
  errors,
  plants,
  departments,
  designations,
  shifts,
  charges,
  setField,
  selectField,
  updateForm,
  onSubmit,
  onClearDraft,
  saving,
}) => (
  <div className="space-y-4">
    <div data-employee-section="personal">
      <EmployeePersonalDetails
        form={form}
        errors={errors}
        setField={setField}
        setGender={selectField('gender')}
        setMaritalStatus={selectField('marital_status')}
      />
    </div>
    <div data-employee-section="employment">
      <EmployeeEmploymentDetails
        form={form}
        errors={errors}
        plants={plants}
        departments={departments}
        designations={designations}
        shifts={shifts}
        setField={setField}
        selectField={selectField}
      />
    </div>
    <div data-employee-section="contact">
      <EmployeeContactDetails form={form} errors={errors} setField={setField} />
    </div>
    <div data-employee-section="extras">
      <EmployeeAdditionalDetails
        form={form}
        charges={charges}
        updateForm={updateForm}
        setField={setField}
      />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button type="button" variant="ghost" onClick={onClearDraft} className="flex items-center gap-2">
        <Trash2 size={15} /> Clear draft
      </Button>
      <Button type="button" onClick={onSubmit} disabled={saving}>
        {saving ? 'Saving employee details…' : 'Submit employee details'}
      </Button>
    </div>
  </div>
);

export default EmployeeDetailsSection;
