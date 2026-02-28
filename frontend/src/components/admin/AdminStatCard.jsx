// Shared admin stat card component
export default function AdminStatCard({ label, value, sub, icon: Icon, color = "primary", trend }) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    green: "text-green-400 bg-green-400/10 border-green-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20",
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  };
  const cls = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex items-start gap-4">
      {Icon && (
        <div className={`p-2.5 rounded-lg border ${cls}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted font-mono uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-textPrimary mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-mono ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last period
          </p>
        )}
      </div>
    </div>
  );
}
