const { verifyJWT } = require("./authMiddleware");

/**
 * Admin guard — must come after verifyJWT (or includes it).
 * Allows only users with role === "admin".
 */
const requireAdmin = async (req, res, next) => {
  // Re-use verifyJWT to populate req.user if not already done
  if (!req.user) {
    return verifyJWT(req, res, () => checkAdmin(req, res, next));
  }
  checkAdmin(req, res, next);
};

function checkAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      data: null,
      message: "Access denied. Admin only.",
    });
  }
  next();
}

module.exports = { requireAdmin };
