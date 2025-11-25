import clsx from 'clsx';

const labels = ['A', 'B', 'C', 'D'];

const OptionRadio = ({ optionKey, label, selected, isMultipleChoice, onSelect }) => {
  const isActive = isMultipleChoice
    ? Array.isArray(selected) && selected.includes(optionKey)
    : selected === optionKey;
  
  return (
    <button
      type="button"
      onClick={() => onSelect(optionKey)}
      className={clsx(
        'flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition',
        isActive
          ? 'border-brand-500 bg-brand-500/10 text-white'
          : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30'
      )}
    >
      <span
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-2xl border text-lg font-semibold',
          isActive ? 'border-white bg-white/10' : 'border-white/30 text-white/60'
        )}
      >
        {isMultipleChoice ? (
          <span className={clsx('flex h-5 w-5 items-center justify-center rounded border-2', 
            isActive ? 'border-white bg-white' : 'border-white/50'
          )}>
            {isActive && '✓'}
          </span>
        ) : (
          labels[optionKey.charCodeAt(0) - 65]
        )}
      </span>
      <span className="text-base">{label}</span>
    </button>
  );
};

export default OptionRadio;

