const express = require('express');
const {
  getProfile,
  listExams,
  startExam,
  getExamQuestions,
  submitExam,
  getResult,
} = require('../controllers/studentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, requireRole('student'));

router.get('/me', getProfile);
router.get('/exams', listExams);
router.post('/exams/:examId/start', startExam);
router.get('/exams/:examId/questions', getExamQuestions);
router.post('/exams/:examId/submit', submitExam);
router.get('/exams/:examId/result', getResult);

module.exports = router;

