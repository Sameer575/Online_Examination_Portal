const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema(
  {
    fieldName: {
      type: String,
      required: true,
      trim: true,
    },
    fieldLabel: {
      type: String,
      required: true,
      trim: true,
    },
    fieldType: {
      type: String,
      enum: ['text', 'number', 'email', 'textarea', 'select'],
      default: 'text',
    },
    options: {
      type: [String], // For select type
      default: [],
    },
    placeholder: {
      type: String,
      default: '',
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomField', customFieldSchema);

