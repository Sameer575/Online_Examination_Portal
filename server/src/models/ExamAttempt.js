const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedOption: {
      type: mongoose.Schema.Types.Mixed, // Can be String for single choice or Array/String for multiple choice
      required: true,
    },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'expired'],
      default: 'not_started',
    },
    startedAt: Date,
    expiresAt: Date,
    submittedAt: Date,
    score: Number,
    totalQuestions: Number,
    answers: [answerSchema],
    questionOrder: [String], // Store randomized question order
    optionMappings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Maps questionId to option mapping object
    },
  },
  { timestamps: true }
);

examAttemptSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);

