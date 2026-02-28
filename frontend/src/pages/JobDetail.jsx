import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Timer,
  Loader2,
  Activity,
} from "lucide-react";
import { useJobPolling } from "../hooks/useJobPolling";
import client from "../api/client";
import Sidebar from "../components/Sidebar";
import JobStatusBadge from "../components/JobStatusBadge";
import ProgressBar from "../components/ProgressBar";

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatETA(current, total, elapsedSeconds) {
  if (!current || current === 0) return "Calculating…";
  const rate = current / elapsedSeconds; // records per second
  const remaining = (total - current) / rate;
  if (!isFinite(remaining) || remaining < 0) return "Almost done…";
  return `~${formatElapsed(Math.ceil(remaining))} left`;
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { job, loading, error, elapsedSeconds, refresh } = useJobPolling(id, 2000);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [logs, setLogs] = useState([]);
  const terminalRef = useRef(null);

  // Poll scraper logs every 2s while active; fetch once on mount for completed jobs
  useEffect(() => {
    if (!job) return;
    const fetchLogs = async () => {
      try {
        const { data } = await client.get(`/api/jobs/${id}/logs`);
        if (data.logs) setLogs(data.logs);
      } catch {}
    };
    fetchLogs();
    const active = job.status === "queued" || job.status === "running";
    if (!active) return;
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [id, job?.status]);

  // Auto-scroll terminal to bottom when logs update
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);


  const pct = job
    ? Math.round(((job.progress?.current || 0) / (job.progress?.total || job.totalRecordsRequested || 1)) * 100)
    : 0;

  const handleDownload = async () => {
    try {
      const response = await client.get(`/api/jobs/${id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = job?.outputFilename || `scrape_${id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this job? Credits will be refunded.")) return;
    setCancelling(true);
    try {
      await client.delete(`/api/jobs/${id}`);
      setActionMsg("Job cancelled. Credits refunded.");
      refresh();
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Failed to cancel.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setActionMsg(null);
    try {
      const { data } = await client.post(`/api/jobs/${id}/retry`);
      if (data.success) {
        navigate(`/scraper/jobs/${data.data._id}`);
      }
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Failed to retry.");
      setRetrying(false);
    }
  };

  const isActive = job?.status === "queued" || job?.status === "running";

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-mono text-section text-textPrimary">Job Details</h1>
              <p className="font-mono text-xs text-muted mt-1">ID: {id}</p>
            </div>
            <div className="flex items-center gap-3">
              {job?.status === "done" && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-bg rounded font-mono text-sm hover:bg-primary/90 transition-all hover:shadow-glow"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </button>
              )}
              {isActive && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-2 px-5 py-2.5 bg-error/10 border border-error/40 text-error rounded font-mono text-sm hover:bg-error/20 transition-all disabled:opacity-50"
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {cancelling ? "Cancelling…" : "Kill Job"}
                </button>
              )}
              {job?.status === "failed" && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-bg rounded font-mono text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {retrying ? "Retrying…" : "Retry Job"}
                </button>
              )}
            </div>
          </div>

          {actionMsg && (
            <div className="mb-4 px-4 py-3 bg-surface border border-border rounded font-mono text-sm text-muted">
              {actionMsg}
            </div>
          )}

          {loading && !job ? (
            <div className="space-y-6">
              <div className="skeleton h-20 rounded" />
              <div className="skeleton h-40 rounded" />
              <div className="skeleton h-60 rounded" />
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/30 rounded p-6">
              <p className="font-mono text-sm text-error">{error}</p>
            </div>
          ) : job ? (
            <div className="space-y-6">

              {/* ── Status + Progress ── */}
              <div className="bg-surface border border-border rounded p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-mono text-card text-textPrimary">Status</h2>
                  <div className="flex items-center gap-3">
                    {isActive && (
                      <span className="font-mono text-xs text-muted flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        {formatElapsed(elapsedSeconds)}
                      </span>
                    )}
                    <JobStatusBadge status={job.status} />
                  </div>
                </div>

                <ProgressBar
                  current={job.progress?.current || 0}
                  total={job.progress?.total || job.totalRecordsRequested}
                />

                {/* Live stats row */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-bg rounded p-3 border border-border text-center">
                    <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Done</p>
                    <p className="font-mono text-lg text-primary font-bold">{job.progress?.current || 0}</p>
                  </div>
                  <div className="bg-bg rounded p-3 border border-border text-center">
                    <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Target</p>
                    <p className="font-mono text-lg text-textPrimary font-bold">{job.progress?.total || job.totalRecordsRequested}</p>
                  </div>
                  <div className="bg-bg rounded p-3 border border-border text-center">
                    <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">
                      {job.status === "running" ? "ETA" : "Progress"}
                    </p>
                    <p className="font-mono text-lg text-textPrimary font-bold">
                      {job.status === "running"
                        ? formatETA(job.progress?.current, job.progress?.total || job.totalRecordsRequested, elapsedSeconds || 1)
                        : `${pct}%`}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <p className="font-mono text-xs text-muted mt-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                    Auto-refreshing every 2 seconds…
                  </p>
                )}
              </div>

              {/* ── Job Info ── */}
              <div className="bg-surface border border-border rounded p-6">
                <h2 className="font-mono text-card text-textPrimary mb-4">Job Information</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow icon={FileText} label="Queries" value={job.queries?.join(", ") || "—"} />
                  <InfoRow icon={Clock}    label="Created"  value={new Date(job.createdAt).toLocaleString()} />
                  <InfoRow label="Records Requested" value={job.totalRecordsRequested} />
                  <InfoRow label="Records Scraped"   value={job.resultCount || job.progress?.current || 0} valueColor="text-primary" />
                  <InfoRow label="Credits Used"  value={job.creditsUsed} />
                  <InfoRow label="Output File"   value={job.outputFilename || "output.xlsx"} />
                  {job.startedAt   && <InfoRow label="Started"   value={new Date(job.startedAt).toLocaleString()} />}
                  {job.completedAt && <InfoRow label="Completed" value={new Date(job.completedAt).toLocaleString()} />}
                </div>
              </div>

              {/* ── Terminal log ── */}
              <div className="bg-[#0D0D0D] border border-border rounded overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="ml-3 font-mono text-xs text-muted">job-log — {job._id}</span>
                  {logs.length > 0 && (
                    <span className="ml-auto font-mono text-xs text-muted">{logs.length} lines</span>
                  )}
                </div>
                <div ref={terminalRef} className="p-4 max-h-80 overflow-y-auto font-mono text-sm space-y-0.5">
                  {logs.length > 0 ? (
                    logs.map((entry, i) => (
                      <p key={i} className={logLevelColor(entry.level)}>{entry.text}</p>
                    ))
                  ) : (
                    <>
                      {job.status === "queued" && (<>
                        <p className="text-muted">[INFO] Job queued. Waiting for scraper to pick up…</p>
                        <p className="text-muted">[INFO] Elapsed: <span className="text-primary">{formatElapsed(elapsedSeconds)}</span></p>
                        <p className="text-yellow-400">[WAIT] If this stays queued for &gt;30s, click "Kill Job" and retry.</p>
                      </>)}
                      {job.status === "running" && (
                        <p className="text-muted">[INFO] Chromium launched. Buffering output…</p>
                      )}
                      {job.status === "done" && (<>
                        <p className="text-success">[DONE] Scraping completed — {job.resultCount} records saved.</p>
                        <p className="text-muted">[INFO] Completed at {new Date(job.completedAt).toLocaleString()}</p>
                      </>)}
                      {job.status === "failed" && (<>
                        <p className="text-error">[ERROR] Job failed or was cancelled.</p>
                        {job.errorMessage && (
                          <p className="text-error/80 whitespace-pre-wrap">{job.errorMessage}</p>
                        )}
                        <p className="text-muted mt-1">Credits have been automatically refunded.</p>
                        <p className="text-yellow-400">[HINT] Click "Retry Job" to re-run with the same settings.</p>
                      </>)}
                    </>
                  )}
                  {(job.status === "queued" || job.status === "running") && (
                    <p className="text-primary animate-blink">▊</p>
                  )}
                </div>
              </div>

            </div>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}

function logLevelColor(level) {
  switch (level) {
    case "success": return "text-success";
    case "error":   return "text-error";
    case "warning": return "text-yellow-400";
    case "primary": return "text-primary";
    case "info":    return "text-textPrimary";
    default:        return "text-muted";
  }
}

function InfoRow({ icon: Icon, label, value, valueColor = "text-textPrimary" }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />}
      <div>
        <p className="font-mono text-xs text-muted uppercase tracking-wider">{label}</p>
        <p className={`font-mono text-sm ${valueColor} mt-0.5`}>{value}</p>
      </div>
    </div>
  );
}
