import { Landmark, Trash2 } from 'lucide-react';

const BankAccountList = ({ accounts, onDelete }) => {
  if (!accounts.length) {
    return <p className="text-sm text-(--color-text-muted)">No bank accounts submitted yet.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Submitted bank accounts">
      {accounts.map((account) => (
        <li key={account.id} className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) p-3">
          <div className="flex min-w-0 items-center gap-3">
            <Landmark size={18} className="shrink-0 text-(--color-accent)" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-(--color-text)">
                {account.bank_name}{account.is_primary ? ' · Primary' : ''}
              </p>
              <p className="truncate text-xs text-(--color-text-muted)">
                {account.account_holder_name} · ••••{String(account.account_number).slice(-4)}
              </p>
              <p className="text-xs text-(--color-text-muted)">{account.ifsc_code || 'No IFSC provided'}</p>
            </div>
          </div>
          <button type="button" aria-label={`Delete ${account.bank_name} account`} onClick={() => onDelete(account.id)} className="shrink-0 rounded p-1 text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            <Trash2 size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default BankAccountList;
