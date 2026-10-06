import { Save } from 'lucide-react';
import Button from '../../../components/Button';
import EmployeeApprovalActions from './EmployeeApprovalActions';

const EmployeeFormHeader = ({ employee, draftSavedAt, onSaveDraft, onClose }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Employee Management</p>
      <h2 className="text-xl font-semibold text-(--color-text)">
        {employee?.id ? `Edit — ${employee.name}` : 'Add Employee'}
      </h2>
      <p className="mt-1 text-xs text-(--color-text-muted)" aria-live="polite">
        {draftSavedAt ? `Draft saved ${draftSavedAt}` : 'Drafts stay on this device'}
      </p>
      <div className="mt-2">
        <EmployeeApprovalActions employee={employee} />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" onClick={onSaveDraft} className="flex items-center gap-2">
        <Save size={15} /> Save draft
      </Button>
      <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
    </div>
  </div>
);

export default EmployeeFormHeader;
