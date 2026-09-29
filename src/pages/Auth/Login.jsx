import { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setCredentials, selectIsAuthenticated } from '../../store/authSlice';
import { api, useLoginMutation } from '../../store/api';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import GlassCard from '../../components/GlassCard';
import ThemeToggle from '../../components/ThemeToggle';
import { useToast } from '../../contexts/ToastContext';
import { CSRF_URL } from '../../config/config';

const validateForm = ({ username, password }) => {
  const errors = {};
  if (!username.trim()) errors.username = 'Username is required.';
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const toast = useToast();
  const [login, { isLoading, error, reset: resetLogin }] = useLoginMutation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(form);

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast('Please correct the highlighted fields.', 'error');
      return;
    }

    try {
      await fetch(CSRF_URL, { credentials: 'include' });
      const response = await login(form).unwrap();
      dispatch(api.util.resetApiState());
      dispatch(setCredentials({ user: response.user }));
      navigate(location.state?.from || '/', { replace: true });
    } catch {
      // RTK Query exposes the Laravel response through `error` below.
      toast('Sign in failed. Check your details and try again.', 'error');
    }
  };

  const validateField = (field, value) => {
    const fieldErrors = validateForm({ ...form, [field]: value });
    setValidationErrors((current) => ({ ...current, [field]: fieldErrors[field] }));
  };

  const apiValidationErrors = error?.status === 422 ? error.data?.errors || {} : {};
  const fieldError = (field) => validationErrors[field] || apiValidationErrors[field]?.[0];
  const generalError = error && error.status !== 422
    ? error.data?.message || (error.status === 'FETCH_ERROR' ? 'Unable to connect to the server.' : 'Unable to sign in.')
    : null;

  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">HRM Workspace</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">People, attendance, and payroll</p>
          </div>
          <ThemeToggle />
        </div>
        <GlassCard as="form" noValidate onSubmit={handleSubmit} className="p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">Sign in</h1>
          <p className="mt-2 mb-7 text-sm text-[var(--color-text-muted)]">Use your HRM account to continue.</p>
          <div className="space-y-4">
            <InputField
              label="Username"
              autoComplete="username"
              value={form.username}
              leftIcon={<UserRound size={18} aria-hidden="true" />}
              onChange={(event) => {
                setForm({ ...form, username: event.target.value });
                setValidationErrors((current) => ({ ...current, username: undefined }));
                resetLogin();
              }}
              onBlur={(event) => validateField('username', event.target.value)}
              error={fieldError('username')}
              required
            />
            <InputField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              leftIcon={<LockKeyhole size={18} aria-hidden="true" />}
              rightIcon={(
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="rounded p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
              onChange={(event) => {
                setForm({ ...form, password: event.target.value });
                setValidationErrors((current) => ({ ...current, password: undefined }));
                resetLogin();
              }}
              onBlur={(event) => validateField('password', event.target.value)}
              error={fieldError('password')}
              required
            />
          </div>
          {generalError && <p role="alert" className="mt-4 text-sm text-[var(--color-danger)]">{generalError}</p>}
          <Button type="submit" disabled={isLoading} className="mt-6 w-full">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </GlassCard>
      </div>
    </main>
  );
};

export default Login;
