import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import client from "../../api/client";

const STATUS_CLS = {
  done: "bg-green-500/15 text-green-400",
  running: "bg-orange-500/15 text-orange-400",
  queued: "bg-yellow-500/15 text-yellow-400",
  failed: "bg-red-500/15 text-red-400",
};

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (statusFilter) params.set("status", statusFilter);
      const res = await client.get(`/api/admin/jobs?${params}`);
      const d = res.data.data;
      setJobs(d.jobs);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this job?")) return;
    try {
      await client.delete(`/api/admin/jobs/${id}`);
      load();
    } catch (e) { alert("Failed to delete."); }
  };

  const duration = (job) => {
    if (!job.startedAt || !job.completedAt) return "—";
    const ms = new Date(job.completedAt) - new Date(job.startedAt);
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Jobs Monitor</h1>
          <p className="text-sm text-muted">{total.toLocaleString()} total jobs</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-muted hover:text-textPrimary border border-border rounded-lg px-3 py-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {["", "queued", "running", "done", "failed"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              statusFilter === s ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-textPrimary"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["User", "Queries", "Records", "Credits", "Status", "Duration", "Created", ""].map((h) => (
                <th key={h} className="text-left text-xs text-muted font-mono uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-muted py-10 font-mono text-sm">Loading...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted py-10 font-mono text-sm">No jobs found.</td></tr>
            ) : (
              jobs.map((j) => (
                <tr key={j._id} className="border-b border-border/50 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    {j.userId ? (
                      <div>
                        <p className="text-textPrimary text-xs font-medium">{j.userId.name}</p>
                        <p className="text-muted text-[11px]">{j.userId.email}</p>
                      </div>
                    ) : <span className="text-muted text-xs">Deleted</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-textPrimary text-xs truncate">{j.queries?.join(", ")}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-orange-400">
                    {j.progress?.current ?? 0}/{j.totalRecordsRequested}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{j.creditsUsed}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${STATUS_CLS[j.status] || ""}`}>{j.status}</span>
                    {j.errorMessage && (
                      <p className="text-red-400 text-[10px] mt-0.5 max-w-[150px] truncate" title={j.errorMessage}>{j.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{duration(j)}</td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{new Date(j.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(j._id)} className="p-1.5 text-muted hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-border rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-border rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
