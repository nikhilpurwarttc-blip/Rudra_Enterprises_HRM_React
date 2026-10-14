import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, LogOut, Search, X, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, selectRole, clearCredentials } from "../store/authSlice";
import { api, useLogoutMutation } from "../store/api";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import Breadcrumb from "../components/Breadcrumb";
import { useSearch } from "../contexts/SearchContext";
import UserProfilePanel from "./UserProfilePanel";
import NotificationModal from "./NotifiModal";
import EmployeeAvatar from "../pages/Employee/components/EmployeeAvatar";

const Header = ({ onToggleSidebar }) => {
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const { searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchResults } = useSearch();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const searchRef = useRef(null);

  const roleName = typeof role === 'string' ? role : role?.name ?? '';

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch { /* ignore */ }
    dispatch(api.util.resetApiState());
    dispatch(clearCredentials());
    navigate("/login", { replace: true });
  };

  const handleNavigate = useCallback((path) => {
    navigate(path);
    setSearchQuery('');
    setIsSearchOpen(false);
    setSelectedIndex(-1);
  }, [navigate, setSearchQuery, setIsSearchOpen]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  }, [setIsSearchOpen, setSearchQuery]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((p) => (p < searchResults.length - 1 ? p + 1 : p));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((p) => (p > 0 ? p - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = searchResults[selectedIndex] ?? searchResults[0];
      if (target) handleNavigate(target.path);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  }, [searchResults, selectedIndex, handleNavigate, closeSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setIsSearchOpen]);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-2 px-2 md:pr-4 print:hidden">
      {/* Left */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md hover:bg-[var(--color-accent-soft)]"
          aria-label="Open sidebar"
        >
          <Menu size={18} className="text-[var(--color-text)]" />
        </button>
        <div className="hidden lg:flex items-center gap-4">
          <Breadcrumb />
        </div>
      </div>

      {/* Middle — nav + search */}
      <Link to="/" className="hidden sm:flex items-center gap-2 shrink-0">
        <img src="/favicon.png" alt="Logo" className="h-11 dark:grayscale dark:invert" />
      </Link>

      {/* Right */}
      <div className="flex-1 flex justify-end items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] ">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-l-full hover:bg-[var(--color-border)] transition-colors"
            title="Back"
          >
            <ChevronLeft size={15} className="text-[var(--color-text)]" />
          </button>

          {isSearchOpen ? (
            <div className="relative" ref={searchRef}>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <Search size={13} className="text-[var(--color-text-muted)] shrink-0" />
                <input
                  type="text"
                  placeholder="Search pages…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedIndex(-1); }}
                  onKeyDown={handleKeyDown}
                  className="w-32 sm:w-44 bg-transparent outline-none border-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                  autoFocus
                />
                <button onClick={closeSearch}>
                  <X size={13} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl z-60 max-h-72 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.path}
                      onClick={() => handleNavigate(result.path)}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-accent-soft)] ${index === selectedIndex ? 'bg-[var(--color-accent-soft)]' : ''}`}
                    >
                      <Search size={13} className="text-[var(--color-text-muted)] shrink-0" />
                      <div>
                        <p className="font-medium text-[var(--color-text)]">{result.name}</p>
                        {result.breadcrumbs?.length > 1 && (
                          <p className="text-[10px] text-[var(--color-text-muted)]">{result.breadcrumbs.slice(0, -1).join(' › ')}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-[var(--color-border)] rounded-md transition-colors"
              title="Search (type to find pages)"
            >
              <Search size={15} className="text-[var(--color-text)]" />
            </button>
          )}

          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-r-full hover:bg-[var(--color-border)] transition-colors"
            title="Forward"
          >
            <ChevronRight size={15} className="text-[var(--color-text)]" />
          </button>
        </div>

        <ThemeToggle />

        <button
          onClick={() => setIsNotificationOpen(true)}
          className="relative p-2 rounded-md hover:bg-[var(--color-border)] transition-colors"
        >
          <Bell size={16} className="text-gray-600 dark:text-gray-200" />
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User Info */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          aria-label="Open user profile"
          className="flex items-center gap-2 border-l border-[var(--color-border)] pl-2 text-left hover:scale-105 focus:outline-none"
        >
          <EmployeeAvatar
            employee={{ name: user?.name, image: user?.employee?.image ?? user?.image }}
            className="h-8 w-8 text-xs"
          />
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-medium text-[var(--color-text)]">{user?.name ?? 'User'}</p>
            {roleName && <p className="text-[10px] text-[var(--color-text-muted)] capitalize">{roleName}</p>}
          </div>
        </button>

        {/* logout button */}
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="p-2 rounded-md text-[var(--color-danger)] hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <UserProfilePanel
        user={user}
        roleName={roleName}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    </header>
  );
};

export default Header;
