import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
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

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
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
            <span className="text-primary font-mono font-bold text-lg">
              {user.credits}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded font-mono text-sm transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted hover:text-textPrimary hover:bg-white/5 hover:border-l-2 hover:border-primary"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Admin shortcut — only visible to admins */}
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

      {/* User section */}
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
              <p className="font-mono text-sm text-textPrimary truncate">
                {user.name}
              </p>
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
  );
}
