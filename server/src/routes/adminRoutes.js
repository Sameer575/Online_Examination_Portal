const express = require('express');
const {
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
} = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/exams', getExams);
router.get('/exams/:examId', getExamDetails);
router.post('/exams', createExam);
router.put('/exams/:examId', updateExam);
router.delete('/exams/:examId', deleteExam);
router.post('/exams/:examId/questions', addQuestion);
router.delete('/exams/:examId/questions/:questionId', deleteQuestion);
router.get('/results', getResults);
router.get('/results/export', exportResultsCSV);
router.get('/results/export/:examId', (req, res) => {
  req.query.examId = req.params.examId;
  exportResultsCSV(req, res);
});
router.post('/exams/:examId/allow-retake', allowRetake);

// Custom Fields Routes
router.get('/custom-fields', getCustomFields);
router.post('/custom-fields', createCustomField);
router.put('/custom-fields/:fieldId', updateCustomField);
router.delete('/custom-fields/:fieldId', deleteCustomField);
router.post('/custom-fields/toggle-requirement', toggleCustomFieldsRequirement);

module.exports = router;

