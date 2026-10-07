function parseInline(text) {
  const parts = [];
  let rest = text;
  while (rest) {
    const i = rest.indexOf('**');
    if (i === -1) { parts.push(rest); break; }
    if (i > 0) parts.push(rest.slice(0, i));
    const j = rest.indexOf('**', i + 2);
    if (j === -1) { parts.push(rest.slice(i)); break; }
    parts.push(<strong key={rest.length + i} style={{ color: 'var(--text)', fontWeight: 600 }}>{rest.slice(i + 2, j)}</strong>);
    rest = rest.slice(j + 2);
  }
  return parts;
}

export default function Markdown({ text }) {
  if (!text) return null;
  return (
    <div className="summary-content">
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (t.startsWith('### ')) return <h4 key={i} style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginTop: '1rem', marginBottom: '0.3rem' }}>{parseInline(t.slice(4))}</h4>;
        if (t.startsWith('## '))  return <h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginTop: '1.2rem', marginBottom: '0.35rem' }}>{parseInline(t.slice(3))}</h3>;
        if (t.startsWith('# '))   return <h2 key={i} style={{ fontSize: '1rem',    fontWeight: 700, color: 'var(--text)', marginTop: '1.4rem', marginBottom: '0.4rem' }}>{parseInline(t.slice(2))}</h2>;
        if (t.startsWith('* ') || t.startsWith('- '))
          return (
            <div key={i} className="summary-bullet">
              <span className="summary-bullet-dot" />
              <span>{parseInline(t.slice(2))}</span>
            </div>
          );
        return <p key={i} style={{ marginBottom: '0.5rem' }}>{parseInline(t)}</p>;
      })}
    </div>
  );
}
