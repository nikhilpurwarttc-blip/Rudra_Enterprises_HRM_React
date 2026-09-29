import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import { RightPanelProvider } from "../contexts/RightPanelContext";

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RightPanelProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex h-full shrink-0">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-0 z-50 h-full lg:hidden bg-[var(--color-bg-elevated)] border-r border-[var(--color-border)]">
              <Sidebar />
            </aside>
          </>
        )}

        {/* Right Section */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />

          <div className="relative flex-1 overflow-hidden">
            <div className="relative z-10 flex h-full overflow-hidden">
              <main
                id="main-content-area"
                className="overflow-x-auto overflow-y-auto flex-1 bg-[var(--color-bg-elevated)] backdrop-blur-2xl md:rounded-2xl border border-[var(--color-border)] shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
              >
                {children}
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
