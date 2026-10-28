'use strict';
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL must be configured before the service can start');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 0
  });
  console.log('MongoDB connected');
}
module.exports = connectDB;
