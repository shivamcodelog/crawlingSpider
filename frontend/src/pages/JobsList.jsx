import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Download, RefreshCw } from "lucide-react";
import client from "../api/client";
import Sidebar from "../components/Sidebar";
import JobStatusBadge from "../components/JobStatusBadge";

export default function JobsList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchError, setFetchError] = useState(null);

  const fetchJobs = async (p = 1) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data } = await client.get(`/api/jobs?page=${p}&limit=15`);
      if (data.success) {
        setJobs(data.data.jobs || []);
        setTotalPages(data.data.pages || 1);
        setPage(data.data.page || 1);
      } else {
        setFetchError(data.message || "Failed to load jobs.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load jobs.";
      setFetchError(msg);
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDownload = async (jobId) => {
    try {
      const response = await client.get(`/api/jobs/${jobId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `scrape_${jobId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-mono text-section text-textPrimary">
                My Jobs
              </h1>
              <p className="font-sans text-body text-muted mt-1">
                All your scraping jobs and their status.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchJobs(page)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded font-mono text-xs text-muted hover:text-textPrimary hover:border-primary/50 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Link
                to="/scraper/new"
                className="px-4 py-2 bg-primary text-bg rounded font-mono text-xs hover:bg-primary/90 transition-colors"
              >
                + New Job
              </Link>
            </div>
          </div>

          <div className="bg-surface border border-border rounded overflow-hidden">
            {fetchError && (
              <div className="px-6 py-3 bg-error/10 border-b border-error/30 flex items-center justify-between">
                <p className="font-mono text-xs text-error">{fetchError}</p>
                <button
                  onClick={() => fetchJobs(page)}
                  className="font-mono text-xs text-error underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded" />
                ))}
              </div>
            ) : !fetchError && jobs.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-muted font-mono text-sm mb-4">
                  No jobs found.
                </p>
                <Link
                  to="/scraper/new"
                  className="font-mono text-sm px-6 py-2 bg-primary text-bg rounded hover:bg-primary/90 transition-colors"
                >
                  Create Your First Job
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                          Query
                        </th>
                        <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                          Records
                        </th>
                        <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                          Credits
                        </th>
                        <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                          Status
                        </th>
                        <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                          Date
                        </th>
                        <th className="text-right px-6 py-3 font-mono text-caption uppercase text-muted">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr
                          key={job._id}
                          className="border-b border-border hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-sm text-textPrimary max-w-xs truncate">
                            {job.queries?.[0] || "—"}
                            {job.queries?.length > 1 && (
                              <span className="text-muted ml-1">
                                +{job.queries.length - 1}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-muted">
                            {job.resultCount || 0} / {job.totalRecordsRequested}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-primary">
                            {job.creditsUsed}
                          </td>
                          <td className="px-6 py-4">
                            <JobStatusBadge status={job.status} />
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-muted">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/scraper/jobs/${job._id}`}
                                className="p-2 rounded hover:bg-white/10 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 text-muted hover:text-textPrimary" />
                              </Link>
                              {job.status === "done" && (
                                <button
                                  onClick={() => handleDownload(job._id)}
                                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4 text-primary" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
                    <button
                      onClick={() => fetchJobs(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1 rounded font-mono text-xs border border-border text-muted hover:text-textPrimary disabled:opacity-30 transition-colors"
                    >
                      Prev
                    </button>
                    <span className="font-mono text-xs text-muted">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => fetchJobs(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 rounded font-mono text-xs border border-border text-muted hover:text-textPrimary disabled:opacity-30 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
