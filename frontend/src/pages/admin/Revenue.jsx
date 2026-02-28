import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { DollarSign, TrendingUp, CreditCard, Zap, RefreshCw } from "lucide-react";
import client from "../../api/client";
import AdminStatCard from "../../components/admin/AdminStatCard";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308"];
const fmtCur = (n) => (typeof n === "number" ? `₹${(n / 100).toFixed(2)}` : "—");

function ChartCard({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-mono text-muted uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/api/admin/revenue?days=${days}`);
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, revenueByPlan, revenueByProvider, revenuePerDay, recentPayments } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Revenue</h1>
          <p className="text-sm text-muted">Earnings and payment analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[7, 30, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-mono rounded ${days === d ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-textPrimary"}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-muted hover:text-textPrimary border border-border rounded-lg px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Revenue (All-time)" value={fmtCur(summary.totalRevenue)} icon={DollarSign} color="green" />
        <AdminStatCard label="Total Transactions" value={summary.totalTransactions?.toLocaleString()} icon={CreditCard} color="blue" />
        <AdminStatCard label="Avg Transaction" value={summary.totalTransactions > 0 ? fmtCur(summary.totalRevenue / summary.totalTransactions) : "—"} icon={TrendingUp} color="primary" />
        <AdminStatCard label="Revenue (Period)" value={fmtCur(revenuePerDay.reduce((s, d) => s + (d.revenue || 0), 0))} icon={Zap} color="yellow" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`Daily Revenue (Last ${days} Days)`}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={revenuePerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [fmtCur(v), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="By Plan">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueByPlan} dataKey="revenue" nameKey="_id" cx="50%" cy="50%" outerRadius={65}
                  label={({ _id }) => _id} labelLine={false}>
                  {revenueByPlan.map((e, i) => <Cell key={e._id} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [fmtCur(v), "Revenue"]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="By Provider">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueByProvider} dataKey="revenue" nameKey="_id" cx="50%" cy="50%" outerRadius={65}
                  label={({ _id }) => _id} labelLine={false}>
                  {revenueByProvider.map((e, i) => <Cell key={e._id} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [fmtCur(v), "Revenue"]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Revenue by plan table */}
      <ChartCard title="Revenue by Plan — Detail">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Plan", "Revenue", "Transactions", "Avg/Transaction"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted font-mono uppercase tracking-wider px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {revenueByPlan.map((r) => (
                <tr key={r._id} className="border-b border-border/50">
                  <td className="px-3 py-2.5 font-mono text-orange-400 capitalize">{r._id}</td>
                  <td className="px-3 py-2.5 text-green-400 font-mono">{fmtCur(r.revenue)}</td>
                  <td className="px-3 py-2.5 text-textPrimary font-mono">{r.count}</td>
                  <td className="px-3 py-2.5 text-muted font-mono">{r.count > 0 ? fmtCur(r.revenue / r.count) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Recent payments */}
      <ChartCard title="Recent Payments">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["User", "Amount", "Plan", "Provider", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted font-mono uppercase tracking-wider px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.slice(0, 20).map((p) => (
                <tr key={p._id} className="border-b border-border/50">
                  <td className="px-3 py-2.5">
                    <p className="text-textPrimary text-xs">{p.userId?.name ?? "Deleted"}</p>
                    <p className="text-muted text-[11px]">{p.userId?.email ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-green-400">{fmtCur(p.amount)}</td>
                  <td className="px-3 py-2.5 font-mono text-orange-400 capitalize text-xs">{p.plan}</td>
                  <td className="px-3 py-2.5 font-mono text-muted text-xs">{p.provider}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${p.status === "success" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{p.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted text-xs whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
