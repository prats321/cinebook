import { useEffect, useRef, useState } from 'react';

// Seconds left until `deadline` (a date or ISO string), updated every second.
// Calls onExpire once when it hits zero. Returns null when there's no deadline.
export function useCountdown(deadline, onExpire) {
  const [now, setNow] = useState(() => Date.now());
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= end) {
        clearInterval(timer);
        onExpireRef.current?.();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline) return null;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
}
