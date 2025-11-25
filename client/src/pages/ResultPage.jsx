import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PartyPopper, Trophy } from 'lucide-react';
import api from '../lib/api';

const ResultPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await api.get(`/api/student/exams/${examId}/result`);
        console.log('Result data received:', data);
        setResult(data);
      } catch (err) {
        console.error('Error fetching result:', err);
        setError(err.response?.data?.message || 'Cannot load result');
      }
    };
    fetchResult();
  }, [examId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p>{error}</p>
        <button className="btn-ghost" onClick={() => navigate('/student')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Preparing result...
      </div>
    );
  }

  // NEW (backend already provides passed & passPercentage)
  const passPercentage = result.passPercentage;
  const passed = result.passed;

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <div className="glass-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent" />
          <div className="relative space-y-3">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-brand-200">
              {passed ? <Trophy size={32} /> : <PartyPopper size={32} />}
            </div>
            <p className="text-sm uppercase tracking-[0.7em] text-white/60">Result</p>
            <h1 className="text-3xl font-semibold">{result.exam?.examTitle}</h1>
            <p className="text-lg text-white/70">
              Submitted on {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* ==== STAT CARDS ==== */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card">
            <p className="text-sm uppercase tracking-[0.5em] text-white/60">Marks</p>
            <p className="text-4xl font-semibold text-white">
              {result.obtainedMarks.toFixed(1)} / {result.totalMarks.toFixed(1)}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {result.score}/{result.totalQuestions} Questions Correct
            </p>
          </div>

          <div className="glass-card">
            <p className="text-sm uppercase tracking-[0.5em] text-white/60">Percentage</p>
            <p className="text-4xl font-semibold text-white">
              {result.percentage.toFixed(1)}%
            </p>
          </div>

          <div className="glass-card">
            <p className="text-sm uppercase tracking-[0.5em] text-white/60">Total Marks</p>
            <p className="text-4xl font-semibold text-white">
              {result.totalMarks.toFixed(1)}
            </p>
          </div>

          <div className={`glass-card ${passed ? 'border-emerald-400/40' : 'border-rose-400/40'}`}>
            <p className="text-sm uppercase tracking-[0.5em] text-white/60">Status</p>
            <p className="text-3xl font-semibold text-white">{passed ? 'Pass' : 'Fail'}</p>
            <p className="text-xs text-white/50 mt-1">Pass: {passPercentage}%</p>
          </div>
        </div>

        {/* ==== DETAILS ==== */}
        <div className="glass-card space-y-3">
          <p className="text-lg text-white/80">
            {passed
              ? 'Great job! You successfully passed this exam.'
              : `You scored ${result.percentage}% but needed ${passPercentage}% to pass.`}
          </p>

          <div className="text-sm text-white/60 pt-2 border-t border-white/10 space-y-1">
            <p><strong>Total Questions:</strong> {result.totalQuestions}</p>
            <p><strong>Correct Answers:</strong> {result.score}</p>
            <p><strong>Incorrect Answers:</strong> {result.totalQuestions - result.score}</p>

            <p><strong>Total Marks:</strong> {result.totalMarks.toFixed(1)}</p>
            <p><strong>Obtained Marks:</strong> {result.obtainedMarks.toFixed(1)}</p>
            <p><strong>Percentage:</strong> {result.percentage.toFixed(1)}%</p>
            <p><strong>Pass Percentage Required:</strong> {passPercentage}%</p>
          </div>

          <button className="btn-primary" onClick={() => navigate('/student')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
