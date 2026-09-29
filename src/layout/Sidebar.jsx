import { useState, useCallback, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import usePermission from "../hooks/usePermission";
import { ROUTES, getRouteConfig } from "../constants/routes";
import {
  LayoutDashboard,
  Cog,
  Building2,
  Factory,
  UserGroup,
  UserShield,
  UserCog,
  CalendarDays,
  Clock,
  PartyPopper,
  Coins,
  BriefcaseBusiness,
  ClipboardList,
  HandCoins,
  IndianRupee,
  Wrench,
  ChevronDown,
} from "lucide-react";

const MENU = [
  {
    type: "item",
    icon: LayoutDashboard,
    label: "Dashboard",
    to: "/",
    paths: ["/"],
  },
  {
    type: "item",
    icon: UserGroup,
    label: "Employees",
    // menuKey: "employees",
    to: "/employees",
    paths: ["/employees", "/employees/add", "/employees/:id", "/employees/:id/edit", "/employees/:id/attendance", "/employees/:id/salary"],
    // submenu: [
    //   { icon: Users, label: "Employee List", to: "/employees", paths: ["/employees"] },
    // ],
  },
  {
    type: "item",
    icon: CalendarDays,
    label: "Daily Attendance",
    to: "/attendance",
    paths: ["/attendance"],
  },
  {
    type: "item",
    icon: HandCoins,
    label: "Cash & Bank Advances",
    to: "/advances",
    paths: ["/advances"],
  },
  // {
  //   type: "sub",
  //   icon: ClipboardList,
  //   label: "Reports",
  //   menuKey: "reports",
  //   paths: ["/reports/attendance", "/reports/salary", "/reports/maintenance"],
  //   submenu: [
  //     { icon: ClipboardList, label: "Attendance Report", to: "/reports/attendance", paths: ["/reports/attendance"] },
  //     { icon: IndianRupee, label: "Salary & Payroll", to: "/reports/salary", paths: ["/reports/salary"] },
  //     { icon: Wrench, label: "Maintenance Report", to: "/reports/maintenance", paths: ["/reports/maintenance"] },
  //   ],
  // },
  {
    type: "item",
    icon: ClipboardList,
    label: "Attendance Reports",
    to: "/reports/attendance",
    paths: ["/reports/attendance"],
  },
  {
    type: "item",
    icon: IndianRupee,
    label: "Salary & Payroll",
    to: "/reports/salary",
    paths: ["/reports/salary"],
  },
  {
    type: "item",
    icon: Wrench,
    label: "Maintenance Report",
    to: "/reports/maintenance",
    paths: ["/reports/maintenance"],
  },
  {
    type: "sub",
    icon: Cog,
    label: "Settings & Master Data",
    menuKey: "master-data",
    paths: ["/plants", "/departments", "/designations", "/shifts", "/festivals", "/charges"],
    submenu: [
      { icon: Factory, label: "Plants", to: "/plants", paths: ["/plants"] },
      { icon: Building2, label: "Departments", to: "/departments", paths: ["/departments"] },
      { icon: Clock, label: "Shift Hours", to: "/shifts", paths: ["/shifts"] },
      { icon: PartyPopper, label: "Festivals & Holidays", to: "/festivals", paths: ["/festivals"] },
      { icon: Coins, label: "Charges & Allowances", to: "/charges", paths: ["/charges"] },
      { icon: BriefcaseBusiness, label: "Designations", to: "/designations", paths: ["/designations"] },
    ],
  },
  {
    type: "item",
    icon: UserCog,
    label: "Users",
    to: "/users",
    // menuKey: "settings",
    paths: ["/users"],
    // submenu: [
    //   { icon: UserCog, label: "Users", to: "/users", paths: ["/users"] },
    //   { icon: UserShield, label: "Roles & Permissions", to: "/roles", paths: ["/roles"] },
    // ],
  },
  {
    type: "item",
    icon: UserShield,
    label: "Roles & Permissions",
    to: "/roles",
    paths: ["/roles"],
  },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

const activeClass = "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-l-4 border-[var(--color-accent-strong)]";
const baseClass = "text-[var(--color-text)]";

const HoverTooltip = ({ label, submenu, isActive }) => (
  <div
    className={`backdrop-blur-sm absolute left-14 ${!submenu ? "left-18 rounded-lg" : "rounded-tr-lg rounded-br-lg w-52"} top-0 border-r border-y border-[var(--color-border)] bg-[var(--color-surface-strong)] z-60`}
  >
    <div
      className={`w-auto backdrop-blur-sm px-4 py-[13.5px] bg-[var(--color-accent-soft)] text-xs font-semibold uppercase text-[var(--color-text-muted)] ${!submenu ? "rounded-lg" : "rounded-tr-lg"}`}
    >
      {label}
    </div>
    {submenu && (
      <ul className="overflow-auto max-h-60">
        {submenu.map((item) => {
          const active = isActive(item.paths || [item.to]);
          const ItemIcon = item.icon;
          return (
            <li key={item.to} className="border-l border-[var(--color-border)]">
              <Link
                to={item.to}
                className={`flex items-center gap-2 px-4 py-2 pl-6 text-sm transition-colors ${active
                  ? "font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
                  }`}
              >
                {ItemIcon && <ItemIcon size={14} className="shrink-0" />}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

const MenuItem = memo(({ icon: Icon, iconClassName, label, to, paths, isOpen, isActive }) => {
  const [hovered, setHovered] = useState(false);
  const active = isActive(paths);
  return (
    <li
      className={`relative ${to === "/" ? "sticky top-0 z-20" : ""}`}
      onMouseEnter={() => !isOpen && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={to}
        title={label}
        className={`flex items-center ${isOpen ? "gap-3 px-4" : "justify-center"} py-3 text-sm transition-colors hover:bg-[var(--color-accent-soft)] ${active ? activeClass : baseClass}`}
      >
        <Icon className={`${iconClassName ?? ""} hover:scale-130 transform-3d transition-300`} size={20} />
        {isOpen && <span>{label}</span>}
      </Link>
      {!isOpen && hovered && <HoverTooltip label={label} />}
    </li>
  );
});

const SubMenuItem = memo(({ icon: Icon, iconClassName, label, paths, submenu, menuKey, isOpen, isActive, openMenus, toggleMenu }) => {
  const [hovered, setHovered] = useState(false);
  const active = isActive(paths);
  const isMenuOpen = openMenus[menuKey];

  return (
    <li
      className="relative"
      onMouseEnter={() => !isOpen && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => toggleMenu(menuKey)}
        title={label}
        className={`flex items-center ${isOpen ? "justify-between px-4" : "justify-center"} w-full py-3 text-sm transition-colors ${active ? activeClass : baseClass} ${hovered ? "bg-[var(--color-accent-soft)]" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 flex justify-center">
            <Icon className={`${iconClassName ?? ""} hover:scale-130 transform-3d transition-300`} size={20} />
          </div>
          {isOpen && <span>{label}</span>}
        </div>
        {isOpen && (
          <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {!isOpen && hovered && <HoverTooltip label={label} submenu={submenu} isActive={isActive} />}

      {isMenuOpen && isOpen && (
        <ul className="bg-[var(--color-bg-elevated)] border-l-4 border-[var(--color-accent)] ml-6 py-1">
          {submenu.map((item) => {
            const ItemIcon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 pl-8 text-sm transition-colors hover:bg-[var(--color-accent-soft)] ${isActive(item.paths || [item.to]) ? "text-[var(--color-accent)] font-medium" : "text-[var(--color-text)]"}`}
                >
                  {ItemIcon && <ItemIcon size={14} className="shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
});

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar = () => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  // const { can, isSuperAdmin } = usePermission();
  const { can } = usePermission();

  const canSeeRoute = useCallback((to) => {
    // if (isSuperAdmin) return true;
    const route = getRouteConfig(to) || ROUTES.find((r) => r.path === to);
    const permKey = route?.permissionKey ?? to;
    const permAction = route?.permissionAction ?? 'view';
    return can(permKey, permAction);
  }, [can]);
  // }, [can, isSuperAdmin]);

  const toggleMenu = useCallback((key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isActive = useCallback(
    (paths) => paths.some((p) => location.pathname === p),
    [location.pathname],
  );

  const visibleItems = MENU.flatMap((item) => {
    if (item.type === "item") return canSeeRoute(item.to) ? [item] : [];
    const visibleSub = (item.submenu ?? []).filter((sub) => canSeeRoute(sub.to));
    if (!visibleSub.length) return [];
    return [{ ...item, submenu: visibleSub }];
  });

  return (
    <div
      className={`relative flex flex-col justify-center 
    ${isOpen ? "w-64" : "w-14"} h-[100vh] transition-width duration-300 print:hidden`}
    >
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`h-5 w-5 absolute top-1/6 -right-1 z-11 bg-white dark:bg-black dark:text-white rounded-full pl-[1px] ${isOpen ? "border-r hover:shadow-[7px_0px_14px_1px_#ff6e00]" : "border-l border-y hover:shadow-[-7px_0px_14px_1px_#ff6e00]"} hover:scale-120 transition-transform border-gray-300 dark:border-gray-700`}
      >
        <ChevronDown size={17} className={`text-primary-700 font-bold hover:scale-120 transition-transform ${isOpen ? "rotate-90" : "rotate-270"}`} />
      </button>

      {/* menu list */}
      <ul className={`py-1 scrollbar-hide ${isOpen ? "overflow-y-auto" : "overflow-visible"}`}>
        {visibleItems.map((item) =>
          item.type === "item" ? (
            <MenuItem key={item.to} {...item} isOpen={isOpen} isActive={isActive} />
          ) : (
            <SubMenuItem
              key={item.menuKey}
              {...item}
              isOpen={isOpen}
              isActive={isActive}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
            />
          ),
        )}
      </ul>
    </div>
  );
};

export default Sidebar;
