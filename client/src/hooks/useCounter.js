import { useEffect, useState } from 'react';

/** Animates a number from 0 to target whenever target changes. */
export default function useCounter(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress); // ease-out expo
      setVal(Math.round((target || 0) * ease));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
}
