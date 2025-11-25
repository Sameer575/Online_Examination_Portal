import { useEffect, useState } from 'react';

export const useCountdown = (expiresAt, onExpire) => {
  const [remaining, setRemaining] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!expiresAt) return undefined;

    const interval = setInterval(() => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(diff);
      if (diff === 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remaining / 1000 / 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return {
    minutes,
    seconds,
    isExpired: remaining === 0,
  };
};

