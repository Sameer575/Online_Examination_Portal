import { ArrowRight, CheckCircle, Clock, Play, Calendar, XCircle } from 'lucide-react';
import clsx from 'clsx';

const statusConfig = {
  not_attempted: {
    label: 'Not Attempted',
    badge: 'bg-white/15 text-white',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'bg-yellow-400/20 text-yellow-200',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-400/20 text-emerald-200',
  },
  expired: {
    label: 'Expired',
    badge: 'bg-rose-400/20 text-rose-200',
  },
  upcoming: {
    label: 'Upcoming',
    badge: 'bg-blue-400/20 text-blue-200',
  },
  ended: {
    label: 'Ended',
    badge: 'bg-slate-400/20 text-slate-200',
  },
};

const ExamCard = ({ exam, onStart, onViewResult }) => {
  const displayStatus = exam.scheduleStatus || exam.status;
  const config = statusConfig[displayStatus] || statusConfig.not_attempted;

  const isScheduleActive = () => {
    if (!exam.scheduleStart && !exam.scheduleEnd) return true;
    const now = new Date();
    if (exam.scheduleStart && new Date(exam.scheduleStart) > now) return false;
    if (exam.scheduleEnd && new Date(exam.scheduleEnd) < now) return false;
    return true;
  };

  const canStartExam = () => {
    if (exam.status === 'completed' || exam.status === 'expired') return false;
    if (exam.scheduleStatus === 'upcoming' || exam.scheduleStatus === 'ended') return false;
    return isScheduleActive();
  };

  return (
    <div className="glass-card flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Exam</p>
          <h3 className="text-xl font-semibold">{exam.examTitle}</h3>
        </div>
        <span
          className={clsx(
            'rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest',
            config.badge
          )}
        >
          {config.label}
        </span>
      </div>
      <div className="space-y-2 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <Clock size={16} />
          {exam.durationMinutes} minutes
        </div>
        
        {exam.scheduleStart && (
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            Starts: {new Date(exam.scheduleStart).toLocaleString()}
          </div>
        )}
        
        {exam.scheduleEnd && (
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            Ends: {new Date(exam.scheduleEnd).toLocaleString()}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {exam.status === 'completed' && (
          <button
            type="button"
            onClick={() => onViewResult(exam.id)}
            className="btn-ghost flex items-center gap-2"
          >
            <CheckCircle size={16} />
            View Result
          </button>
        )}
        {canStartExam() && exam.status !== 'completed' && (
          <button
            type="button"
            onClick={() => onStart(exam.id)}
            className="btn-primary flex items-center gap-2"
            disabled={!isScheduleActive()}
          >
            {exam.status === 'in_progress' ? <ArrowRight size={16} /> : <Play size={16} />}
            {exam.status === 'in_progress' ? 'Resume' : 'Start Exam'}
          </button>
        )}
        {(exam.scheduleStatus === 'upcoming' || exam.scheduleStatus === 'ended') && (
          <button
            type="button"
            disabled
            className="btn-ghost flex items-center gap-2 opacity-50 cursor-not-allowed"
          >
            {exam.scheduleStatus === 'upcoming' ? 'Exam Not Started Yet' : 'Exam Ended'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamCard;

