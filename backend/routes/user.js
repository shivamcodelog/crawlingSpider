const router = require("express").Router();
const { verifyJWT } = require("../middleware/authMiddleware");
const User = require("../models/User");
const ScrapeJob = require("../models/ScrapeJob");

// GET /api/user/profile — Get current user profile
router.get("/profile", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-__v -googleId")
      .lean();

    return res.json({
      success: true,
      data: user,
      message: "Profile retrieved.",
    });
  } catch (error) {
    console.error("[USER] Profile error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to retrieve profile.",
    });
  }
});

// PUT /api/user/profile — Update user name
router.put("/profile", verifyJWT, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Name is required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    )
      .select("-__v -googleId")
      .lean();

    return res.json({
      success: true,
      data: user,
      message: "Profile updated.",
    });
  } catch (error) {
    console.error("[USER] Profile update error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to update profile.",
    });
  }
});

// GET /api/user/stats — Get user statistics
router.get("/stats", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalJobs, completedJobs, failedJobs, totalRecords] =
      await Promise.all([
        ScrapeJob.countDocuments({ userId }),
        ScrapeJob.countDocuments({ userId, status: "done" }),
        ScrapeJob.countDocuments({ userId, status: "failed" }),
        ScrapeJob.aggregate([
          { $match: { userId, status: "done" } },
          { $group: { _id: null, total: { $sum: "$resultCount" } } },
        ]),
      ]);

    const recordsScraped = totalRecords[0]?.total || 0;
    const successRate =
      totalJobs > 0
        ? Math.round((completedJobs / (completedJobs + failedJobs || 1)) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        credits: req.user.credits,
        totalJobs,
        completedJobs,
        failedJobs,
        recordsScraped,
        successRate,
      },
      message: "Stats retrieved.",
    });
  } catch (error) {
    console.error("[USER] Stats error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to retrieve stats.",
    });
  }
});

module.exports = router;
