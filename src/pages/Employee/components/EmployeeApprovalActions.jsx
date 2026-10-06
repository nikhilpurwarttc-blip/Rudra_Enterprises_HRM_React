import { useState } from 'react';
import { Check, X } from 'lucide-react';
import ConfirmDelete from '../../../components/ConfirmDelete';
import { useToast } from '../../../contexts/ToastContext';
import usePermission from '../../../hooks/usePermission';
import { useApproveEmployeeMutation, useRejectEmployeeMutation } from '../../../store/api';
import { getApiErrorMessage } from '../../../components/feedbackUtils';

const EmployeeApprovalActions = ({ employee }) => {
  const toast = useToast();
  const { can, isReadOnly } = usePermission('/employees');
  const [approveEmployee, { isLoading: approving }] = useApproveEmployeeMutation();
  const [rejectEmployee, { isLoading: rejecting }] = useRejectEmployeeMutation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [decisionOverride, setDecisionOverride] = useState(null);

  if (!employee?.id || employee.approval_status == null) return null;

  const override = decisionOverride?.id === employee.id ? decisionOverride : null;
  const status = Number(override?.status ?? employee.approval_status);
  const rejectionReason = override ? override.reason : employee.rejection_reason;
  const statusLabel = employee.approval_status_label
    ?? (status === 1 ? 'Approved' : status === 2 ? 'Rejected' : 'Pending approval');
  const canApprove = !isReadOnly && can('approve');
  const canReject = !isReadOnly && can('reject');

  const handleApprove = async () => {
    try {
      const response = await approveEmployee(employee.id).unwrap();
      setDecisionOverride({ id: employee.id, status: 1, reason: null });
      toast(response?.message ?? 'Employee approved successfully.', 'success');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to approve this employee.'), 'error');
    }
  };

  const handleReject = async () => {
    try {
      const response = await rejectEmployee({ id: employee.id, reason: reason.trim() }).unwrap();
      setDecisionOverride({ id: employee.id, status: 2, reason: reason.trim() });
      toast(response?.message ?? 'Employee rejected successfully.', 'success');
      setRejectOpen(false);
      setReason('');
    } catch (error) {
      toast(getApiErrorMessage(error, 'Unable to reject this employee.'), 'error');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status != 1 && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 1
            ? 'bg-emerald-100 text-emerald-700'
            : status === 2
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-800'
          }`}>
          {statusLabel}
        </span>
        }
        {status === 2 && rejectionReason && (
          <span className="text-xs text-red-700 dark:text-red-300" title={rejectionReason}>
            Reason: {rejectionReason}
          </span>
        )}
        {status === 0 && canApprove && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check size={14} /> {approving ? 'Approving…' : 'Approve'}
          </button>
        )}
        {status === 0 && canReject && (
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={approving || rejecting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={14} /> Reject
          </button>
        )}
      </div>

      <ConfirmDelete
        isOpen={rejectOpen}
        title="Reject employee request"
        message={`Provide a reason for rejecting ${employee.name}'s employee request.`}
        confirmLabel="Reject request"
        confirmLoadingLabel="Rejecting…"
        confirmClass="bg-red-600 hover:bg-red-700"
        confirmDisabled={!reason.trim() || rejecting}
        onConfirm={handleReject}
        onCancel={() => {
          setRejectOpen(false);
          setReason('');
        }}
        icon={X}
      >
        <label htmlFor={`employee-rejection-reason-${employee.id}`} className="mb-1 block text-sm font-medium text-(--color-text)">
          Rejection reason <span className="text-red-600">*</span>
        </label>
        <textarea
          id={`employee-rejection-reason-${employee.id}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={3}
          required
          className="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
        />
      </ConfirmDelete>
    </>
  );
};

export default EmployeeApprovalActions;
