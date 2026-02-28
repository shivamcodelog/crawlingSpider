const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, default: null, sparse: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String }, // for local (admin) login
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBanned: { type: Boolean, default: false },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    credits: { type: Number, default: 5 },
    totalCreditsUsed: { type: Number, default: 0 },
    stripeCustomerId: { type: String, default: null },
    razorpayCustomerId: { type: String, default: null },
    // Geo tracking
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    city: { type: String, default: null },
    lastIp: { type: String, default: null },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
