import { useEffect, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&';

/** Text scramble effect that reveals the correct characters one by one. */
export default function useScramble(text, delay = 300) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    let frame;
    let iteration = 0;
    const timeout = setTimeout(() => {
      const run = () => {
        setDisplay(text.split('').map((ch, i) => {
          if (i < iteration || ch === ' ') return ch;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join(''));
        if (iteration < text.length) {
          iteration += 0.35;
          frame = requestAnimationFrame(run);
        } else {
          setDisplay(text);
        }
      };
      frame = requestAnimationFrame(run);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame); };
  }, [text, delay]);
  return display;
}
