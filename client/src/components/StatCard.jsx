import clsx from 'clsx';

const StatCard = ({ icon: Icon, label, value, accent = 'from-brand-500 to-brand-700' }) => {
  return (
    <div className="glass-card flex items-center gap-4">
      <div
        className={clsx(
          'rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg',
          accent
        )}
      >
        <Icon size={32} />
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">{label}</p>
        <p className="text-3xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;

