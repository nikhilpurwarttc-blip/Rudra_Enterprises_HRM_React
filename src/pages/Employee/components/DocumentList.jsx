import { ExternalLink, FileCheck, Trash2 } from 'lucide-react';

const isSafeUrl = (url) => /^https?:\/\//i.test(String(url ?? ''));

const DocumentList = ({ documents, onDelete }) => {
  if (!documents.length) {
    return <p className="text-sm text-(--color-text-muted)">No KYC documents submitted yet.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Submitted KYC documents">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) p-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileCheck size={18} className="shrink-0 text-(--color-accent)" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-(--color-text)">{document.document_type}</p>
              <p className="truncate text-xs text-(--color-text-muted)">{document.document_number}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {document.document_file && isSafeUrl(document.document_file) && (
              <a href={document.document_file} target="_blank" rel="noreferrer" aria-label={`View ${document.document_type}`} className="rounded text-(--color-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)">
                <ExternalLink size={16} />
              </a>
            )}
            <button type="button" aria-label={`Delete ${document.document_type}`} onClick={() => onDelete(document.id)} className="rounded p-1 text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              <Trash2 size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DocumentList;
