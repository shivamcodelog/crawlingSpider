import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import client from "../../api/client";
import AdminStatCard from "../../components/admin/AdminStatCard";

function ChartCard({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-mono text-muted uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminTraffic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/api/admin/traffic?hours=${hours}`);
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [hours]);

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalErrors = data.requestsPerHour.reduce((s, h) => s + (h.errors || 0), 0);
  const avgResponseMs = data.requestsPerHour.length > 0
    ? Math.round(data.requestsPerHour.reduce((s, h) => s + (h.avgResponseMs || 0), 0) / data.requestsPerHour.length)
    : 0;

  const statusOk = data.statusBreakdown.filter(s => s._id < 400).reduce((a, s) => a + s.count, 0);
  const statusErr = data.statusBreakdown.filter(s => s._id >= 400).reduce((a, s) => a + s.count, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">API Traffic</h1>
          <p className="text-sm text-muted">Request monitoring and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[6, 24, 48, 168].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`px-3 py-1.5 text-xs font-mono rounded ${hours === h ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-textPrimary"}`}
              >
                {h < 24 ? `${h}h` : `${h / 24}d`}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 border border-border rounded-lg text-muted hover:text-textPrimary">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Requests" value={data.totalRequests?.toLocaleString()} icon={Activity} color="blue" />
        <AdminStatCard label="Avg Response" value={`${avgResponseMs}ms`} icon={Clock} color="primary" />
        <AdminStatCard label="Successful (2xx/3xx)" value={statusOk.toLocaleString()} icon={CheckCircle} color="green" />
        <AdminStatCard label="Errors (4xx/5xx)" value={statusErr.toLocaleString()} icon={AlertTriangle} color={statusErr > 0 ? "red" : "green"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Requests Per Hour">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={data.requestsPerHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="_id" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(d) => d?.slice(11, 16)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" name="Requests" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" name="Errors" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Response Time (ms) Per Hour">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={data.requestsPerHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="_id" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(d) => d?.slice(11, 16)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="avgResponseMs" name="Response ms" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 10 Routes by Volume">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topRoutes} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis type="category" dataKey="_id" tick={{ fontSize: 10, fill: "#64748b" }} width={100} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Requests" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="HTTP Status Code Breakdown">
          <div className="space-y-2 pt-2">
            {data.statusBreakdown.map((s) => {
              const max = Math.max(...data.statusBreakdown.map(x => x.count), 1);
              const pct = Math.round((s.count / max) * 100);
              const isErr = s._id >= 400;
              return (
                <div key={s._id} className="flex items-center gap-3">
                  <span className={`font-mono text-xs w-10 flex-shrink-0 ${isErr ? "text-red-400" : "text-green-400"}`}>{s._id}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${isErr ? "bg-red-400" : "bg-green-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-muted text-xs font-mono w-14 text-right">{s.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
