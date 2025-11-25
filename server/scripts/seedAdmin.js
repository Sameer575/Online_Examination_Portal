/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const seed = async () => {
  try {
    await connectDB();

    const phone = '8607857210';
    const name = 'Admin';
    const password = 'Sameer123@';

    // Check if admin exists
    let admin = await User.findOne({ phone }).select('+password');
    
    if (admin) {
      // Update existing admin password if needed
      admin.password = password;
      admin.markModified('password'); // Ensure password is rehashed
      admin.name = name;
      admin.role = 'admin';
      await admin.save();
      console.log('Admin updated:', { phone: admin.phone, name: admin.name, role: admin.role });
    } else {
      // Create new admin
      admin = await User.create({
        phone,
        name,
        password,
        role: 'admin',
      });
      console.log('Admin created:', { phone: admin.phone, name: admin.name, role: admin.role });
    }
  } catch (error) {
    console.error('Seed admin failed', error);
  } finally {
    await mongoose.connection.close();
  }
};

seed();

