import { useState } from 'react';
import { InlineError } from '../../components/Feedback';
import EmployeeAccountsSection from './components/EmployeeAccountsSection';
import EmployeeDetailsSection from './components/EmployeeDetailsSection';
import EmployeeFormHeader from './components/EmployeeFormHeader';
import EmployeeKycSection from './components/EmployeeKycSection';
import EmployeeProgress from './components/EmployeeProgress';
import useEmployeeDraft from './hooks/useEmployeeDraft';
import useEmployeeForm from './hooks/useEmployeeForm';
import useEmployeeValidation from './hooks/useEmployeeValidation';
import { DETAIL_SECTIONS, EMPLOYEE_DRAFT_PREFIX, EMPLOYEE_STEPS } from './utils/employeeForm.constants';
import { buildSelectOptions, createEmployeePayload, normalizeEmployee } from './utils/employeeForm.utils';

const EMPTY_DOCUMENT = {
  document_type: '',
  document_number: '',
  document_file: null,
};

const EMPTY_ACCOUNT = {
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  account_holder_name: '',
  is_primary: false,
};

const AddEditEmployee = ({
  employee,
  plants = [],
  departments = [],
  designations = [],
  shifts = [],
  charges = [],
  documents = [],
  accounts = [],
  documentsLoading = false,
  accountsLoading = false,
  saving = false,
  savingDocument = false,
  savingAccount = false,
  errors: serverErrors = {},
  onClose,
  onSubmit,
  onSaveDocument,
  onDeleteDocument,
  onSaveAccount,
  onDeleteAccount,
}) => {
  const draftKey = `${EMPLOYEE_DRAFT_PREFIX}${employee?.id ?? 'new'}`;
  const draft = useEmployeeDraft(draftKey, normalizeEmployee(employee));
  const [clientErrors, setClientErrors] = useState({});
  const [clearedServerFields, setClearedServerFields] = useState(() => new Set());
  const [activeStep, setActiveStep] = useState('details');
  const [documentDraft, setDocumentDraft] = useState(EMPTY_DOCUMENT);
  const [accountDraft, setAccountDraft] = useState(EMPTY_ACCOUNT);
  const [stepError, setStepError] = useState('');
  const { validateEmployeeForm, clearFieldError, getFirstErrorSection } = useEmployeeValidation();

  const clearFieldErrors = (field) => {
    clearFieldError(field, setClientErrors);
    setClearedServerFields((current) => new Set(current).add(field));
  };

  const {
    form,
    updateForm,
    handleFieldChange,
    handleSelectChange,
    setSubmittedEmployee,
  } = useEmployeeForm(
    employee,
    draft.restoreDraft,
    draft.markDraftChanged,
    clearFieldErrors,
  );

  const employeeId = form.id ?? employee?.id;
  const visibleServerErrors = Object.fromEntries(
    Object.entries(serverErrors)
      .filter(([field]) => !clearedServerFields.has(field))
      .map(([field, message]) => [field, Array.isArray(message) ? message[0] : message]),
  );
  const fieldErrors = { ...visibleServerErrors, ...clientErrors };
  const selectOptions = {
    plants: buildSelectOptions(plants, (item) => item.name),
    departments: buildSelectOptions(departments, (item) => item.name),
    designations: buildSelectOptions(designations, (item) => item.name),
    shifts: buildSelectOptions(shifts, (item) => item.name),
    charges: buildSelectOptions(charges, (item) => item.name ?? item.deduction),
  };
  const steps = EMPLOYEE_STEPS.map((step) => ({
    ...step,
    complete: step.id === 'details'
      ? Boolean(employeeId)
      : step.id === 'kyc'
        ? documents.length > 0
        : accounts.length > 0,
  }));

  const scrollToFirstError = (validationErrors) => {
    const firstSection = getFirstErrorSection(validationErrors, DETAIL_SECTIONS);
    if (!firstSection) return;

    requestAnimationFrame(() => {
      document
        .querySelector(`[data-employee-section="${firstSection.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSaveDraft = () => {
    if (!draft.saveDraft(form)) {
      setStepError('Unable to save a draft in this browser.');
      return;
    }
    setStepError('');
  };

  const handleClearDraft = () => {
    draft.clearDraft();
    setStepError('');
  };

  const handleSubmitEmployee = async () => {
    const nextErrors = validateEmployeeForm(form);
    setClientErrors(nextErrors);
    setClearedServerFields(new Set());
    if (Object.keys(nextErrors).length) {
      scrollToFirstError(nextErrors);
      return;
    }

    setStepError('');
    const savedEmployee = await onSubmit(createEmployeePayload(form, employeeId));
    if (!savedEmployee) return;

    setSubmittedEmployee(savedEmployee);
    draft.clearDraft();
    setActiveStep('kyc');
  };

  const handleSaveDocument = async () => {
    if (!employeeId) {
      setStepError('Submit employee details before adding KYC documents.');
      return;
    }
    if (!documentDraft.document_type.trim() || !documentDraft.document_number.trim()) {
      setStepError('Document type and document number are required.');
      return;
    }

    setStepError('');
    const saved = await onSaveDocument({ employee_id: employeeId, ...documentDraft });
    if (saved) setDocumentDraft(EMPTY_DOCUMENT);
  };

  const handleSaveAccount = async () => {
    if (!employeeId) {
      setStepError('Submit employee details before adding account details.');
      return;
    }
    if (!accountDraft.bank_name.trim() || !accountDraft.account_number.trim() || !accountDraft.account_holder_name.trim()) {
      setStepError('Bank name, account number, and account holder name are required.');
      return;
    }

    setStepError('');
    const saved = await onSaveAccount({ employee_id: employeeId, ...accountDraft });
    if (saved) setAccountDraft(EMPTY_ACCOUNT);
  };

  const handleStepChange = (stepId) => {
    setActiveStep(stepId);
    setStepError('');
  };

  const handleDocumentFieldChange = (field, value) => {
    setDocumentDraft((current) => ({ ...current, [field]: value }));
    setStepError('');
  };

  const handleAccountFieldChange = (field, value) => {
    setAccountDraft((current) => ({ ...current, [field]: value }));
    setStepError('');
  };

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="border-b border-(--color-border) px-5 py-4">
        <EmployeeFormHeader
          employee={employee ?? form}
          draftSavedAt={draft.draftSavedAt}
          onSaveDraft={handleSaveDraft}
          onClose={onClose}
        />
        <EmployeeProgress steps={steps} activeStep={activeStep} onStepChange={handleStepChange} />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-3xl space-y-4">
          {activeStep === 'details' && (
            <EmployeeDetailsSection
              form={form}
              errors={fieldErrors}
              plants={selectOptions.plants}
              departments={selectOptions.departments}
              designations={selectOptions.designations}
              shifts={selectOptions.shifts}
              charges={selectOptions.charges}
              setField={handleFieldChange}
              selectField={handleSelectChange}
              updateForm={updateForm}
              onSubmit={handleSubmitEmployee}
              onClearDraft={handleClearDraft}
              saving={saving}
            />
          )}
          {activeStep === 'kyc' && (
            <EmployeeKycSection
              employeeId={employeeId}
              documents={documents}
              isLoading={documentsLoading}
              documentDraft={documentDraft}
              setDocumentDraft={handleDocumentFieldChange}
              saving={savingDocument}
              onSave={handleSaveDocument}
              onDelete={onDeleteDocument}
              onGoToDetails={() => handleStepChange('details')}
            />
          )}
          {activeStep === 'accounts' && (
            <EmployeeAccountsSection
              employeeId={employeeId}
              accounts={accounts}
              isLoading={accountsLoading}
              accountDraft={accountDraft}
              setAccountDraft={handleAccountFieldChange}
              saving={savingAccount}
              onSave={handleSaveAccount}
              onDelete={onDeleteAccount}
              onGoToDetails={() => handleStepChange('details')}
            />
          )}
          {stepError && <InlineError message={stepError} className="rounded-md border border-red-500/30 bg-red-500/10 p-3" />}
        </div>
      </main>
    </div>
  );
};

export default AddEditEmployee;
