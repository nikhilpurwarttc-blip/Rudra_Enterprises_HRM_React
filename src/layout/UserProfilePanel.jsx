import { BriefcaseBusiness, Mail, ShieldCheck, UserRound, UserRoundCog } from 'lucide-react';
import RightModal from '../pages/components/RightModal';
import Button from '../components/Button';

const UserProfilePanel = ({ user, roleName, isOpen, onClose, onNavigate, onLogout }) => {
  if (!user) return null;

  const employee = user.employee;
  const displayRole = roleName || user.role?.name || 'User';

  return (
    <RightModal isOpen={isOpen} onClose={onClose} title="My Profile" settingoff={false} bodyClassName="space-y-5">
      <div className="flex items-center gap-3 border-b border-(--color-border) pb-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-white">
          <UserRound size={25} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-(--color-text)">{user.name || 'User'}</h3>
          <p className="text-sm capitalize text-(--color-text-muted)">{displayRole}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Account details</p>
        <div className="divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
          <div className="flex items-center gap-3 px-3 py-3">
            <UserRoundCog size={17} className="shrink-0 text-(--color-accent)" />
            <div className="min-w-0">
              <p className="text-xs text-(--color-text-muted)">Username</p>
              <p className="truncate text-sm text-(--color-text)">{user.username || 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-3">
            <Mail size={17} className="shrink-0 text-(--color-accent)" />
            <div className="min-w-0">
              <p className="text-xs text-(--color-text-muted)">Email</p>
              <p className="truncate text-sm text-(--color-text)">{user.email || 'No email added'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-3">
            <ShieldCheck size={17} className="shrink-0 text-(--color-accent)" />
            <div className="min-w-0">
              <p className="text-xs text-(--color-text-muted)">Access role</p>
              <p className="truncate text-sm capitalize text-(--color-text)">{displayRole}</p>
            </div>
          </div>
        </div>
      </div>

      {employee && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Linked employee</p>
          <div className="rounded-lg border border-(--color-border) p-3">
            <div className="flex items-start gap-3">
              <BriefcaseBusiness size={18} className="mt-0.5 shrink-0 text-(--color-accent)" />
              <div className="min-w-0">
                <p className="font-medium text-(--color-text)">{employee.name || user.name}</p>
                <p className="mt-1 text-xs text-(--color-text-muted)">
                  {employee.employee_code || 'No employee ID'}{employee.designation?.name ? ` · ${employee.designation.name}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-(--color-border) pt-4">
        {employee?.id && (
          <Button type="button" variant="ghost" onClick={() => { onClose(); onNavigate(`/employees/${employee.id}`); }} className="flex w-full items-center justify-center gap-2">
            <BriefcaseBusiness size={16} /> View employee profile
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => { onClose(); onNavigate('/'); }} className="flex w-full items-center justify-center gap-2">
          <UserRound size={16} /> Go to dashboard
        </Button>
        <Button type="button" variant="ghost" onClick={onLogout} className="flex w-full items-center justify-center gap-2 !border-[var(--color-danger)] !text-[var(--color-danger)]">
          <ShieldCheck size={16} /> Sign out
        </Button>
      </div>
    </RightModal>
  );
};

export default UserProfilePanel;
