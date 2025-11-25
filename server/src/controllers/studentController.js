const dayjs = require('dayjs');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Result = require('../models/Result');

// Shuffle array function
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const buildStatus = (attempt) => {
  if (!attempt) return 'not_attempted';
  if (attempt.status === 'submitted') return 'completed';
  if (attempt.status === 'expired') return 'expired';
  return 'in_progress';
};

const guardActiveAttempt = (attempt) => {
  if (!attempt) return { attempt, expired: false };

  if (attempt.status === 'submitted' || attempt.status === 'expired') {
    return { attempt, expired: attempt.status === 'expired' };
  }

  if (attempt.expiresAt && dayjs().isAfter(dayjs(attempt.expiresAt))) {
    attempt.status = 'expired';
    attempt.save();
    return { attempt, expired: true };
  }

  return { attempt, expired: false };
};

const getProfile = (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    phone: req.user.phone,
    role: req.user.role,
  });
};

const listExams = async (req, res) => {
  try {
    const now = dayjs();
    const exams = await Exam.find({ isActive: true }).sort({ createdAt: -1 });
    const attempts = await ExamAttempt.find({ student: req.user._id });
    const attemptMap = attempts.reduce((acc, attempt) => {
      acc[attempt.exam.toString()] = attempt;
      return acc;
    }, {});

    const payload = exams
      .filter((exam) => {
        // Filter exams based on schedule
        if (exam.scheduleStart && dayjs(exam.scheduleStart).isAfter(now)) {
          return false; // Exam not started yet
        }
        if (exam.scheduleEnd && dayjs(exam.scheduleEnd).isBefore(now)) {
          return false; // Exam ended
        }
        return true;
      })
      .map((exam) => {
        const attempt = attemptMap[exam._id.toString()];
        const status = buildStatus(attempt);
        const scheduleStart = exam.scheduleStart ? dayjs(exam.scheduleStart) : null;
        const scheduleEnd = exam.scheduleEnd ? dayjs(exam.scheduleEnd) : null;
        
        let scheduleStatus = 'available';
        if (scheduleStart && scheduleStart.isAfter(now)) {
          scheduleStatus = 'upcoming';
        } else if (scheduleEnd && scheduleEnd.isBefore(now)) {
          scheduleStatus = 'ended';
        }

        return {
          id: exam._id,
          examTitle: exam.examTitle,
          durationMinutes: exam.durationMinutes,
          status,
          scheduleStart: exam.scheduleStart,
          scheduleEnd: exam.scheduleEnd,
          scheduleStatus,
        };
      });

    res.json(payload);
  } catch (error) {
    console.error('listExams error', error);
    res.status(500).json({ message: 'Failed to load exams' });
  }
};

const startExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    let attempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user._id,
    });

    const { expired } = guardActiveAttempt(attempt);
    if (expired) {
      return res
        .status(400)
        .json({ message: 'Attempt expired. Contact admin for retake.' });
    }

    if (attempt && attempt.status === 'submitted') {
      return res
        .status(400)
        .json({ message: 'Exam already submitted. Retake not allowed.' });
    }

    if (attempt && attempt.status === 'in_progress') {
      return res.json({
        message: 'Attempt resumed',
        attemptId: attempt._id,
        expiresAt: attempt.expiresAt,
        startedAt: attempt.startedAt,
      });
    }

    const now = dayjs();
    attempt = await ExamAttempt.findOneAndUpdate(
      { exam: examId, student: req.user._id },
      {
        status: 'in_progress',
        startedAt: now.toDate(),
        expiresAt: now.add(exam.durationMinutes, 'minute').toDate(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: 'Attempt started',
      attemptId: attempt._id,
      expiresAt: attempt.expiresAt,
      startedAt: attempt.startedAt,
    });
  } catch (error) {
    console.error('startExam error', error);
    res.status(500).json({ message: 'Failed to start exam' });
  }
};

// Randomize options order
const randomizeOptions = (question) => {
  const options = [
    { key: 'A', value: question.optionA },
    { key: 'B', value: question.optionB },
    { key: 'C', value: question.optionC },
    { key: 'D', value: question.optionD },
  ];
  
  const shuffled = shuffleArray(options);
  
  // Create mapping for original keys to new keys
  const optionMap = {};
  shuffled.forEach((opt, index) => {
    optionMap[opt.key] = ['A', 'B', 'C', 'D'][index];
  });

  return {
    questionText: question.questionText,
    optionA: shuffled[0].value,
    optionB: shuffled[1].value,
    optionC: shuffled[2].value,
    optionD: shuffled[3].value,
    originalOptionA: question.optionA,
    originalOptionB: question.optionB,
    originalOptionC: question.optionC,
    originalOptionD: question.optionD,
    optionMap, // Map new selection to original option
    isMultipleChoice: question.isMultipleChoice || false,
  };
};

const getExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const attempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user._id,
    });

    const { expired } = guardActiveAttempt(attempt);
    if (!attempt) {
      return res.status(400).json({ message: 'Attempt not started' });
    }
    if (attempt.status === 'submitted') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    if (expired) {
      return res.status(400).json({ message: 'Attempt expired' });
    }

    let questions = await Question.find({ exam: examId }).select(
      'questionText optionA optionB optionC optionD isMultipleChoice correctOption correctOptions questionNumber'
    ).lean();

    let randomizedQuestions;
    
    // If questionOrder already exists, use it to maintain consistency (prevent duplicate questions)
    if (attempt.questionOrder && attempt.questionOrder.length > 0) {
      // Use stored order - questions shown only once
      const questionMap = questions.reduce((acc, q) => {
        acc[q._id.toString()] = q;
        return acc;
      }, {});
      
      // Reorder questions according to stored order
      const orderedQuestions = attempt.questionOrder
        .map((qId) => questionMap[qId])
        .filter((q) => q !== undefined);
      
      // Apply option mappings if they exist
      const optionMappings = attempt.optionMappings || {};
      randomizedQuestions = orderedQuestions.map((q) => {
        const qId = q._id.toString();
        if (optionMappings[qId]) {
          // Use stored option mapping
          // The mapping is: originalKey -> newKey (e.g., 'A' -> 'B' means original A is now at position B)
          // To reverse: find which original key maps to each new position
          const mapping = optionMappings[qId];
          const reverseMap = {};
          Object.keys(mapping).forEach((origKey) => {
            reverseMap[mapping[origKey]] = origKey;
          });
          
          // Get original options
          const origOptions = {
            A: q.optionA,
            B: q.optionB,
            C: q.optionC,
            D: q.optionD,
          };
          
          return {
            _id: q._id,
            questionText: q.questionText,
            optionA: origOptions[reverseMap['A']] || q.optionA,
            optionB: origOptions[reverseMap['B']] || q.optionB,
            optionC: origOptions[reverseMap['C']] || q.optionC,
            optionD: origOptions[reverseMap['D']] || q.optionD,
            correctOption: q.correctOption,
            correctOptions: q.correctOptions || [],
            questionNumber: q.questionNumber,
            isMultipleChoice: q.isMultipleChoice || false,
            optionMap: mapping,
          };
        } else {
          // First time for this question - randomize options
          const randomized = randomizeOptions(q);
          return {
            _id: q._id,
            ...randomized,
            correctOption: q.correctOption,
            correctOptions: q.correctOptions || [],
            questionNumber: q.questionNumber,
            isMultipleChoice: q.isMultipleChoice || false,
          };
        }
      });
    } else {
      // First time - randomize question order and options
      questions = shuffleArray(questions);

      randomizedQuestions = questions.map((q) => {
        const randomized = randomizeOptions(q);
        return {
          _id: q._id,
          ...randomized,
          correctOption: q.correctOption,
          correctOptions: q.correctOptions || [],
          questionNumber: q.questionNumber,
          isMultipleChoice: q.isMultipleChoice || false,
        };
      });

      // Store question order and option mappings for consistency
      attempt.questionOrder = questions.map((q) => q._id.toString());
      attempt.optionMappings = randomizedQuestions.reduce((acc, q) => {
        acc[q._id.toString()] = q.optionMap;
        return acc;
      }, {});
      await attempt.save();
    }

    // Convert answers array to object format for frontend
    const answersObj = {};
    if (attempt.answers && Array.isArray(attempt.answers)) {
      attempt.answers.forEach((ans) => {
        if (Array.isArray(ans.selectedOption)) {
          answersObj[ans.question.toString()] = ans.selectedOption;
        } else {
          answersObj[ans.question.toString()] = ans.selectedOption;
        }
      });
    }

    res.json({
      attemptId: attempt._id,
      expiresAt: attempt.expiresAt,
      startedAt: attempt.startedAt,
      questions: randomizedQuestions,
      answers: answersObj,
    });
  } catch (error) {
    console.error('getExamQuestions error', error);
    res.status(500).json({ message: 'Failed to load questions' });
  }
};

const submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body; // {questionId: optionLetter}

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Answers payload is required' });
    }

    const attempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user._id,
    });

    const { expired } = guardActiveAttempt(attempt);
    if (!attempt || attempt.status === 'not_started') {
      return res.status(400).json({ message: 'Attempt not started' });
    }
    if (attempt.status === 'submitted') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    if (expired) {
      return res.status(400).json({ message: 'Attempt expired' });
    }

    const questions = await Question.find({ exam: examId });
    const totalQuestions = questions.length;
    if (!totalQuestions) {
      return res.status(400).json({ message: 'No questions configured' });
    }

    // Get original questions with correct answers
    const originalQuestions = await Question.find({ exam: examId });
    const questionMap = originalQuestions.reduce((acc, q) => {
      acc[q._id.toString()] = q;
      return acc;
    }, {});

    // Get option mappings from attempt
    const optionMappings = attempt.optionMappings || {};
    
    let obtainedMarks = 0;
    let totalMarks = 0;
    let correctCount = 0;
    
    const answerArray = Object.keys(answers).map((questionId) => {
      const question = questionMap[questionId];
      if (!question) return null;

      const questionMarks = question.marks || 1;
      totalMarks += questionMarks;

      const selected = answers[questionId];
      const mapping = optionMappings[questionId] || {};
      
      // Create reverse mapping: newPosition -> originalKey
      const reverseMap = {};
      Object.keys(mapping).forEach((origKey) => {
        reverseMap[mapping[origKey]] = origKey;
      });
      
      // Convert randomized option(s) back to original
      let originalSelected;
      if (Array.isArray(selected)) {
        originalSelected = selected.map((opt) => reverseMap[opt] || opt);
      } else {
        originalSelected = reverseMap[selected] || selected;
      }
      
      let isCorrect = false;
      if (question.isMultipleChoice) {
        const correctOptions = question.correctOptions || [];
        if (Array.isArray(originalSelected)) {
          if (originalSelected.length === correctOptions.length) {
            const sortedSelected = [...originalSelected].sort().join('');
            const sortedCorrect = [...correctOptions].sort().join('');
            isCorrect = sortedSelected === sortedCorrect;
          }
        } else {
          isCorrect = correctOptions.length === 1 && correctOptions[0] === originalSelected;
        }
      } else {
        isCorrect = originalSelected === question.correctOption;
      }

      if (isCorrect) {
        obtainedMarks += questionMarks;
        correctCount += 1;
      }

      return {
        question: question._id,
        selectedOption: selected,
        originalSelectedOption: originalSelected,
        isCorrect,
        marks: questionMarks,
        obtainedMarks: isCorrect ? questionMarks : 0,
      };
    }).filter(Boolean);
    
    // Also calculate for unanswered questions
    questions.forEach((question) => {
      if (!answers[question._id.toString()]) {
        totalMarks += question.marks || 1;
      }
    });

    // Calculate percentage using exam's pass criteria
    const exam = await Exam.findById(examId);
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
    const passPercentage = exam?.passPercentage || 50;
    
    // Summary debug log
    console.log('=== EXAM GRADING SUMMARY ===');
    console.log(`Total Questions: ${totalQuestions}`);
    console.log(`Correct Answers: ${correctCount}`);
    console.log(`Total Marks: ${totalMarks}`);
    console.log(`Obtained Marks: ${obtainedMarks}`);
    console.log(`Percentage: ${percentage}%`);
    console.log(`Pass Percentage Required: ${passPercentage}%`);
    console.log(`Result: ${percentage >= passPercentage ? 'PASS' : 'FAIL'}`);

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.answers = answerArray.map((ans) => {
      let selectedOption = ans.selectedOption;
      if (Array.isArray(selectedOption)) {
        selectedOption = selectedOption.join(',');
      }
      return {
        question: ans.question,
        selectedOption: selectedOption,
      };
    });
    attempt.score = correctCount;
    attempt.totalQuestions = totalQuestions;
    await attempt.save();

    await Result.findOneAndUpdate(
      { exam: examId, student: req.user._id },
      {
        score: correctCount,
        totalMarks,
        obtainedMarks,
        totalQuestions,
        percentage,
        passPercentage,
        passed: percentage >= passPercentage,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      score: correctCount,
      totalMarks,
      obtainedMarks,
      totalQuestions,
      percentage,
      passPercentage,
      passed: percentage >= passPercentage,
    });
  } catch (error) {
    console.error('submitExam error', error);
    res.status(500).json({ message: 'Failed to submit exam' });
  }
};

const getResult = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await Result.findOne({
      exam: examId,
      student: req.user._id,
    }).populate('exam', 'examTitle durationMinutes');

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Debug log to verify result data
    console.log('=== RESULT RETRIEVED ===');
    console.log('Result data:', {
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      passPercentage: result.passPercentage,
      passed: result.passed,
      examTitle: result.exam?.examTitle
    });

    res.json(result);
  } catch (error) {
    console.error('getResult error', error);
    res.status(500).json({ message: 'Failed to load result' });
  }
};

module.exports = {
  getProfile,
  listExams,
  startExam,
  getExamQuestions,
  submitExam,
  getResult,
};

