const mongoose = require("mongoose");

const TrafficLogSchema = new mongoose.Schema(
  {
    method: { type: String },
    route: { type: String },
    statusCode: { type: Number },
    responseTimeMs: { type: Number },
    ip: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userAgent: { type: String, default: null },
    // Bucketed hour timestamp for aggregation (e.g. 2026-02-28T14:00:00Z)
    hour: { type: Date },
  },
  { timestamps: true }
);

// Auto-expire traffic logs after 7 days
TrafficLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
TrafficLogSchema.index({ hour: 1 });

module.exports = mongoose.model("TrafficLog", TrafficLogSchema);
