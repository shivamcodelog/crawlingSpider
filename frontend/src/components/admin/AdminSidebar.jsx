import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  Activity,
  AlertTriangle,
  Map,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/jobs", label: "Jobs Monitor", icon: Briefcase },
  { to: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { to: "/admin/traffic", label: "Traffic", icon: Activity },
  { to: "/admin/errors", label: "Error Logs", icon: AlertTriangle },
  { to: "/admin/user-map", label: "User Map", icon: Map },
  { to: "/admin/credits", label: "Credits", icon: CreditCard },
];

const linkBase =
  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-mono transition-all duration-150 group";
const linkActive = "bg-primary/10 text-primary font-semibold";
const linkInactive = "text-muted hover:text-textPrimary hover:bg-white/5";

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span className="font-mono text-base font-bold text-textPrimary">
            MapScraper<span className="text-primary">Admin</span>
          </span>
        </div>
        {user && (
          <div className="flex items-center gap-2 mt-3">
            {user.avatar ? (
              <img src={user.avatar} className="w-7 h-7 rounded-full" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-textPrimary font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-primary font-mono uppercase">admin</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <NavLink
          to="/dashboard"
          className={`${linkBase} ${linkInactive}`}
        >
          <Settings className="w-4 h-4" />
          <span>User Dashboard</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className={`${linkBase} ${linkInactive} w-full text-left`}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
