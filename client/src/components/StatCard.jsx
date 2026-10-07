import useCounter from '../hooks/useCounter';

export default function StatCard({ label, rawValue, suffix = '', icon, glowColor, textColor }) {
  const counted = useCounter(rawValue);
  return (
    <div className="stat-card" style={{ '--glow': glowColor }}>
      <div className="stat-icon" style={{ background: glowColor }}>
        {icon}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: textColor || 'var(--text)' }}>
        {counted}{suffix}
      </div>
    </div>
  );
}
