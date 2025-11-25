const mongoose = require('mongoose');

const connectDB = async () => {
  const connectionString =
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/modern-exam';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(connectionString);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

