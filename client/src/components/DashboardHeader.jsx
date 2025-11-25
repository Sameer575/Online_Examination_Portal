import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardHeader = ({ title, subtitle, rightSlot }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-glass backdrop-blur-glass md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">Modern Examination</p>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-white/70">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-3 text-white/80 md:flex-row md:items-center md:gap-6">
        <div className="text-right">
          <p className="text-sm text-white/50">Logged in as</p>
          <p className="text-lg font-semibold">{user?.name}</p>
          <p className="text-xs uppercase tracking-wide text-white/50">{user?.role}</p>
        </div>
        {rightSlot}
        <button
          type="button"
          onClick={logout}
          className="btn-ghost flex items-center gap-2"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;

