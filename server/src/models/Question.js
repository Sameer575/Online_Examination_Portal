const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    questionNumber: {
      type: Number,
      default: null,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    correctOption: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      default: 'A',
    },
    correctOptions: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          // If correctOptions is provided, it should be an array of 'A', 'B', 'C', 'D'
          if (v.length === 0) return true;
          return v.every(opt => ['A', 'B', 'C', 'D'].includes(opt));
        },
        message: 'Correct options must be A, B, C, or D'
      }
    },
    isMultipleChoice: {
      type: Boolean,
      default: false,
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
      min: 0.5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);

