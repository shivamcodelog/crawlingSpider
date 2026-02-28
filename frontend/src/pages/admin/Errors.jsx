import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, Trash2, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import client from "../../api/client";

const LEVEL_CLS = {
  error: "bg-red-500/15 text-red-400 border-red-500/20",
  warn: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

export default function AdminErrors() {
  const [errors, setErrors] = useState([]);
  const [total, setTotal] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [levelFilter, setLevelFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("false");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (levelFilter) params.set("level", levelFilter);
      if (resolvedFilter !== "") params.set("resolved", resolvedFilter);
      const res = await client.get(`/api/admin/errors?${params}`);
      const d = res.data.data;
      setErrors(d.errors);
      setTotal(d.total);
      setUnresolvedCount(d.unresolvedCount);
      setPages(d.pages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, levelFilter, resolvedFilter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id) => {
    try {
      await client.patch(`/api/admin/errors/${id}/resolve`);
      load();
    } catch (e) { alert("Failed."); }
  };

  const clearResolved = async () => {
    if (!confirm("Delete all resolved errors?")) return;
    try {
      const res = await client.delete("/api/admin/errors");
      alert(res.data.message);
      load();
    } catch (e) { alert("Failed."); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Error Logs</h1>
          <p className="text-sm text-muted">
            <span className="text-red-400 font-mono">{unresolvedCount}</span> unresolved errors
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearResolved} className="flex items-center gap-2 text-xs text-red-400 border border-red-500/30 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Clear Resolved
          </button>
          <button onClick={load} className="flex items-center gap-2 text-sm text-muted hover:text-textPrimary border border-border rounded-lg px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {["", "error", "warn", "info"].map((l) => (
            <button
              key={l}
              onClick={() => { setLevelFilter(l); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${levelFilter === l ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-textPrimary"}`}
            >
              {l || "All Levels"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {[["false", "Unresolved"], ["true", "Resolved"], ["", "All"]].map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => { setResolvedFilter(v); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${resolvedFilter === v ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-textPrimary"}`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Error list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-muted py-10 font-mono text-sm">Loading...</div>
        ) : errors.length === 0 ? (
          <div className="text-center text-muted py-10 font-mono text-sm">No errors found.</div>
        ) : errors.map((e) => (
          <div
            key={e._id}
            className={`bg-surface border rounded-xl overflow-hidden transition-colors ${e.resolved ? "border-border opacity-60" : `border ${LEVEL_CLS[e.level]?.split(" ").pop() || "border-border"}`}`}
          >
            <div
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/3"
              onClick={() => setExpandedId(expandedId === e._id ? null : e._id)}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-mono border ${LEVEL_CLS[e.level] || ""}`}>{e.level}</span>
                  <span className="text-xs font-mono text-muted">{e.method} {e.route}</span>
                  <span className="text-xs font-mono text-muted ml-auto">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-textPrimary font-mono truncate">{e.message}</p>
                {e.userId && <p className="text-xs text-muted mt-0.5">{e.userId.name} &lt;{e.userId.email}&gt;</p>}
              </div>
              {!e.resolved && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); resolve(e._id); }}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 border border-green-400/30 rounded px-2 py-1 ml-2 flex-shrink-0"
                >
                  <CheckCircle className="w-3 h-3" /> Resolve
                </button>
              )}
            </div>
            {expandedId === e._id && e.stack && (
              <div className="border-t border-border bg-black/30 px-4 py-3">
                <pre className="text-xs font-mono text-muted/80 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">{e.stack}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Page {page} of {pages} ({total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-border rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-border rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
