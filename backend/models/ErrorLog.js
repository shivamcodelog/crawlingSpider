const mongoose = require("mongoose");

const ErrorLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ["error", "warn", "info"], default: "error" },
    message: { type: String, required: true },
    stack: { type: String, default: null },
    route: { type: String, default: null },
    method: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    statusCode: { type: Number, default: 500 },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-expire logs after 30 days
ErrorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model("ErrorLog", ErrorLogSchema);
