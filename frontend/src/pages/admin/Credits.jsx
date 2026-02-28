import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, Crown, RefreshCw, Send } from "lucide-react";
import client from "../../api/client";
import AdminStatCard from "../../components/admin/AdminStatCard";

export default function AdminCredits() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcastAmount, setBroadcastAmount] = useState("");
  const [broadcastReason, setBroadcastReason] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get("/api/admin/credits-stats");
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleBroadcast = async () => {
    if (!broadcastAmount || parseInt(broadcastAmount) <= 0) {
      alert("Enter a valid positive credit amount.");
      return;
    }
    if (!confirm(`Add ${broadcastAmount} credits to ALL users?`)) return;
    setBroadcasting(true);
    try {
      const res = await client.post("/api/admin/broadcast-credits", {
        amount: parseInt(broadcastAmount),
        reason: broadcastReason || "Admin broadcast",
      });
      alert(res.data.message);
      setBroadcastAmount("");
      setBroadcastReason("");
    } catch (e) { alert("Failed to broadcast credits."); }
    finally { setBroadcasting(false); }
  };

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCreditsUsed = data.creditsPerDay.reduce((s, d) => s + (d.creditsUsed || 0), 0);
  const totalJobsInPeriod = data.creditsPerDay.reduce((s, d) => s + (d.jobs || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Credits</h1>
          <p className="text-sm text-muted">Credit usage analytics and management</p>
        </div>
        <button onClick={load} className="p-2 border border-border rounded-lg text-muted hover:text-textPrimary">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard label="Credits Used (30d)" value={totalCreditsUsed.toLocaleString()} icon={Zap} color="yellow" />
        <AdminStatCard label="Completed Jobs (30d)" value={totalJobsInPeriod.toLocaleString()} icon={Zap} color="primary" />
        <AdminStatCard label="Avg Credits/Job" value={totalJobsInPeriod > 0 ? (totalCreditsUsed / totalJobsInPeriod).toFixed(1) : "—"} icon={Zap} color="blue" />
      </div>

      {/* Credits per day chart */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-mono text-muted uppercase tracking-wider mb-4">Credits Used Per Day (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data.creditsPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d) => d?.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="creditsUsed" name="Credits" fill="#eab308" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top users by credit usage */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-mono text-muted uppercase tracking-wider">Top Users by Credit Usage</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["#", "User", "Plan", "Credits Used (Total)", "Credits Remaining"].map((h) => (
                <th key={h} className="text-left text-xs text-muted font-mono uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.topUsers.map((u, idx) => (
              <tr key={u._id} className="border-b border-border/50 hover:bg-white/2">
                <td className="px-5 py-3 text-muted font-mono text-xs">{idx + 1}</td>
                <td className="px-5 py-3">
                  <p className="text-textPrimary text-sm">{u.name}</p>
                  <p className="text-muted text-xs">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-orange-400 capitalize">{u.plan}</span>
                </td>
                <td className="px-5 py-3 font-mono text-yellow-400">{(u.totalCreditsUsed || 0).toLocaleString()}</td>
                <td className="px-5 py-3 font-mono text-green-400">{u.credits.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Broadcast credits */}
      <div className="bg-surface border border-orange-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-mono text-orange-400 uppercase tracking-wider">Broadcast Credits to All Users</h3>
        </div>
        <p className="text-xs text-muted mb-4">This adds credits to every user's account simultaneously. Use for promotions or compensation.</p>
        <div className="flex flex-wrap gap-3">
          <input
            type="number"
            value={broadcastAmount}
            onChange={e => setBroadcastAmount(e.target.value)}
            placeholder="Credits to add (e.g. 5)"
            min="1"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none w-48"
          />
          <input
            type="text"
            value={broadcastReason}
            onChange={e => setBroadcastReason(e.target.value)}
            placeholder="Reason (e.g. Downtime compensation)"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none flex-1 min-w-48"
          />
          <button
            onClick={handleBroadcast}
            disabled={broadcasting || !broadcastAmount}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {broadcasting ? "Sending..." : "Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}
