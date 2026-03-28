import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Coins,
  Briefcase,
  Database,
  TrendingUp,
  Eye,
  Download,
} from "lucide-react";
import { useAuth, useTokenFromUrl } from "../context/AuthContext";
import client from "../api/client";
import Sidebar from "../components/Sidebar";
import StatCard, { StatCardSkeleton } from "../components/StatCard";
import JobStatusBadge from "../components/JobStatusBadge";

export default function Dashboard() {
  useTokenFromUrl();

  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, jobsRes] = await Promise.all([
          client.get("/api/user/stats"),
          client.get("/api/jobs?limit=10"),
        ]);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (jobsRes.data.success) setJobs(jobsRes.data.data.jobs || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="pt-16 lg:pt-4 lg:ml-64 p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-mono text-section text-textPrimary">
              Dashboard
            </h1>
            <p className="font-sans text-body text-muted mt-1">
              Welcome back{user ? `, ${user.name}` : ""}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Credits Remaining"
                  value={stats?.credits ?? 0}
                  icon={Coins}
                  color="text-primary"
                />
                <StatCard
                  label="Total Jobs Run"
                  value={stats?.totalJobs ?? 0}
                  icon={Briefcase}
                />
                <StatCard
                  label="Records Scraped"
                  value={stats?.recordsScraped ?? 0}
                  icon={Database}
                />
                <StatCard
                  label="Success Rate"
                  value={`${stats?.successRate ?? 0}%`}
                  icon={TrendingUp}
                  color="text-success"
                />
              </>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-surface border border-border rounded">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-mono text-card text-textPrimary">
                Recent Jobs
              </h2>
              <Link
                to="/scraper/jobs"
                className="font-mono text-xs text-primary hover:underline"
              >
                View All →
              </Link>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted font-mono text-sm mb-4">
                  No scraping jobs yet.
                </p>
                <Link
                  to="/scraper/new"
                  className="font-mono text-sm px-6 py-2 bg-primary text-bg rounded hover:bg-primary/90 transition-colors"
                >
                  Start Your First Scrape
                </Link>
              </div>
            ) : (
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
                        <td className="px-6 py-4 font-mono text-sm text-textPrimary">
                          {job.queries?.[0] || "—"}
                          {job.queries?.length > 1 && (
                            <span className="text-muted ml-1">
                              +{job.queries.length - 1}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-muted">
                          {job.resultCount || job.totalRecordsRequested}
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
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-muted" />
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
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
