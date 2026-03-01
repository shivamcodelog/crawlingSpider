const mongoose = require("mongoose");

// Cache the connection promise so serverless invocations reuse it
// instead of opening a new connection on every request.
let cached = global._mongooseConnection;

const connectDB = async () => {
  if (cached && mongoose.connection.readyState === 1) {
    return; // already connected
  }

  if (!cached) {
    cached = mongoose.connect(process.env.MONGO_URI, {
      dbName: "mapscraper",
      bufferCommands: false,
    });
    global._mongooseConnection = cached;
  }

  try {
    const conn = await cached;
    console.log(`[DB] MongoDB connected: ${conn.connection?.host || "cached"}`);
  } catch (error) {
    console.error(`[DB] Connection error: ${error.message}`);
    // Reset both so the next request retries a fresh connection
    cached = null;
    global._mongooseConnection = null;
    throw error;
  }
};

module.exports = connectDB;
