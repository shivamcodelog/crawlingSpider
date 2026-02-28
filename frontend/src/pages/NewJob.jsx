import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import Sidebar from "../components/Sidebar";

export default function NewJob() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [queries, setQueries] = useState("");
  const [totalRecords, setTotalRecords] = useState(50);
  const [outputFilename, setOutputFilename] = useState("output.xlsx");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const creditsNeeded = Math.ceil(totalRecords / 50);
  const hasEnoughCredits = (user?.credits ?? 0) >= creditsNeeded;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const queryList = queries
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    if (queryList.length === 0) {
      setError("Please enter at least one search query.");
      return;
    }

    if (totalRecords < 10 || totalRecords > 500) {
      setError("Records must be between 10 and 500.");
      return;
    }

    if (!hasEnoughCredits) {
      setError("Not enough credits. Please purchase more.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await client.post("/api/jobs/create", {
        queries: queryList,
        totalRecordsRequested: totalRecords,
        outputFilename: outputFilename || "output.xlsx",
      });

      if (data.success) {
        await refreshUser();
        navigate(`/scraper/jobs/${data.data._id}`);
      } else {
        setError(data.message || "Failed to create job.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create scrape job."
      );
    } finally {
      setSubmitting(false);
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
          className="max-w-2xl"
        >
          <h1 className="font-mono text-section text-textPrimary mb-2">
            New Scrape Job
          </h1>
          <p className="font-sans text-body text-muted mb-8">
            Configure your Google Maps scraping job.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Search Queries */}
            <div>
              <label className="block font-mono text-caption uppercase text-muted tracking-wider mb-2">
                Search Queries
              </label>
              <textarea
                value={queries}
                onChange={(e) => setQueries(e.target.value)}
                placeholder={"Textile Industry in Surat\nRestaurants in Mumbai\nHotels in Goa"}
                rows={5}
                className="w-full bg-bg border border-border rounded px-4 py-3 font-mono text-sm text-textPrimary placeholder-muted/50 focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted font-sans mt-1">
                One query per line. Each query searches Google Maps separately.
              </p>
            </div>

            {/* Records Needed */}
            <div>
              <label className="block font-mono text-caption uppercase text-muted tracking-wider mb-2">
                Records Needed
              </label>
              <input
                type="number"
                min={10}
                max={500}
                step={10}
                value={totalRecords}
                onChange={(e) => setTotalRecords(parseInt(e.target.value) || 10)}
                className="w-full bg-bg border border-border rounded px-4 py-3 font-mono text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted font-sans mt-1">
                Between 10 and 500 records. 1 credit = 50 records.
              </p>
            </div>

            {/* Output Filename */}
            <div>
              <label className="block font-mono text-caption uppercase text-muted tracking-wider mb-2">
                Output Filename
              </label>
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="output.xlsx"
                className="w-full bg-bg border border-border rounded px-4 py-3 font-mono text-sm text-textPrimary placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Credit cost preview */}
            <div className="bg-surface border border-border rounded p-4 flex items-center justify-between">
              <div>
                <span className="font-mono text-caption uppercase text-muted tracking-wider">
                  Credits Cost
                </span>
                <p className="font-mono text-2xl text-primary font-bold mt-1">
                  {creditsNeeded} credit{creditsNeeded !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-caption uppercase text-muted tracking-wider">
                  Available
                </span>
                <p className={`font-mono text-2xl font-bold mt-1 ${hasEnoughCredits ? "text-success" : "text-error"}`}>
                  {user?.credits ?? 0}
                </p>
              </div>
            </div>

            {/* Warning if not enough credits */}
            {!hasEnoughCredits && (
              <div className="flex items-center gap-3 bg-error/10 border border-error/30 rounded p-4">
                <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
                <div>
                  <p className="font-mono text-sm text-error">
                    Insufficient credits
                  </p>
                  <Link
                    to="/billing"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    Buy Credits →
                  </Link>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-error/10 border border-error/30 rounded p-4">
                <p className="font-mono text-sm text-error">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !hasEnoughCredits}
              className="w-full flex items-center justify-center gap-2 py-4 rounded bg-primary text-bg font-mono text-sm uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow"
            >
              <Zap className="w-5 h-5" />
              {submitting ? "Creating Job..." : "Start Scraping"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
