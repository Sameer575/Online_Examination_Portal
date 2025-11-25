const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    examTitle: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    disclaimer: {
      type: String,
      default: '',
      trim: true,
    },
    passPercentage: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    scheduleStart: {
      type: Date,
      default: null,
    },
    scheduleEnd: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);

