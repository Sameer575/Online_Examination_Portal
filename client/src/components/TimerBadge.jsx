import { Hourglass } from 'lucide-react';
import clsx from 'clsx';

const TimerBadge = ({ minutes, seconds, isUrgent = false }) => {
  return (
    <div
      className={clsx(
        'fixed right-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-white shadow-glass backdrop-blur-glass',
        isUrgent && 'border-rose-400/60 bg-rose-500/20 text-rose-50'
      )}
    >
      <Hourglass size={18} className={isUrgent ? 'text-rose-100' : 'text-white'} />
      <span className="font-mono text-lg">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

export default TimerBadge;

