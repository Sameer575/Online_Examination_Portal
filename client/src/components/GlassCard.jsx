import clsx from 'clsx';

const GlassCard = ({ children, className }) => {
  return (
    <div className={clsx('glass-card p-6 text-slate-100', className)}>
      {children}
    </div>
  );
};

export default GlassCard;

