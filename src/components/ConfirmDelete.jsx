import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

const ConfirmDelete = ({
  isOpen,
  onConfirm,
  onCancel,
  onReject,
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  title = 'Confirm Delete',
  confirmLabel,
  confirmClass,
  rejectLabel,
  rejectClass,
  icon,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isDelete = !confirmLabel;
  const btnClass = confirmClass ?? 'bg-red-600 hover:bg-red-700';
  const BtnIcon  = icon ?? Trash2;
  const label    = confirmLabel ?? 'Delete';
  const loadingLabel = isDelete ? 'Deleting…' : `${label}ing…`;

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); }
    finally { setLoading(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="glass-card relative mx-4 w-full max-w-sm rounded-2xl border-(--color-border) bg-(--color-surface-strong) shadow-(--shadow-card)">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${isDelete ? 'bg-red-500/10 text-red-600 dark:text-red-300' : 'bg-green-500/10 text-green-600 dark:text-green-300'}`}>
              <BtnIcon size={18} />
            </div>
            <h3 className="text-base font-semibold text-(--color-text)">{title}</h3>
          </div>
          <button onClick={loading ? undefined : onCancel} disabled={loading} className="text-(--color-text-muted) hover:text-(--color-accent) disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <p className="px-5 pb-5 text-sm text-(--color-text-muted)">{message}</p>

        <div className="flex gap-3 px-5 pb-5 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="rounded-lg border border-(--color-border-strong) px-4 py-2 text-sm text-(--color-text) hover:bg-(--color-accent-soft) disabled:cursor-not-allowed disabled:opacity-40">
            Cancel
          </button>
          {onReject && (
            <button onClick={onReject} disabled={loading}
              className={`flex min-w-22.5 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 ${rejectClass}`}>
              {rejectLabel ?? 'Reject'}
            </button>
          )}
          <button onClick={handleConfirm} disabled={loading}
            className={`flex min-w-22.5 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 ${btnClass}`}>
            {loading
              ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {loadingLabel}</>
              : <><BtnIcon size={14} /> {label}</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDelete;
