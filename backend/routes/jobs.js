const router = require("express").Router();
const mongoose = require("mongoose");
const axios = require("axios");
const path = require("path");
const { verifyJWT } = require("../middleware/authMiddleware");
const ScrapeJob = require("../models/ScrapeJob");
const User = require("../models/User");

const SCRAPER_URL = process.env.SCRAPER_URL || "http://localhost:8000";

// ── Plan concurrency limits ──
const PLAN_LIMITS = {
  free: 1,
  starter: 2,
  pro: 5,
  enterprise: Infinity,
};

// POST /api/jobs/create — Create a new scrape job
router.post("/create", verifyJWT, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { queries, totalRecordsRequested, outputFilename } = req.body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        data: null,
        message: "At least one search query is required.",
      });
    }

    if (!totalRecordsRequested || totalRecordsRequested < 10) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        data: null,
        message: "Minimum 10 records required.",
      });
    }

    // Calculate credits needed: 1 credit per 50 records
    const creditsNeeded = Math.ceil(totalRecordsRequested / 50);
    const user = await User.findById(req.user._id).session(session);

    if (user.credits < creditsNeeded) {
      await session.abortTransaction();
      session.endSession();
      return res.status(402).json({
        success: false,
        data: { creditsNeeded, creditsAvailable: user.credits },
        message: "Insufficient credits. Please purchase more.",
      });
    }

    // Auto-expire stale jobs stuck in queued/running for >15 min
    // (happens when scraper service restarts mid-job)
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
    await ScrapeJob.updateMany(
      {
        userId: user._id,
        status: { $in: ["queued", "running"] },
        updatedAt: { $lt: staleThreshold },
      },
      {
        $set: {
          status: "failed",
          errorMessage: "Job timed out (scraper restarted). Please retry.",
        },
      }
    );

    // Check concurrency limit
    const maxConcurrent = PLAN_LIMITS[user.plan] || 1;
    const runningJobs = await ScrapeJob.countDocuments({
      userId: user._id,
      status: { $in: ["queued", "running"] },
    }).session(session);

    if (runningJobs >= maxConcurrent) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        data: { maxConcurrent, runningJobs },
        message: `You already have ${runningJobs} active job(s) running. Wait for it to finish before starting a new one.`,
      });
    }

    // Deduct credits atomically
    user.credits -= creditsNeeded;
    await user.save({ session });

    // Create job
    const job = await ScrapeJob.create(
      [
        {
          userId: user._id,
          queries: queries.map((q) => q.trim()).filter(Boolean),
          totalRecordsRequested,
          outputFilename: outputFilename || "output.xlsx",
          creditsUsed: creditsNeeded,
          progress: { current: 0, total: totalRecordsRequested },
          status: "queued",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const createdJob = job[0];

    // Dispatch to scraper microservice (fire-and-forget)
    axios
      .post(`${SCRAPER_URL}/scrape/start`, {
        jobId: createdJob._id.toString(),
        queries: createdJob.queries,
        totalRecordsRequested: createdJob.totalRecordsRequested,
        outputFilename: createdJob.outputFilename,
      })
      .then(() => console.log(`[JOBS] Dispatched job ${createdJob._id} to scraper`))
      .catch((err) =>
        console.error(`[JOBS] Failed to dispatch job ${createdJob._id}:`, err.message)
      );

    return res.status(201).json({
      success: true,
      data: createdJob,
      message: "Scrape job created and queued.",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("[JOBS] Create error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to create scrape job.",
    });
  }
});

// GET /api/jobs — List all jobs for current user
router.get("/", verifyJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ScrapeJob.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScrapeJob.countDocuments({ userId: req.user._id }),
    ]);

    return res.json({
      success: true,
      data: { jobs, total, page, pages: Math.ceil(total / limit) },
      message: "Jobs retrieved successfully.",
    });
  } catch (error) {
    console.error("[JOBS] List error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to retrieve jobs.",
    });
  }
});

// GET /api/jobs/:id — Get single job details + progress
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const job = await ScrapeJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Job not found.",
      });
    }

    // If job is running, fetch live progress from scraper
    if (job.status === "queued" || job.status === "running") {
      try {
        const { data } = await axios.get(
          `${SCRAPER_URL}/scrape/status/${job._id}`,
          { timeout: 3000 }
        );
        if (data && data.progress) {
          job.progress = data.progress;
          job.status = data.status || job.status;
        }
      } catch {
        // Scraper might not have started yet, use DB state
      }
    }

    return res.json({
      success: true,
      data: job,
      message: "Job retrieved successfully.",
    });
  } catch (error) {
    console.error("[JOBS] Detail error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to retrieve job.",
    });
  }
});

// GET /api/jobs/:id/logs — Proxy real-time scraper log lines
router.get("/:id/logs", verifyJWT, async (req, res) => {
  try {
    const { data } = await axios.get(
      `${SCRAPER_URL}/scrape/logs/${req.params.id}`,
      { timeout: 5000 }
    );
    return res.json({ logs: data.logs || [] });
  } catch (err) {
    // Scraper not running or job unknown — return empty gracefully
    console.warn(`[JOBS] Logs proxy failed for ${req.params.id}: ${err.message}`);
    return res.json({ logs: [] });
  }
});

// DELETE /api/jobs/:id — Cancel a queued or running job, refund credits
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const job = await ScrapeJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({ success: false, data: null, message: "Job not found." });
    }

    if (!["queued", "running"].includes(job.status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Cannot cancel a job with status "${job.status}".`,
      });
    }

    // Tell scraper to stop (best-effort)
    try {
      await axios.get(`${SCRAPER_URL}/scrape/cancel/${job._id}`, { timeout: 3000 });
    } catch {
      // Scraper may not know about it yet — that's fine
    }

    // Mark as failed + refund credits
    job.status = "failed";
    job.errorMessage = "Cancelled by user.";
    job.completedAt = new Date();
    await job.save();

    await User.findByIdAndUpdate(job.userId, { $inc: { credits: job.creditsUsed } });
    console.log(`[JOBS] Job ${job._id} cancelled. Refunded ${job.creditsUsed} credit(s).`);

    return res.json({ success: true, data: null, message: "Job cancelled and credits refunded." });
  } catch (error) {
    console.error("[JOBS] Cancel error:", error);
    return res.status(500).json({ success: false, data: null, message: "Failed to cancel job." });
  }
});

// POST /api/jobs/:id/retry — Clone a failed job and re-dispatch it
router.post("/:id/retry", verifyJWT, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const original = await ScrapeJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).session(session);

    if (!original) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, data: null, message: "Job not found." });
    }

    if (!["failed"].includes(original.status)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({
        success: false, data: null,
        message: "Only failed jobs can be retried.",
      });
    }

    const user = await User.findById(req.user._id).session(session);
    if (user.credits < original.creditsUsed) {
      await session.abortTransaction(); session.endSession();
      return res.status(402).json({
        success: false,
        data: { creditsNeeded: original.creditsUsed, creditsAvailable: user.credits },
        message: "Insufficient credits to retry.",
      });
    }

    user.credits -= original.creditsUsed;
    await user.save({ session });

    const [newJob] = await ScrapeJob.create([{
      userId: user._id,
      queries: original.queries,
      totalRecordsRequested: original.totalRecordsRequested,
      outputFilename: original.outputFilename,
      creditsUsed: original.creditsUsed,
      progress: { current: 0, total: original.totalRecordsRequested },
      status: "queued",
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Dispatch to scraper (fire-and-forget)
    axios.post(`${SCRAPER_URL}/scrape/start`, {
      jobId: newJob._id.toString(),
      queries: newJob.queries,
      totalRecordsRequested: newJob.totalRecordsRequested,
      outputFilename: newJob.outputFilename,
    }).catch((err) => console.error(`[JOBS] Retry dispatch failed:`, err.message));

    return res.status(201).json({ success: true, data: newJob, message: "Job retried." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("[JOBS] Retry error:", error);
    return res.status(500).json({ success: false, data: null, message: "Failed to retry job." });
  }
});

// GET /api/jobs/:id/download — Download the result Excel file
router.get("/:id/download", verifyJWT, async (req, res) => {
  try {
    const job = await ScrapeJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Job not found.",
      });
    }

    if (job.status !== "done" || !job.resultFile) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Job is not complete or has no result file.",
      });
    }

    // Fetch the file from scraper service
    try {
      const response = await axios.get(
        `${SCRAPER_URL}/scrape/download/${job._id}`,
        { responseType: "stream", timeout: 30000 }
      );

      const filename = job.outputFilename || "output.xlsx";
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      response.data.pipe(res);
    } catch (err) {
      console.error("[JOBS] Download error from scraper:", err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: "Failed to download file from scraper service.",
      });
    }
  } catch (error) {
    console.error("[JOBS] Download error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to download job result.",
    });
  }
});

// POST /internal/job-complete — Called by scraper when a job finishes
// Secured with INTERNAL_SECRET shared secret
router.post("/job-complete", async (req, res) => {
  // Verify shared secret to prevent unauthorised job-complete calls
  const secret = req.headers["x-internal-secret"] || req.body.internalSecret;
  if (process.env.INTERNAL_SECRET && secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ success: false, message: "Forbidden." });
  }
  try {
    const { jobId, resultFile, resultCount, status, errorMessage } = req.body;

    const job = await ScrapeJob.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    // If the job was already cancelled/finalized by the user, ignore the scraper callback.
    // This prevents a thread that kept running after "Kill Job" from overwriting the status
    // to "done" (which would let users get free scrapes and skip credit deduction).
    if (job.status === "failed" || job.status === "done") {
      console.log(`[JOBS] job-complete callback for ${jobId} ignored — already ${job.status}`);
      return res.json({ success: true, message: "Job already finalized, update skipped." });
    }

    if (status === "done") {
      job.status = "done";
      job.resultFile = resultFile;
      job.resultCount = resultCount || 0;
      job.completedAt = new Date();
      // Track lifetime credit usage on the user
      await User.findByIdAndUpdate(job.userId, { $inc: { totalCreditsUsed: job.creditsUsed } });
    } else if (status === "failed") {
      job.status = "failed";
      job.errorMessage = errorMessage || "Unknown error during scraping.";
      job.completedAt = new Date();

      // Refund credits on failure
      await User.findByIdAndUpdate(job.userId, {
        $inc: { credits: job.creditsUsed },
      });
      console.log(`[JOBS] Refunded ${job.creditsUsed} credits for failed job ${jobId}`);
    }

    await job.save();

    return res.json({ success: true, message: "Job updated." });
  } catch (error) {
    console.error("[JOBS] Internal complete error:", error);
    return res.status(500).json({ success: false, message: "Internal error." });
  }
});

module.exports = router;
