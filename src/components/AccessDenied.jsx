import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

const AccessDenied = ({ pageName = 'this page', routePath, noAccessAtAll = false }) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/80 p-6 sm:p-8 text-center shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400 ring-8 ring-red-500/5">
          <ShieldAlert size={32} aria-hidden="true" />
        </div>

        <span className="inline-block rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
          403 Forbidden
        </span>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Access Denied
        </h2>

        <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
          {noAccessAtAll ? (
            <>Your account currently does not have any assigned module permissions. Please contact your system administrator to assign role permissions.</>
          ) : (
            <>
              You do not have permission to view <span className="font-semibold text-[var(--color-text)]">{pageName}</span>
              {routePath ? <code className="block mt-1 text-xs text-[var(--color-text-muted)] opacity-80">{routePath}</code> : ''}.
              Please contact your administrator if you need access.
            </>
          )}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>

          {!noAccessAtAll && (
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              <Home size={16} />
              Return Home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;

