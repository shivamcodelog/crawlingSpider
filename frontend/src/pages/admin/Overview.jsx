import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Briefcase, DollarSign, Zap, AlertTriangle,
  CheckCircle, XCircle, Clock, TrendingUp, RefreshCw,
} from "lucide-react";
import client from "../../api/client";
import AdminStatCard from "../../components/admin/AdminStatCard";

const ORANGE = "#f97316";
const GREEN = "#22c55e";
const RED = "#ef4444";
const BLUE = "#3b82f6";
const PURPLE = "#a855f7";
const YELLOW = "#eab308";

const PLAN_COLORS = { free: BLUE, starter: ORANGE, pro: GREEN, enterprise: PURPLE };
const STATUS_COLORS = { done: GREEN, failed: RED, running: ORANGE, queued: YELLOW };

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-mono text-muted uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await client.get("/api/admin/overview");
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted font-mono text-sm">Loading admin data...</p>
        </div>
      </div>
    );
  }

  const { stats, planBreakdown, jobStatusBreakdown, charts, recentErrors } = data;

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "—");
  const fmtCur = (n) => (typeof n === "number" ? `₹${(n / 100).toFixed(2)}` : "—");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Admin Overview</h1>
          <p className="text-sm text-muted mt-0.5">Real-time SaaS metrics and platform health</p>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 text-sm text-muted hover:text-textPrimary border border-border rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Users" value={fmt(stats.totalUsers)} sub={`+${stats.newUsersToday} today`} icon={Users} color="blue" />
        <AdminStatCard label="Total Revenue" value={fmtCur(stats.totalRevenue)} sub="All-time payments" icon={DollarSign} color="green" />
        <AdminStatCard label="Total Jobs" value={fmt(stats.totalJobs)} sub={`${stats.activeJobsNow} active now`} icon={Briefcase} color="primary" />
        <AdminStatCard label="Credits Used" value={fmt(stats.creditsUsed)} sub="All-time" icon={Zap} color="yellow" />
        <AdminStatCard label="Completed Jobs" value={fmt(stats.doneJobs)} sub="Successful" icon={CheckCircle} color="green" />
        <AdminStatCard label="Failed Jobs" value={fmt(stats.failedJobs)} sub="Errors/Cancelled" icon={XCircle} color="red" />
        <AdminStatCard label="Active Jobs" value={fmt(stats.activeJobsNow)} sub="Running / Queued" icon={Clock} color="purple" />
        <AdminStatCard label="Open Errors" value={fmt(stats.unresolvedErrors)} sub="Unresolved" icon={AlertTriangle} color={stats.unresolvedErrors > 0 ? "red" : "green"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Jobs Per Day (Last 30 Days)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.jobsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v, n) => [v, n]}
              />
              <Bar dataKey="done" name="Done" fill={GREEN} stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill={RED} stackId="a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Per Day (Last 30 Days)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.revenuePerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`₹${(v / 100).toFixed(2)}`, "Revenue"]}
              />
              <Line type="monotone" dataKey="revenue" stroke={ORANGE} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="New Users Per Day">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.usersPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="New Users" fill={BLUE} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Plan Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={planBreakdown}
                dataKey="count"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {planBreakdown.map((entry) => (
                  <Cell key={entry._id} fill={PLAN_COLORS[entry._id] || BLUE} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Job Status Breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={jobStatusBreakdown}
                dataKey="count"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {jobStatusBreakdown.map((entry) => (
                  <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || BLUE} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div className="bg-surface border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-mono text-red-400 uppercase tracking-wider">Recent Unresolved Errors</h3>
          </div>
          <div className="space-y-2">
            {recentErrors.map((e) => (
              <div key={e._id} className="flex items-start gap-3 text-sm border-b border-border pb-2">
                <span className="font-mono text-xs text-muted whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</span>
                <span className="font-mono text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">{e.level}</span>
                <span className="text-textPrimary font-mono text-xs truncate">{e.message}</span>
                <span className="text-muted text-xs whitespace-nowrap ml-auto">{e.route}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
