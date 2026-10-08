import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { RightPanelProvider } from '../contexts/RightPanelContext';

// ── Page transition wrapper ───────────────────────────────────────────────────
// Triggers a CSS fade+slide-up animation every time the top-level route changes.
const PageTransition = ({ children }) => {
  const location  = useLocation();
  const pageKey   = location.pathname.split('/').slice(0, 2).join('/');
  const ref       = useRef(null);
  const prevKey   = useRef(pageKey);

  useEffect(() => {
    if (prevKey.current === pageKey) return;
    prevKey.current = pageKey;
    const el = ref.current;
    if (!el) return;
    // Reset then replay the animation
    el.style.animation = 'none';
    // Force reflow so the browser registers the reset
    void el.offsetHeight;
    el.style.animation = '';
  }, [pageKey]);

  return (
    <div ref={ref} className="page-enter h-full">
      {children}
    </div>
  );
};

// ── MainLayout ────────────────────────────────────────────────────────────────
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  const location = useLocation();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <RightPanelProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:flex h-full shrink-0">
          <Sidebar />
        </aside>

        {/* ── Mobile Sidebar ── */}
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className={[
            'fixed inset-0 z-40 lg:hidden bg-black/40 backdrop-blur-sm',
            'transition-opacity duration-300',
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          ].join(' ')}
        />
        {/* Drawer */}
        <aside
          className={[
            'fixed left-0 top-0 z-50 h-full lg:hidden',
            'bg-[var(--color-bg-elevated)] border-r border-[var(--color-border)]',
            'transition-transform duration-300 ease-out will-change-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <Sidebar />
        </aside>

        {/* ── Right section ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />

          <div className="relative flex-1 overflow-hidden">
            <div className="relative z-10 flex h-full overflow-hidden">
              <main
                id="main-content-area"
                className={[
                  'overflow-x-auto overflow-y-auto flex-1',
                  'bg-[var(--color-bg-elevated)]',
                  'md:rounded-2xl border border-[var(--color-border)]',
                  'shadow-[inset_0_10px_20px_rgba(0,0,0,0.08)]',
                  'dark:shadow-[inset_0_0_20px_rgba(255,255,255,0.04)]',
                ].join(' ')}
              >
                <PageTransition>{children}</PageTransition>
              </main>

              {/* Right panel slot — RightModal portals into here */}
              <div
                id="right-panel-slot"
                className="relative hidden md:flex w-auto min-w-0 flex-shrink-0 overflow-hidden md:mr-2"
              />
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </RightPanelProvider>
  );
};

export default MainLayout;
