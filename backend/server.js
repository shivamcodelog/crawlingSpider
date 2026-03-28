require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const passport = require("./config/passport");
const connectDB = require("./config/db");

// ── Route imports ──
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const paymentRoutes = require("./routes/payments");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");

// ── Models (for traffic/error logging) ──
const TrafficLog = require("./models/TrafficLog");
const ErrorLog = require("./models/ErrorLog");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (required for Vercel / reverse proxies) ──
app.set("trust proxy", 1);

// ── Connect to MongoDB ──
connectDB();

// ── Security headers ──
app.use(helmet());

// ── CORS — supports comma-separated list of allowed origins ──
const allowedOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl) or matching origin
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Global rate limit: 1000 requests per 15 minutes per IP ──
// Polling (status + logs every 2s) consumes ~60 req/min, so 100 is far too low.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: "Too many requests. Please try again later.",
  },
});
app.use("/api/", limiter);

// ── Strict limiter for job creation only: 20 new jobs per 15 minutes ──
const createJobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: "Too many job creation requests. Please wait a few minutes.",
  },
});

// ── Logging ──
app.use(morgan("dev"));

// ── Stripe webhook needs raw body — must be before express.json() ──
app.use(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" })
);

// ── Body parsing ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Passport ──
app.use(passport.initialize());

// ── Traffic logging middleware ──
// Records every API request to MongoDB for admin analytics.
// Runs async so it never slows down responses.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/auth")) return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    // Normalize route (replace ObjectId-like segments with :id)
    const route = req.path.replace(/\/[a-f\d]{24}/gi, "/:id");
    const entry = {
      method: req.method,
      route,
      statusCode: res.statusCode,
      responseTimeMs: ms,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      hour: (() => { const d = new Date(); d.setMinutes(0,0,0); return d; })(),
    };
    // Attach userId if JWT was decoded
    if (req.user?._id) entry.userId = req.user._id;
    TrafficLog.create(entry).catch(() => {});
  });
  next();
});

// ── Routes ──
app.use("/auth", authRoutes);
// Apply strict limiter to job-creation endpoints only
app.use("/api/jobs/create", createJobLimiter);
app.use("/api/jobs", jobRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// ── Internal route for scraper callback (reuse jobs router) ──
// POST /internal/job-complete is defined in jobs.js
app.use("/internal", jobRoutes);

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "Server is running." });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error("[SERVER] Unhandled error:", err);
  // Persist error to DB for admin dashboard
  ErrorLog.create({
    level: "error",
    message: err.message || "Unknown error",
    stack: err.stack || null,
    route: req.path,
    method: req.method,
    statusCode: err.status || 500,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    userId: req.user?._id || null,
  }).catch(() => {});
  res.status(500).json({
    success: false,
    data: null,
    message: "Internal server error.",
  });
});

// ── Start server only when run directly (not in serverless) ──
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SERVER] MapScraper Pro backend running on port ${PORT}`);
  });
}

module.exports = app;
