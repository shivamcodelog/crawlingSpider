const mongoose = require("mongoose");

const ScrapeJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    queries: [{ type: String, required: true }],
    totalRecordsRequested: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "done", "failed"],
      default: "queued",
    },
    progress: {
      current: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    resultFile: { type: String, default: null },
    resultCount: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    outputFilename: { type: String, default: "output.xlsx" },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScrapeJob", ScrapeJobSchema);
