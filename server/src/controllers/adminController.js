const Exam = require('../models/Exam');
const Question = require('../models/Question');
const User = require('../models/User');
const Result = require('../models/Result');
const ExamAttempt = require('../models/ExamAttempt');
const CustomField = require('../models/CustomField');

const getAdminStats = async (_req, res) => {
  try {
    const [studentCount, examCount, attemptCount] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Exam.countDocuments(),
      Result.countDocuments(),
    ]);

    res.json({
      students: studentCount,
      exams: examCount,
      attempts: attemptCount,
    });
  } catch (error) {
    console.error('getAdminStats error', error);
    res.status(500).json({ message: 'Failed to load stats' });
  }
};

const createExam = async (req, res) => {
  try {
    const {
      examTitle,
      durationMinutes,
      disclaimer,
      passPercentage,
      scheduleStart,
      scheduleEnd,
    } = req.body;
    if (!examTitle || !durationMinutes) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    const examData = {
      examTitle,
      durationMinutes,
      disclaimer: disclaimer || '',
      passPercentage: passPercentage || 50,
      scheduleStart: scheduleStart ? new Date(scheduleStart) : null,
      scheduleEnd: scheduleEnd ? new Date(scheduleEnd) : null,
    };

    const exam = await Exam.create(examData);
    res.status(201).json(exam);
  } catch (error) {
    console.error('createExam error', error);
    res.status(500).json({ message: 'Failed to create exam' });
  }
};

const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const {
      examTitle,
      durationMinutes,
      disclaimer,
      passPercentage,
      isActive,
      scheduleStart,
      scheduleEnd,
    } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (examTitle !== undefined) exam.examTitle = examTitle;
    if (durationMinutes !== undefined) exam.durationMinutes = durationMinutes;
    if (disclaimer !== undefined) exam.disclaimer = disclaimer;
    if (passPercentage !== undefined) exam.passPercentage = passPercentage;
    if (isActive !== undefined) exam.isActive = isActive;
    if (scheduleStart !== undefined) exam.scheduleStart = scheduleStart ? new Date(scheduleStart) : null;
    if (scheduleEnd !== undefined) exam.scheduleEnd = scheduleEnd ? new Date(scheduleEnd) : null;

    await exam.save();
    res.json(exam);
  } catch (error) {
    console.error('updateExam error', error);
    res.status(500).json({ message: 'Failed to update exam' });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Delete all questions for this exam
    await Question.deleteMany({ exam: examId });
    // Delete exam attempts
    await ExamAttempt.deleteMany({ exam: examId });
    // Delete results
    await Result.deleteMany({ exam: examId });
    // Delete exam
    await Exam.deleteOne({ _id: examId });

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('deleteExam error', error);
    res.status(500).json({ message: 'Failed to delete exam' });
  }
};

const getExams = async (_req, res) => {
  try {
    const exams = await Exam.find()
      .sort({ createdAt: -1 })
      .lean();

    const examIds = exams.map((exam) => exam._id);
    
    // Get question counts
    const questionCounts = await Question.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: '$exam', count: { $sum: 1 } } },
    ]);

    // Get attempt counts (exam reach)
    const attemptCounts = await ExamAttempt.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: '$exam', count: { $sum: 1 } } },
    ]);

    // Get completed attempt counts
    const completedCounts = await Result.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: '$exam', count: { $sum: 1 } } },
    ]);

    const questionMap = questionCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const attemptMap = attemptCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const completedMap = completedCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const response = exams.map((exam) => ({
      ...exam,
      questionCount: questionMap[exam._id.toString()] || 0,
      reach: attemptMap[exam._id.toString()] || 0,
      completed: completedMap[exam._id.toString()] || 0,
    }));

    res.json(response);
  } catch (error) {
    console.error('getExams error', error);
    res.status(500).json({ message: 'Failed to load exams' });
  }
};

const addQuestion = async (req, res) => {
  try {
    const { examId } = req.params;
    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      correctOptions,
      isMultipleChoice,
      questionNumber,
      marks,
    } = req.body;

    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      return res.status(400).json({ message: 'Question and all options are required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Validate multiple choice
    if (isMultipleChoice) {
      if (!correctOptions || !Array.isArray(correctOptions) || correctOptions.length === 0) {
        return res.status(400).json({ message: 'Multiple correct options required for multiple choice question' });
      }
    } else {
      if (!correctOption) {
        return res.status(400).json({ message: 'Correct option is required' });
      }
    }

    const questionData = {
      exam: examId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      isMultipleChoice: isMultipleChoice || false,
      marks: marks && marks > 0 ? parseFloat(marks) : 1,
    };

    if (questionNumber !== undefined) {
      questionData.questionNumber = questionNumber;
    }

    if (isMultipleChoice) {
      questionData.correctOptions = correctOptions;
    } else {
      questionData.correctOption = correctOption;
    }

    const question = await Question.create(questionData);
    res.status(201).json(question);
  } catch (error) {
    console.error('addQuestion error', error);
    res.status(500).json({ message: 'Failed to add question' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const question = await Question.findOne({ _id: questionId, exam: examId });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await Question.deleteOne({ _id: questionId });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('deleteQuestion error', error);
    res.status(500).json({ message: 'Failed to delete question' });
  }
};

const getExamDetails = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const questions = await Question.find({ exam: examId }).sort({ questionNumber: 1, createdAt: 1 });
    const attempts = await ExamAttempt.countDocuments({ exam: examId });
    const completed = await Result.countDocuments({ exam: examId });
    const results = await Result.find({ exam: examId })
      .populate('student', 'name phone')
      .sort({ submittedAt: -1 });

    res.json({
      exam,
      questions,
      stats: {
        totalQuestions: questions.length,
        reach: attempts,
        completed,
      },
      results,
    });
  } catch (error) {
    console.error('getExamDetails error', error);
    res.status(500).json({ message: 'Failed to load exam details' });
  }
};

const getResults = async (_req, res) => {
  try {
    const results = await Result.find()
      .populate('student', 'name phone')
      .populate('exam', 'examTitle')
      .sort({ submittedAt: -1 });

    res.json(results);
  } catch (error) {
    console.error('getResults error', error);
    res.status(500).json({ message: 'Failed to load results' });
  }
};

const allowRetake = async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentId } = req.body;

    const attempt = await ExamAttempt.findOne({ exam: examId, student: studentId });
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    await ExamAttempt.deleteOne({ _id: attempt._id });
    await Result.deleteOne({ exam: examId, student: studentId });

    res.json({ message: 'Student can retake the exam now' });
  } catch (error) {
    console.error('allowRetake error', error);
    res.status(500).json({ message: 'Failed to allow retake' });
  }
};

const exportResultsCSV = async (req, res) => {
  try {
    const { examId } = req.query;
    
    let results;
    if (examId) {
      // Export results for specific exam
      results = await Result.find({ exam: examId })
        .populate('student', 'name phone')
        .populate('exam', 'examTitle')
        .sort({ submittedAt: -1 })
        .lean();
    } else {
      // Export all results
      results = await Result.find()
        .populate('student', 'name phone')
        .populate('exam', 'examTitle')
        .sort({ submittedAt: -1 })
        .lean();
    }

    // Generate CSV content
    const headers = [
      'Student Name',
      'Phone Number',
      'Exam Title',
      'Correct Answers',
      'Total Questions',
      'Obtained Marks',
      'Total Marks',
      'Percentage',
      'Pass Percentage',
      'Status',
      'Submitted At'
    ];

    const rows = results.map((result) => [
      result.student?.name || 'N/A',
      result.student?.phone || 'N/A',
      result.exam?.examTitle || 'N/A',
      result.score,
      result.totalQuestions,
      result.obtainedMarks?.toFixed(1) || result.score,
      result.totalMarks?.toFixed(1) || result.totalQuestions,
      result.percentage,
      result.passPercentage || 50,
      result.passed ? 'Passed' : 'Failed',
      new Date(result.submittedAt).toLocaleString()
    ]);

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Set response headers for CSV download
    const filename = examId ? `exam-results-${examId}.csv` : 'all-results.csv';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('exportResultsCSV error', error);
    res.status(500).json({ message: 'Failed to export results' });
  }
};

// Custom Fields Management
const getCustomFields = async (_req, res) => {
  try {
    const fields = await CustomField.find().sort({ order: 1, createdAt: 1 });
    res.json(fields);
  } catch (error) {
    console.error('getCustomFields error', error);
    res.status(500).json({ message: 'Failed to load custom fields' });
  }
};

const createCustomField = async (req, res) => {
  try {
    const { fieldName, fieldLabel, fieldType, options, placeholder, isRequired, order } = req.body;

    if (!fieldName || !fieldLabel) {
      return res.status(400).json({ message: 'Field name and label are required' });
    }

    // Check if field name already exists
    const existing = await CustomField.findOne({ fieldName });
    if (existing) {
      return res.status(400).json({ message: 'Field name already exists' });
    }

    const field = await CustomField.create({
      fieldName,
      fieldLabel,
      fieldType: fieldType || 'text',
      options: fieldType === 'select' && options ? options : [],
      placeholder: placeholder || '',
      isRequired: isRequired || false,
      order: order || 0,
      isEnabled: true,
    });

    res.status(201).json(field);
  } catch (error) {
    console.error('createCustomField error', error);
    res.status(500).json({ message: 'Failed to create custom field' });
  }
};

const updateCustomField = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { fieldLabel, fieldType, options, placeholder, isRequired, isEnabled, order } = req.body;

    const field = await CustomField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ message: 'Custom field not found' });
    }

    if (fieldLabel !== undefined) field.fieldLabel = fieldLabel;
    if (fieldType !== undefined) {
      field.fieldType = fieldType;
      // Clear options if not select type
      if (fieldType !== 'select') {
        field.options = [];
      }
    }
    if (options !== undefined) field.options = options;
    if (placeholder !== undefined) field.placeholder = placeholder;
    if (isRequired !== undefined) field.isRequired = isRequired;
    if (isEnabled !== undefined) field.isEnabled = isEnabled;
    if (order !== undefined) field.order = order;

    await field.save();
    res.json(field);
  } catch (error) {
    console.error('updateCustomField error', error);
    res.status(500).json({ message: 'Failed to update custom field' });
  }
};

const deleteCustomField = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const field = await CustomField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ message: 'Custom field not found' });
    }

    await CustomField.deleteOne({ _id: fieldId });
    res.json({ message: 'Custom field deleted successfully' });
  } catch (error) {
    console.error('deleteCustomField error', error);
    res.status(500).json({ message: 'Failed to delete custom field' });
  }
};

const toggleCustomFieldsRequirement = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Update all enabled fields to be required if global toggle is on
    if (enabled) {
      await CustomField.updateMany(
        { isEnabled: true },
        { $set: { isRequired: true } }
      );
    } else {
      // When disabled, make all fields optional (but keep their individual settings)
      await CustomField.updateMany(
        {},
        { $set: { isRequired: false } }
      );
    }

    res.json({ 
      message: enabled 
        ? 'Custom fields are now mandatory for student signup' 
        : 'Custom fields are now optional',
      enabled 
    });
  } catch (error) {
    console.error('toggleCustomFieldsRequirement error', error);
    res.status(500).json({ message: 'Failed to toggle custom fields requirement' });
  }
};

module.exports = {
  getAdminStats,
  createExam,
  updateExam,
  deleteExam,
  getExams,
  getExamDetails,
  addQuestion,
  deleteQuestion,
  getResults,
  allowRetake,
  exportResultsCSV,
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  toggleCustomFieldsRequirement,
};

