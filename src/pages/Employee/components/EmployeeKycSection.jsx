import { Plus } from 'lucide-react';
import Button from '../../../components/Button';
import { LoadingState } from '../../../components/Feedback';
import InputField from '../../../components/InputField';
import SearchableSelect from '../../../components/SearchableSelect';
import SectionCard from '../../../components/SectionCard';
import UploadField from '../../../components/UploadField';
import { DOCUMENT_TYPE_OPTIONS } from '../utils/employeeForm.constants';
import DocumentList from './DocumentList';

const EmployeeKycSection = ({
  employeeId,
  documents,
  isLoading = false,
  documentDraft,
  setDocumentDraft,
  saving,
  onSave,
  onDelete,
  onGoToDetails,
}) => {
  if (!employeeId) {
    return (
      <SectionCard title="KYC / Documents">
        <p className="text-sm text-(--color-text-muted)">
          Submit employee details first, then add KYC documents.
        </p>
        <Button type="button" variant="ghost" onClick={onGoToDetails} className="mt-3">
          Go to employee details
        </Button>
      </SectionCard>
    );
  }

  const handleDocumentTypeChange = (documentType) => {
    setDocumentDraft('document_type', documentType);
  };

  const handleDocumentNumberChange = (event) => {
    setDocumentDraft('document_number', event.target.value);
  };

  const handleDocumentFileChange = (documentFile) => {
    setDocumentDraft('document_file', documentFile);
  };

  return (
    <div className="space-y-4">
      <SectionCard title={`KYC documents · ${documents.length} submitted`}>
        {isLoading ? (
          <LoadingState message="Loading KYC documents…" />
        ) : (
          <DocumentList documents={documents} onDelete={onDelete} />
        )}
      </SectionCard>

      <SectionCard title="Add KYC document">
        <div className="grid gap-4 sm:grid-cols-2">
          <SearchableSelect
            label="Document type"
            options={DOCUMENT_TYPE_OPTIONS}
            value={documentDraft.document_type}
            onChange={handleDocumentTypeChange}
            placeholder="Select document type"
            required
          />
          <InputField
            label="Document number"
            value={documentDraft.document_number}
            onChange={handleDocumentNumberChange}
            placeholder="Enter document number"
            required
          />
        </div>
        <UploadField
          className="mt-4"
          label="Document file"
          value={documentDraft.document_file}
          onChange={handleDocumentFileChange}
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          maxSize={5 * 1024 * 1024}
          helperText="JPG, PNG, or PDF up to 5 MB"
        />
      </SectionCard>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={saving} className="flex items-center gap-2">
          <Plus size={15} /> {saving ? 'Submitting document…' : 'Submit KYC document'}
        </Button>
      </div>
    </div>
  );
};

export default EmployeeKycSection;
