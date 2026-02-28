const router = require("express").Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { verifyJWT } = require("../middleware/authMiddleware");
const User = require("../models/User");

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Geo-IP lookup (best-effort; silently fails on localhost)
async function updateGeoAndActivity(userId, ip) {
  try {
    const isLocal = !ip || ["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(ip);
    const update = { lastActiveAt: new Date(), lastIp: ip };
    if (!isLocal) {
      const { data } = await axios.get(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,status`, { timeout: 3000 });
      if (data.status === "success") {
        update.country = data.country;
        update.countryCode = data.countryCode;
        update.city = data.city;
      }
    }
    await User.findByIdAndUpdate(userId, update);
  } catch (_) { /* silent */ }
}

// GET /auth/google — Redirect to Google OAuth consent screen
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// GET /auth/google/callback — Handle Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`,
  }),
  (req, res) => {
    const token = generateToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    // Fire-and-forget geo+activity update
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress;
    updateGeoAndActivity(req.user._id, ip);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// POST /auth/logout — Clear session (stateless JWT, so just acknowledge)
router.post("/logout", (req, res) => {
  return res.json({
    success: true,
    data: null,
    message: "Logged out successfully. Please remove token on client.",
  });
});

// GET /auth/me — Return current authenticated user
router.get("/me", verifyJWT, (req, res) => {
  const u = req.user;
  if (u.isBanned) {
    return res.status(403).json({ success: false, data: null, message: "Your account has been banned." });
  }
  return res.json({
    success: true,
    data: {
      _id: u._id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      plan: u.plan,
      credits: u.credits,
      role: u.role,
      createdAt: u.createdAt,
    },
    message: "User retrieved successfully.",
  });
});

// POST /auth/register — Local email/password registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "name, email and password are required." });
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: "Email already in use." });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    const token = generateToken(user);
    return res.status(201).json({ success: true, data: { token }, message: "Registered successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /auth/login — Local email/password login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "email and password are required." });
    const user = await User.findOne({ email }).lean();
    if (!user || !user.password)
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    if (user.isBanned)
      return res.status(403).json({ success: false, message: "Account banned." });
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress;
    updateGeoAndActivity(user._id, ip);
    const token = generateToken(user);
    return res.json({ success: true, data: { token }, message: "Logged in successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
