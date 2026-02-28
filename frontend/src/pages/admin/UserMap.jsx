import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Globe, RefreshCw, MapPin } from "lucide-react";
import client from "../../api/client";

// Simple flag emoji from country code
const flag = (code) => {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
};

export default function AdminUserMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get("/api/admin/user-map");
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">User Map</h1>
          <p className="text-sm text-muted">Geographic distribution of users</p>
        </div>
        <button onClick={load} className="p-2 border border-border rounded-lg text-muted hover:text-textPrimary">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted font-mono uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-bold text-textPrimary mt-1">{data.total.toLocaleString()}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted font-mono uppercase tracking-wider">With Location</p>
              <p className="text-2xl font-bold text-textPrimary mt-1">{data.withLocation.toLocaleString()}</p>
              <p className="text-xs text-muted">{data.total > 0 ? `${Math.round(data.withLocation / data.total * 100)}%` : "0%"} tracked</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted font-mono uppercase tracking-wider">Countries</p>
              <p className="text-2xl font-bold text-textPrimary mt-1">{data.byCountry.length}</p>
            </div>
          </div>

          {data.byCountry.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <Globe className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted font-mono text-sm">No location data yet.</p>
              <p className="text-xs text-muted/60 mt-2">Location is captured when users log in from a non-local IP.</p>
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="text-sm font-mono text-muted uppercase tracking-wider mb-4">Users by Country</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.byCountry.slice(0, 20)} margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(name) => name?.slice(0, 12)}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" name="Users" fill="#f97316" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Country list */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="text-sm font-mono text-muted uppercase tracking-wider">Country Breakdown</h3>
                </div>
                <div className="divide-y divide-border/50">
                  {data.byCountry.map((c, idx) => {
                    const pct = data.withLocation > 0 ? (c.count / data.withLocation) * 100 : 0;
                    return (
                      <div key={c._id} className="flex items-center gap-4 px-5 py-3">
                        <span className="text-muted font-mono text-xs w-5 flex-shrink-0">{idx + 1}</span>
                        <span className="text-xl flex-shrink-0">{flag(c.code)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-textPrimary font-medium">{c._id}</span>
                            <span className="text-sm font-mono text-orange-400">{c.count}</span>
                          </div>
                          <div className="bg-white/5 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${Math.max(2, pct)}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-muted font-mono w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
