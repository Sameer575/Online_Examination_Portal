import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ListChecks, Timer } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import ExamCard from '../components/ExamCard';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const loadExams = async () => {
    try {
      const { data } = await api.get('/api/student/exams');
      setExams(data);
    } catch (error) {
      setToast(error.response?.data?.message || 'Unable to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleStart = async (examId) => {
    try {
      await api.post(`/api/student/exams/${examId}/start`);
      navigate(`/exam/${examId}?q=1`);
    } catch (error) {
      setToast(error.response?.data?.message || 'Cannot start exam');
    }
  };

  const handleViewResult = (examId) => {
    navigate(`/result/${examId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <DashboardHeader
          title="Student Command Center"
          subtitle="Track your exams, timers, and performance in one place."
        />

        {toast && (
          <div className="glass-card border-rose-400/40 text-rose-100">{toast}</div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={ListChecks}
            label="Total Exams"
            value={exams.length}
            accent="from-purple-500 to-indigo-700"
          />
          <StatCard
            icon={Timer}
            label="In Progress"
            value={exams.filter((e) => e.status === 'in_progress').length}
            accent="from-amber-500 to-orange-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={exams.filter((e) => e.status === 'completed').length}
            accent="from-emerald-500 to-green-600"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-40 rounded-3xl border border-white/10 bg-white/5 animate-pulse"
                />
              ))
            : exams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onStart={handleStart}
                  onViewResult={handleViewResult}
                />
              ))}
          {!loading && exams.length === 0 && (
            <div className="glass-card text-center text-white/70">
              No exams assigned yet. Check back later.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

