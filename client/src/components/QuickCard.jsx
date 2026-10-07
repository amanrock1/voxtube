import { useRef, useCallback } from 'react';

export default function QuickCard({ video, onClick, disabled }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale(1.02)`;
  }, []);

  const onLeave = useCallback(() => {
    if (ref.current)
      ref.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)';
  }, []);

  return (
    <div
      ref={ref}
      className="quick-card"
      onClick={disabled ? undefined : onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: 'transform 0.1s ease, border-color 0.2s, box-shadow 0.25s', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <img className="quick-card-thumb" src={video.thumb} alt={video.title} />
      <div className="quick-card-body">
        <div className="quick-card-title">{video.title}</div>
        <div className="quick-card-channel">{video.channel}</div>
      </div>
    </div>
  );
}
