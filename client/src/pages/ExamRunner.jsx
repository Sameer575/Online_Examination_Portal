import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import api from '../lib/api';
import TimerBadge from '../components/TimerBadge';
import OptionRadio from '../components/OptionRadio';
import { useCountdown } from '../hooks/useCountdown';

const ExamRunner = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [furthest, setFurthest] = useState(1);
  const autoSubmittedRef = useRef(false);

  const currentIndex = useMemo(() => {
    const q = Number(searchParams.get('q') || 1);
    return Number.isNaN(q) ? 1 : Math.min(Math.max(q, 1), questions.length || 1);
  }, [searchParams, questions.length]);

  const loadQuestions = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/student/exams/${examId}/questions`);
      setQuestions(data.questions);
      setExpiresAt(data.expiresAt);
      
      // Load answers - data.answers is an object, not an array
      if (data.answers && typeof data.answers === 'object') {
        setAnswers(data.answers);
      }
      
      // Restore current question from URL or start at 1
      const urlQuestion = Number(searchParams.get('q') || 1);
      const validQuestion = Math.max(1, Math.min(urlQuestion, data.questions.length));
      setFurthest(validQuestion);
      setSearchParams({ q: String(validQuestion) }, { replace: true });
    } catch (error) {
      setToast(error.response?.data?.message || 'Unable to load questions');
    } finally {
      setLoading(false);
    }
  }, [examId, setSearchParams, searchParams]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    // Update furthest question reached
    setFurthest((prev) => Math.max(prev, currentIndex));
  }, [currentIndex]);

  const handleSelect = (questionId, optionKey, isMultipleChoice) => {
    setAnswers((prev) => {
      const currentAnswer = prev[questionId];
      
      if (isMultipleChoice) {
        // Toggle option in array for multiple choice
        const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
        if (currentArray.includes(optionKey)) {
          return {
            ...prev,
            [questionId]: currentArray.filter((opt) => opt !== optionKey),
          };
        } else {
          return {
            ...prev,
            [questionId]: [...currentArray, optionKey],
          };
        }
      } else {
        // Single choice - replace answer
        return {
          ...prev,
          [questionId]: optionKey,
        };
      }
    });
  };

  const submitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await api.post(`/api/student/exams/${examId}/submit`, {
        answers,
      });
      console.log('Exam submitted successfully:', response.data);
      // Small delay to ensure result is saved before redirecting
      setTimeout(() => {
        navigate(`/result/${examId}`, { replace: true });
      }, 500);
    } catch (error) {
      console.error('Submit exam error:', error);
      setToast(error.response?.data?.message || 'Failed to submit exam');
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex >= questions.length) {
      submitExam();
      return;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex <= questions.length) {
      setFurthest((prev) => Math.max(prev, nextIndex));
      setSearchParams({ q: String(nextIndex) }, { replace: false });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 1) {
      const prevIndex = currentIndex - 1;
      setSearchParams({ q: String(prevIndex) }, { replace: false });
    }
  };

  const handleAutoSubmit = useCallback(() => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitExam();
  }, []);

  const { minutes, seconds, isExpired } = useCountdown(expiresAt, handleAutoSubmit);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading exam...
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p>No questions configured for this exam.</p>
        <button className="btn-ghost" onClick={() => navigate('/student')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Safety check for question existence
  if (currentIndex < 1 || currentIndex > questions.length) {
    setSearchParams({ q: '1' }, { replace: true });
    return null;
  }

  const question = questions[currentIndex - 1];
  
  if (!question) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading question...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-12 text-white">
      <TimerBadge minutes={minutes} seconds={seconds} isUrgent={minutes < 1} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="glass-card border-brand-500/40">
          <p className="text-sm uppercase tracking-[0.5em] text-white/50">Question</p>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">
              {currentIndex} / {questions.length}
            </h1>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <Sparkles className="text-brand-200" size={16} />
              Stay focused. No going back.
            </div>
          </div>
          <p className="mt-4 text-lg text-white">{question.questionText}</p>
        </div>

        {toast && (
          <div className="glass-card border-rose-400/40 bg-rose-500/20 text-rose-100">
            {toast}
          </div>
        )}

        {question.isMultipleChoice && (
          <div className="glass-card border-blue-400/40 bg-blue-500/10 text-blue-100 mb-4">
            <p className="text-sm">This is a multiple-choice question. Select all correct answers.</p>
          </div>
        )}
        
        <div className="space-y-3">
          {['optionA', 'optionB', 'optionC', 'optionD'].map((key) => (
            <OptionRadio
              key={key}
              optionKey={key.slice(-1)}
              label={question[key]}
              selected={answers[question._id]}
              isMultipleChoice={question.isMultipleChoice || false}
              onSelect={(option) => handleSelect(question._id, option, question.isMultipleChoice)}
            />
          ))}
        </div>
        
        {question.isMultipleChoice && Array.isArray(answers[question._id]) && answers[question._id].length > 0 && (
          <div className="text-sm text-white/60 mt-2">
            Selected: {answers[question._id].sort().join(', ')}
          </div>
        )}

        <div className="flex justify-between items-center gap-4">
          <button
            type="button"
            className="btn-ghost min-w-[140px]"
            onClick={handlePrevious}
            disabled={currentIndex === 1 || submitting || isExpired}
          >
            Previous
          </button>
          <div className="flex-1 text-center text-sm text-white/60">
            Question {currentIndex} of {questions.length}
          </div>
          <button
            type="button"
            className="btn-primary min-w-[180px]"
            onClick={handleNext}
            disabled={submitting || isExpired}
          >
            {currentIndex >= questions.length ? 'Submit Exam' : 'Next Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamRunner;

