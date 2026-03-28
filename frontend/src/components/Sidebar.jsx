import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

const SpiderIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="4" fill="#e8e8e8" />
    <line x1="14" y1="10" x2="14" y2="2" stroke="#555" strokeWidth="1" />
    <line x1="14" y1="18" x2="14" y2="26" stroke="#555" strokeWidth="1" />
    <line x1="10" y1="14" x2="2" y2="14" stroke="#555" strokeWidth="1" />
    <line x1="18" y1="14" x2="26" y2="14" stroke="#555" strokeWidth="1" />
    <line x1="11.2" y1="11.2" x2="5.5" y2="5.5" stroke="#444" strokeWidth="1" />
    <line x1="16.8" y1="16.8" x2="22.5" y2="22.5" stroke="#444" strokeWidth="1" />
    <line x1="16.8" y1="11.2" x2="22.5" y2="5.5" stroke="#444" strokeWidth="1" />
    <line x1="11.2" y1="16.8" x2="5.5" y2="22.5" stroke="#444" strokeWidth="1" />
  </svg>
);

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scraper/new", label: "New Scrape", icon: PlusCircle },
  { to: "/scraper/jobs", label: "My Jobs", icon: List },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const closeMobileMenu = () => setMobileOpen(false);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinkClasses = (isActive) =>
    `flex items-center gap-3 px-4 py-3 rounded font-mono text-sm transition-all duration-200 group ${
      isActive
        ? "bg-primary/10 text-primary border-l-2 border-primary"
        : "text-muted hover:text-textPrimary hover:bg-white/5 hover:border-l-2 hover:border-primary"
    }`;

  const renderNavLinks = (onNavigate) =>
    navItems.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        onClick={onNavigate}
        className={({ isActive }) => navLinkClasses(isActive)}
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </NavLink>
    ));

  const handleMobileLogout = async () => {
    closeMobileMenu();
    await handleLogout();
  };

  const getMobilePageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/scraper/new") return "New Scrape";
    if (path === "/scraper/jobs") return "My Jobs";
    if (path.startsWith("/scraper/jobs/")) return "Job Details";
    if (path === "/billing") return "Billing";
    if (path === "/settings") return "Settings";
    if (path.startsWith("/admin")) return "Admin";
    return "";
  };

  const mobilePageTitle = getMobilePageTitle();

  return (
    <>
      {/* MOBILE ONLY: Brand + hamburger on a single row */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur border-b border-border z-40 lg:hidden">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <SpiderIcon />
            <p className="font-mono text-base font-bold text-textPrimary truncate">
              Shizuku<span className="text-primary">8</span>
            </p>
            {mobilePageTitle ? (
              <>
                <span className="text-muted/60">/</span>
                <span className="font-mono text-sm text-muted truncate">{mobilePageTitle}</span>
              </>
            ) : null}
          </div>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 rounded border border-border text-textPrimary hover:bg-white/5 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR - permanently visible on large screens */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex-col z-30">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <SpiderIcon />
            <span className="font-mono text-lg font-bold text-textPrimary">
              Shizuku<span className="text-primary">8</span>
            </span>
          </div>
          {user && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-caption uppercase text-muted font-mono">Credits:</span>
              <span className="text-primary font-mono font-bold text-lg">{user.credits}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">{renderNavLinks(() => {})}</nav>

        {user?.role === "admin" && (
          <div className="px-4 pb-2">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded font-mono text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-red-500/10 text-red-400 border-l-2 border-red-400"
                    : "text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border-l-2 border-transparent"
                }`
              }
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Admin Panel</span>
            </NavLink>
          </div>
        )}

        {user && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full border border-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-mono text-primary font-bold">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-textPrimary truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 w-full rounded font-mono text-sm text-muted hover:text-error hover:bg-error/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* MOBILE DRAWER - only visible on small screens */}
      <div
        onClick={closeMobileMenu}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col z-50 transform transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile drawer header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <SpiderIcon />
            <span className="font-mono text-lg font-bold text-textPrimary">
              Shizuku<span className="text-primary">8</span>
            </span>
          </div>
          {user && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-caption uppercase text-muted font-mono">Credits:</span>
              <span className="text-primary font-mono font-bold text-lg">{user.credits}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">{renderNavLinks(closeMobileMenu)}</nav>

        {user?.role === "admin" && (
          <div className="px-4 pb-2">
            <NavLink
              to="/admin"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded font-mono text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-red-500/10 text-red-400 border-l-2 border-red-400"
                    : "text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border-l-2 border-transparent"
                }`
              }
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Admin Panel</span>
            </NavLink>
          </div>
        )}

        {user && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full border border-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-mono text-primary font-bold">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-textPrimary truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                closeMobileMenu();
                handleLogout();
              }}
              className="flex items-center gap-2 px-4 py-2 w-full rounded font-mono text-sm text-muted hover:text-error hover:bg-error/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
