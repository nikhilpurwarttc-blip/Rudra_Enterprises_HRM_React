import { useState } from "react";
import { ArrowRight, Bell, Check, ClipboardCheck, RefreshCw, X, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useApprovePlantShutdownMutation,
  useGetAttendanceRosterQuery,
  useGetDashboardQuery,
  useGetPlantShutdownsQuery,
  useRejectPlantShutdownMutation,
} from "../store/api";
import usePermission from "../hooks/usePermission";
import PlantShutdownForm from "../pages/components/PlantShutdownForm";
import ConfirmDelete from "../components/ConfirmDelete";
import { useToast } from "../contexts/ToastContext";
import { getApiErrorMessage } from "../components/feedbackUtils";
import {
  getLocalDate,
  getPendingNotificationActions,
  getPendingShutdownCount,
  NOTIFICATION_ACTION_ROUTES,
} from "./notificationUtils";

const unwrap = (value) => (Array.isArray(value) ? value : value?.data ?? []);

const NotificationModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, isReadOnly } = usePermission();
  const today = getLocalDate();
  const canViewAttendance = can("attendance", "view");
  const canViewPlants = can("plants", "view");
  const canViewShutdowns = canViewPlants || can("plant-shutdowns", "view");
  const canApproveShutdown = !isReadOnly && can("plant-shutdowns", "approve");
  const canRejectShutdown = !isReadOnly && can("plant-shutdowns", "reject");
  const canViewDashboardActions = can("dashboard", "view")
    && Object.values(NOTIFICATION_ACTION_ROUTES)
      .some(({ permission }) => can(permission, "view"));
  const [shutdownDialog, setShutdownDialog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveShutdown, { isLoading: isApprovingShutdown }] = useApprovePlantShutdownMutation();
  const [rejectShutdown, { isLoading: isRejectingShutdown }] = useRejectPlantShutdownMutation();
  const {
    data: response,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetDashboardQuery({ period: "today" }, {
    skip: !isOpen || !canViewDashboardActions,
    refetchOnMountOrArgChange: true,
  });
  const {
    data: attendanceResponse,
    error: attendanceError,
    isLoading: isLoadingAttendance,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useGetAttendanceRosterQuery({ date: today, page: 1, per_page: 1 }, {
    skip: !isOpen || !canViewAttendance,
    refetchOnMountOrArgChange: true,
  });
  const {
    data: shutdownResponse,
    error: shutdownError,
    isLoading: isLoadingShutdowns,
    isFetching: isFetchingShutdowns,
    refetch: refetchShutdowns,
  } = useGetPlantShutdownsQuery({ status: 1, per_page: 10 }, {
    skip: !isOpen || !canViewShutdowns,
    refetchOnMountOrArgChange: true,
  });

  const attendancePendingCount = Number(attendanceResponse?.summary?.pending_verification ?? 0);
  const pendingActions = getPendingNotificationActions(
    response?.data,
    attendancePendingCount,
    can,
  );
  const pendingShutdowns = unwrap(shutdownResponse)
    .filter((shutdown) => Number(shutdown.status) === 1 && shutdown.id != null);
  const pendingShutdownTotal = getPendingShutdownCount(shutdownResponse, pendingShutdowns);
  const pendingCount = pendingActions.reduce(
    (total, action) => total + (Number(action.count) || 0),
    0,
  ) + pendingShutdownTotal;
  const isRefreshing = isFetching || isFetchingAttendance || isFetchingShutdowns;
  const isLoadingNotifications = (canViewDashboardActions && isLoading)
    || (canViewAttendance && isLoadingAttendance)
    || (canViewShutdowns && isLoadingShutdowns);

  const refreshNotifications = () => {
    if (canViewDashboardActions) refetch();
    if (canViewAttendance) refetchAttendance();
    if (canViewShutdowns) refetchShutdowns();
  };

  const closeNotification = () => {
    setShutdownDialog(null);
    setRejectionReason("");
    onClose();
  };

  const openAction = (path) => {
    closeNotification();
    navigate(path);
  };

  const handleApproveShutdown = async (form) => {
    const shutdown = shutdownDialog?.type === "approve" ? shutdownDialog.shutdown : null;
    if (!canApproveShutdown || Number(shutdown?.status) !== 1) return;
    try {
      await approveShutdown({
        id: shutdown.id,
        plant_id: shutdown.plant_id,
        ...form,
        reason: form.reason.trim(),
        shutdown_type: shutdown.shutdown_type ?? "Plant shutdown",
      }).unwrap();
      setShutdownDialog(null);
      toast("Plant shutdown approved and declared.", "success");
    } catch (approvalError) {
      toast(getApiErrorMessage(approvalError, "Unable to approve this plant shutdown."), "error");
    }
  };

  const handleRejectShutdown = async () => {
    const reason = rejectionReason.trim();
    const shutdown = shutdownDialog?.type === "reject" ? shutdownDialog.shutdown : null;
    if (!canRejectShutdown || Number(shutdown?.status) !== 1 || !reason) return;
    try {
      await rejectShutdown({ id: shutdown.id, remarks: reason }).unwrap();
      setShutdownDialog(null);
      setRejectionReason("");
      toast("Plant shutdown request rejected.", "success");
    } catch (rejectionError) {
      toast(getApiErrorMessage(rejectionError, "Unable to reject this plant shutdown."), "error");
    }
  };

  return (
    <>
      {isOpen && !shutdownDialog && (
        <div className="fixed inset-0 bottom-0 top-12 -right-9 z-100 flex items-start justify-end overflow-hidden">
          <div
            className="absolute inset-0"
            onClick={closeNotification}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            className="relative mr-2 w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/20 shadow-2xl backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-top-2 sm:mr-12 md:mr-45"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
              <h3 id="notification-title" className="text-sm font-semibold text-[var(--color-text)]">
                Notifications
              </h3>
              <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={refreshNotifications}
                  disabled={isRefreshing}
                  aria-label="Refresh notifications"
                  title="Refresh notifications"
                  className="p-1 hover:scale-110 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={closeNotification}
                  aria-label="Close notifications"
                  className="p-1 hover:scale-110"
                >
                  <X size={16} className="text-gray-500 hover:text-red-500" />
                </button>
              </div>
            </div>
            <section className="max-h-[min(70vh,28rem)] overflow-y-auto p-2.5" aria-labelledby="needs-attention-title" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <h4 id="needs-attention-title" className="text-[13px] font-semibold text-[var(--color-text)]">
                    Needs Your Attention
                  </h4>
                </div>
                {!isLoadingNotifications && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {pendingCount} Pending
                  </span>
                )}
              </div>

              {isLoadingNotifications ? (
                <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">Loading approvals…</p>
              ) : pendingActions.length === 0
                && pendingShutdowns.length === 0
                && !error && !attendanceError && !shutdownError ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <Bell size={18} className="mb-1.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                  <p className="text-xs font-medium text-[var(--color-text)]">You’re all caught up</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {(error || attendanceError || shutdownError) && (
                    <li role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-2.5 py-2 text-[11px] text-[var(--color-danger)]">
                      {error?.data?.message
                        ?? attendanceError?.data?.message
                        ?? shutdownError?.data?.message
                        ?? "Some approvals could not be loaded. Refresh to retry."}
                    </li>
                  )}
                  {pendingActions.map((action) => {
                    const destination = NOTIFICATION_ACTION_ROUTES[action.type];
                    const count = Number(action.count) || 0;

                    return (
                      <li
                        key={action.type}
                        className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[var(--color-text)]">
                            {action.title ?? "Approval required"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                            {count} pending item{count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openAction(destination.path)}
                          aria-label={`Review ${action.title ?? "approval"}`}
                          className="inline-flex shrink-0 items-center text-[var(--color-accent)] hover:scale-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        >
                          <ArrowRight size={12} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                  {canViewShutdowns && pendingShutdowns.length > 0 && (
                    <li className="space-y-1.5 ">
                      {pendingShutdowns.map((shutdown) => (
                        <div
                          key={shutdown.id}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-2.5 py-2"
                        >
                          <p className="truncate text-xs font-semibold text-[var(--color-text)]">
                            Plant shutdown pending approval
                            <span className="font-normal text-[var(--color-text-muted)]">
                              {" · "}{shutdown.plant?.name ?? shutdown.plant_name ?? `Plant ${shutdown.plant_id}`}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                            {String(shutdown.shutdown_start_date ?? "").slice(0, 10)}
                            {shutdown.shutdown_end_date
                              && String(shutdown.shutdown_end_date).slice(0, 10) !== String(shutdown.shutdown_start_date ?? "").slice(0, 10)
                              ? ` – ${String(shutdown.shutdown_end_date).slice(0, 10)}`
                              : ""}
                            {shutdown.reason ? ` · ${shutdown.reason}` : ""}
                          </p>
                          <div className="mt-2 flex items-center justify-end gap-[1px]">
                            {canApproveShutdown && (
                              <button
                                type="button"
                                title="Approve This Plant Shutdown Request"
                                onClick={() => {
                                  setShutdownDialog({ type: "approve", shutdown });
                                }}
                                disabled={isApprovingShutdown || isRejectingShutdown}
                                className="inline-flex items-center gap-1 rounded-l-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-xl shadow-emerald-400 disabled:opacity-50"
                              >
                                <Check size={14} aria-hidden="true" />
                              </button>
                            )}
                            {canRejectShutdown && (
                              <button
                                type="button"
                                title="Reject This Plant Shutdown Request"
                                onClick={() => {
                                  setShutdownDialog({ type: "reject", shutdown });
                                  setRejectionReason("");
                                }}
                                disabled={isApprovingShutdown || isRejectingShutdown}
                                className="inline-flex items-center gap-1 rounded-r-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 shadow-xl shadow-red-400 disabled:opacity-50"
                              >
                                <XCircle size={14} aria-hidden="true" />
                              </button>
                            )}
                            {canViewPlants && (
                              <button
                                type="button"
                                title="View Request"
                                onClick={() => openAction("/plants")}
                                className="pl-2 text-[var(--color-accent)] hover:scale-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                              >
                                <ArrowRight size={13} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {pendingShutdownTotal > pendingShutdowns.length && canViewPlants && (
                        <button
                          type="button"
                          onClick={() => openAction("/plants")}
                          className="w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold text-[var(--color-accent)] hover:scale-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        >
                          View all {pendingShutdownTotal} shutdown requests
                        </button>
                      )}
                    </li>
                  )}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
      {shutdownDialog?.type === "approve" && (
        <PlantShutdownForm
          key={`notification-approve-shutdown-${shutdownDialog.shutdown.id}`}
          isOpen
          mode="approve"
          initialValues={shutdownDialog.shutdown}
          saving={isApprovingShutdown}
          onClose={() => setShutdownDialog(null)}
          onSubmit={handleApproveShutdown}
        />
      )}
      <ConfirmDelete
        isOpen={shutdownDialog?.type === "reject"}
        title="Reject shutdown request"
        message="Provide a reason for rejecting this plant shutdown request."
        confirmLabel="Reject request"
        confirmLoadingLabel="Rejecting…"
        confirmClass="bg-red-600 hover:bg-red-700"
        confirmDisabled={!rejectionReason.trim() || isRejectingShutdown}
        icon={XCircle}
        onConfirm={handleRejectShutdown}
        onCancel={() => {
          setShutdownDialog(null);
          setRejectionReason("");
        }}
      >
        <label className="block text-sm font-medium text-(--color-text)">
          Rejection reason
          <textarea
            autoFocus
            required
            rows={3}
            maxLength={500}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            className="mt-1 w-full rounded-md border border-(--color-border-strong) bg-transparent px-3 py-2 text-sm font-normal text-(--color-text) focus:border-(--color-accent) focus:outline-none"
          />
        </label>
      </ConfirmDelete>
    </>
  );
};

export default NotificationModal;