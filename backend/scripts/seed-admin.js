/**
 * Creates or promotes an admin user with email + password login.
 *
 * Usage (from backend/ directory):
 *   node scripts/seed-admin.js <email> <password> [name]
 *
 * Example:
 *   node scripts/seed-admin.js shivamcodelog@gmail.com MySecret123 Shivam
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const [email, password, name = "Admin"] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/seed-admin.js <email> <password> [name]");
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri, { dbName: "mapscraper" });
  console.log("Connected to MongoDB (mapscraper db).");

  const hash = await bcrypt.hash(password, 12);

  let user = await User.findOne({ email });

  if (user) {
    // Update existing user
    user.role = "admin";
    user.password = hash;
    if (name !== "Admin") user.name = name;
    await user.save({ validateModifiedOnly: true });
    console.log(`✅ Existing user "${user.name}" (${user.email}) updated → ADMIN with password set.`);
  } else {
    // Create new user
    user = await User.create({
      name,
      email,
      password: hash,
      role: "admin",
      plan: "enterprise",
      credits: 99999,
    });
    console.log(`✅ New admin user "${user.name}" (${user.email}) created.`);
  }

  console.log(`\n   Login at: http://localhost:3000/login`);
  console.log(`   Email   : ${user.email}`);
  console.log(`   Password: (the one you provided)`);
  console.log(`   Role    : ${user.role}\n`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
