import { Plus } from 'lucide-react';
import Button from '../../../components/Button';
import { LoadingState } from '../../../components/Feedback';
import InputField from '../../../components/InputField';
import SectionCard from '../../../components/SectionCard';
import BankAccountList from './BankAccountList';

const EmployeeAccountsSection = ({
  employeeId,
  accounts,
  isLoading = false,
  accountDraft,
  setAccountDraft,
  saving,
  onSave,
  onDelete,
  onGoToDetails,
}) => {
  if (!employeeId) {
    return (
      <SectionCard title="Bank accounts">
        <p className="text-sm text-(--color-text-muted)">
          Submit employee details first, then add bank account details.
        </p>
        <Button type="button" variant="ghost" onClick={onGoToDetails} className="mt-3">
          Go to employee details
        </Button>
      </SectionCard>
    );
  }

  const handleAccountFieldChange = (field) => (event) => {
    setAccountDraft(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
  };

  return (
    <div className="space-y-4">
      <SectionCard title={`Bank accounts · ${accounts.length} submitted`}>
        {isLoading ? (
          <LoadingState message="Loading bank accounts…" />
        ) : (
          <BankAccountList accounts={accounts} onDelete={onDelete} />
        )}
      </SectionCard>

      <SectionCard title="Add bank account">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Bank name" value={accountDraft.bank_name} onChange={handleAccountFieldChange('bank_name')} required />
          <InputField label="Account holder name" value={accountDraft.account_holder_name} onChange={handleAccountFieldChange('account_holder_name')} required />
          <InputField label="Account number" value={accountDraft.account_number} onChange={handleAccountFieldChange('account_number')} required />
          <InputField label="IFSC code" value={accountDraft.ifsc_code} onChange={handleAccountFieldChange('ifsc_code')} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-(--color-text)">
          <input
            type="checkbox"
            checked={accountDraft.is_primary}
            onChange={handleAccountFieldChange('is_primary')}
            className="h-4 w-4 accent-primary-600"
          />
          Primary account
        </label>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={saving} className="flex items-center gap-2">
          <Plus size={15} /> {saving ? 'Submitting account…' : 'Submit bank account'}
        </Button>
      </div>
    </div>
  );
};

export default EmployeeAccountsSection;
