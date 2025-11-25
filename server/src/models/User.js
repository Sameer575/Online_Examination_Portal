const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: function(v) {
          // Must be exactly 10 digits
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Phone number must be exactly 10 digits'
      }
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Store custom field values as {fieldName: value}
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

