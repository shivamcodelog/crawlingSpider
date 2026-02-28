/**
 * Run once to promote a user to admin role:
 *   node scripts/make-admin.js user@example.com
 *
 * From the backend/ directory:
 *   node scripts/make-admin.js your@email.com
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const User = require("../models/User");

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/make-admin.js <email>");
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri, { dbName: "mapscraper" });
  console.log("Connected to MongoDB.");

  const user = await User.findOneAndUpdate(
    { email },
    { role: "admin" },
    { new: true }
  );

  if (!user) {
    console.error(`No user found with email: ${email}`);
  } else {
    console.log(`✅ User "${user.name}" (${user.email}) is now ADMIN.`);
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
