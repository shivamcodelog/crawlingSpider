/**
 * MapScraper Pro — Admin API Routes
 * All routes require verifyJWT + requireAdmin.
 * Prefix: /api/admin
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { verifyJWT } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const ScrapeJob = require("../models/ScrapeJob");
const Payment = require("../models/Payment");
const ErrorLog = require("../models/ErrorLog");
const TrafficLog = require("../models/TrafficLog");

// Apply auth + admin check to all routes in this file
router.use(verifyJWT, requireAdmin);

// ─────────────────────────────────────────
// helpers
// ─────────────────────────────────────────
function last30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function fillSeries(raw, dateKey = "_id") {
  const map = {};
  raw.forEach((r) => { map[r[dateKey]] = r; });
  return last30Days().map((d) => ({ date: d, ...map[d] }));
}

// ─────────────────────────────────────────
// GET /api/admin/overview
// ─────────────────────────────────────────
router.get("/overview", async (req, res) => {
  try {
    const [
      totalUsers,
      newUsersToday,
      activeJobsNow,
      totalJobs,
      doneJobs,
      failedJobs,
      totalRevenueAgg,
      totalCreditsUsed,
      recentErrors,
      planBreakdown,
      jobStatusBreakdown,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setUTCHours(0,0,0,0)) } }),
      ScrapeJob.countDocuments({ status: { $in: ["queued", "running"] } }),
      ScrapeJob.countDocuments(),
      ScrapeJob.countDocuments({ status: "done" }),
      ScrapeJob.countDocuments({ status: "failed" }),
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" }, currency: { $first: "$currency" } } },
      ]),
      User.aggregate([{ $group: { _id: null, total: { $sum: "$totalCreditsUsed" } } }]),
      ErrorLog.find({ resolved: false }).sort({ createdAt: -1 }).limit(5).lean(),
      User.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
      ScrapeJob.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    // Jobs per day (last 30)
    const jobsPerDay = await ScrapeJob.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue per day (last 30)
    const revenuePerDay = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // New users per day (last 30)
    const usersPerDay = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;
    const creditsUsed = totalCreditsUsed[0]?.total ?? 0;

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          newUsersToday,
          activeJobsNow,
          totalJobs,
          doneJobs,
          failedJobs,
          totalRevenue,
          creditsUsed,
          unresolvedErrors: recentErrors.length,
        },
        planBreakdown,
        jobStatusBreakdown,
        charts: {
          jobsPerDay: fillSeries(jobsPerDay),
          revenuePerDay: fillSeries(revenuePerDay),
          usersPerDay: fillSeries(usersPerDay),
        },
        recentErrors,
      },
    });
  } catch (err) {
    console.error("[ADMIN] overview error:", err);
    return res.status(500).json({ success: false, message: "Failed to load overview." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/users?page=1&limit=20&search=&plan=&role=
// ─────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const re = new RegExp(req.query.search, "i");
      filter.$or = [{ name: re }, { email: re }];
    }
    if (req.query.plan) filter.plan = req.query.plan;
    if (req.query.role) filter.role = req.query.role;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v")
        .lean(),
      User.countDocuments(filter),
    ]);

    // Attach job counts per user
    const userIds = users.map((u) => u._id);
    const jobCounts = await ScrapeJob.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
    ]);
    const jobMap = {};
    jobCounts.forEach((j) => { jobMap[j._id.toString()] = j; });

    const enriched = users.map((u) => ({
      ...u,
      jobStats: jobMap[u._id.toString()] || { total: 0, done: 0 },
    }));

    return res.json({
      success: true,
      data: { users: enriched, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[ADMIN] users error:", err);
    return res.status(500).json({ success: false, message: "Failed to load users." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/users/:id  — single user detail
// ─────────────────────────────────────────
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-__v").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const [jobs, payments] = await Promise.all([
      ScrapeJob.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Payment.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    return res.json({ success: true, data: { user, jobs, payments } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load user." });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/users/:id — update role / plan / credits / ban
// ─────────────────────────────────────────
router.patch("/users/:id", async (req, res) => {
  try {
    const { role, plan, credits, isBanned, creditsAdjust } = req.body;
    const update = {};
    if (role !== undefined) update.role = role;
    if (plan !== undefined) update.plan = plan;
    if (credits !== undefined) update.credits = credits;
    if (isBanned !== undefined) update.isBanned = isBanned;

    let user;
    if (creditsAdjust !== undefined) {
      // Atomic increment
      user = await User.findByIdAndUpdate(
        req.params.id,
        { $inc: { credits: creditsAdjust }, ...update },
        { new: true, select: "-__v" }
      );
    } else {
      user = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: "-__v" });
    }

    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, data: user, message: "User updated." });
  } catch (err) {
    console.error("[ADMIN] patch user error:", err);
    return res.status(500).json({ success: false, message: "Failed to update user." });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/users/:id
// ─────────────────────────────────────────
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account." });
    }
    await User.findByIdAndDelete(req.params.id);
    await ScrapeJob.deleteMany({ userId: req.params.id });
    await Payment.deleteMany({ userId: req.params.id });
    return res.json({ success: true, message: "User and all their data deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete user." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/jobs?page=1&status=&userId=
// ─────────────────────────────────────────
router.get("/jobs", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.userId = new mongoose.Types.ObjectId(req.query.userId);

    const [jobs, total] = await Promise.all([
      ScrapeJob.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email avatar plan")
        .lean(),
      ScrapeJob.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { jobs, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load jobs." });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/jobs/:id — force-delete any job
// ─────────────────────────────────────────
router.delete("/jobs/:id", async (req, res) => {
  try {
    const job = await ScrapeJob.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    return res.json({ success: true, message: "Job deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete job." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/revenue?days=30
// ─────────────────────────────────────────
router.get("/revenue", async (req, res) => {
  try {
    const days = Math.min(365, parseInt(req.query.days) || 30);
    const since = new Date(Date.now() - days * 86400000);

    const [
      payments,
      totalRevenue,
      totalTransactions,
      revenueByPlan,
      revenueByProvider,
      revenuePerDay,
    ] = await Promise.all([
      Payment.find({ status: "success", createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .populate("userId", "name email")
        .lean(),
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments({ status: "success" }),
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: "$plan", revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
      ]),
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: "$provider", revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue[0]?.total ?? 0,
          totalTransactions,
        },
        revenueByPlan,
        revenueByProvider,
        revenuePerDay: fillSeries(revenuePerDay),
        recentPayments: payments.slice(0, 50),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load revenue." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/traffic?hours=24
// ─────────────────────────────────────────
router.get("/traffic", async (req, res) => {
  try {
    const hours = Math.min(168, parseInt(req.query.hours) || 24);
    const since = new Date(Date.now() - hours * 3600000);

    const [requestsPerHour, topRoutes, statusBreakdown, totalRequests] = await Promise.all([
      TrafficLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$createdAt" } },
            count: { $sum: 1 },
            avgResponseMs: { $avg: "$responseTimeMs" },
            errors: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TrafficLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$route", count: { $sum: 1 }, avgMs: { $avg: "$responseTimeMs" } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      TrafficLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$statusCode", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      TrafficLog.countDocuments({ createdAt: { $gte: since } }),
    ]);

    return res.json({
      success: true,
      data: { requestsPerHour, topRoutes, statusBreakdown, totalRequests },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load traffic." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/errors?page=1&level=&resolved=
// ─────────────────────────────────────────
router.get("/errors", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.level) filter.level = req.query.level;
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === "true";

    const [errors, total, unresolvedCount] = await Promise.all([
      ErrorLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email")
        .lean(),
      ErrorLog.countDocuments(filter),
      ErrorLog.countDocuments({ resolved: false }),
    ]);

    return res.json({
      success: true,
      data: { errors, total, unresolvedCount, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load errors." });
  }
});

// PATCH /api/admin/errors/:id/resolve
router.patch("/errors/:id/resolve", async (req, res) => {
  try {
    await ErrorLog.findByIdAndUpdate(req.params.id, { resolved: true });
    return res.json({ success: true, message: "Marked as resolved." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update." });
  }
});

// DELETE /api/admin/errors — clear all resolved
router.delete("/errors", async (req, res) => {
  try {
    const { deletedCount } = await ErrorLog.deleteMany({ resolved: true });
    return res.json({ success: true, message: `Deleted ${deletedCount} resolved errors.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to clear." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/user-map  — user count by country
// ─────────────────────────────────────────
router.get("/user-map", async (req, res) => {
  try {
    const byCountry = await User.aggregate([
      { $match: { country: { $ne: null } } },
      { $group: { _id: "$country", code: { $first: "$countryCode" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = await User.countDocuments();
    const withLocation = await User.countDocuments({ country: { $ne: null } });

    return res.json({
      success: true,
      data: { byCountry, total, withLocation },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load user map." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/credits-stats
// ─────────────────────────────────────────
router.get("/credits-stats", async (req, res) => {
  try {
    const [creditsPerDay, topUsers] = await Promise.all([
      ScrapeJob.aggregate([
        { $match: { status: "done", createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            creditsUsed: { $sum: "$creditsUsed" },
            jobs: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.find()
        .sort({ totalCreditsUsed: -1 })
        .limit(10)
        .select("name email plan totalCreditsUsed credits")
        .lean(),
    ]);

    return res.json({
      success: true,
      data: { creditsPerDay: fillSeries(creditsPerDay), topUsers },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load credits stats." });
  }
});

// ─────────────────────────────────────────
// POST /api/admin/broadcast-credits  — add credits to ALL users
// ─────────────────────────────────────────
router.post("/broadcast-credits", async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid credit amount." });
    }
    const result = await User.updateMany({}, { $inc: { credits: amount } });
    console.log(`[ADMIN] Broadcast ${amount} credits to ${result.modifiedCount} users. Reason: ${reason}`);
    return res.json({
      success: true,
      message: `Added ${amount} credits to ${result.modifiedCount} users.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to broadcast credits." });
  }
});

module.exports = router;
