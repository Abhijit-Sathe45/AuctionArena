const mongoose = require('mongoose');
const { MONGO_URI } = require('../config');

async function connectDB() {
  // Log connection issues instead of letting them crash the whole server — mongoose/the MongoDB
  // driver automatically retries and reconnects in the background, so a transient network drop
  // (WiFi hiccup, IPv6/NAT64 routing quirks, etc.) should not take the app down.
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error (will auto-retry):', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — attempting to reconnect...');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected.');
  });

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // fail fast (10s) instead of hanging if Atlas is unreachable
      socketTimeoutMS: 20000,
      maxPoolSize: 20, // reuse a pool of connections across requests instead of opening new ones
      family: 4, // force IPv4 — avoids flaky NAT64/IPv6-translated addresses some networks route through
    });
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;