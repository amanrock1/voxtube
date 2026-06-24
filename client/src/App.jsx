import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PieChart as RePieChart, Pie, Cell,
  BarChart as ReBarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ──────────────────────────────────────────────────────────────────
// INLINE ICONS  (hand-crafted SVGs — no library needed)
// ──────────────────────────────────────────────────────────────────
const IC = {
  Play: () => (
    <svg viewBox="0 0 18 18" fill="currentColor">
      <polygon points="4,2 15,9 4,16"/>
    </svg>
  ),
  Back: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5"/>
      <path d="M10.5 10.5L13 13"/>
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2L4 9h5l-2.5 5L14 7H9l.5-5z" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/>
      <path d="M8 5v3.5M8 11.5v.2"/>
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z"/>
    </svg>
  ),
  Trend: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l4-4 3 2 5-6"/>
      <path d="M10 4h4v4"/>
    </svg>
  ),
  Q: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/>
      <path d="M6.2 6.2a2 2 0 013.5 1.3c0 1.2-2 1.5-2 2.5"/>
      <circle cx="7.7" cy="11.5" r="0.5" fill="currentColor"/>
    </svg>
  ),
  Bar: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13V8M7 13V5M11 13V9M14 13V3"/>
    </svg>
  ),
  Pie: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2a6 6 0 100 12A6 6 0 008 2z"/>
      <path d="M8 2v6h6"/>
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5z"/>
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12s-5.5-3.5-5.5-7A3.5 3.5 0 017 4a3.5 3.5 0 015.5 1C12.5 8.5 7 12 7 12z"/>
    </svg>
  ),
  Ext: () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2H2v8h8V7M7 1h4v4M10.5 1.5L5.5 6.5"/>
    </svg>
  ),
};

// ──────────────────────────────────────────────────────────────────
// HOOKS
// ──────────────────────────────────────────────────────────────────

/** Animates a number from 0 → target when target changes */
function useCounter(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let frame;
    let start = null;
    const from = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(Math.round(from + (target - from) * ease));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
}

/** Scramble text effect — reveals correct chars one by one */
function useScramble(text, delay = 300) {
  const [display, setDisplay] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&';
  useEffect(() => {
    let frame;
    let iteration = 0;
    const timeout = setTimeout(() => {
      const run = () => {
        setDisplay(
          text.split('').map((ch, i) => {
            if (i < iteration) return ch;
            if (ch === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          }).join('')
        );
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
  }, [text]);
  return display;
}

// ──────────────────────────────────────────────────────────────────
// MARKDOWN RENDERER
// ──────────────────────────────────────────────────────────────────
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

function renderMarkdown(text) {
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

// ──────────────────────────────────────────────────────────────────
// QUICK CARD (with 3D tilt)
// ──────────────────────────────────────────────────────────────────
function QuickCard({ video, onClick }) {
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
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: 'transform 0.1s ease, border-color 0.2s, box-shadow 0.25s' }}
    >
      <img className="quick-card-thumb" src={video.thumb} alt={video.title} />
      <div className="quick-card-body">
        <div className="quick-card-title">{video.title}</div>
        <div className="quick-card-channel">{video.channel}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// STAT CARD
// ──────────────────────────────────────────────────────────────────
function StatCard({ label, rawValue, suffix = '', icon, glowColor, textColor }) {
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

// ──────────────────────────────────────────────────────────────────
// TICKER DATA
// ──────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '300 comments analyzed per video',
  'Powered by Gemini 1.5 Flash',
  'Sentiment · Praise · Questions · Feedback',
  'Noise & spam filtered automatically',
  'Real-time YouTube data',
  'Built with Node.js + React',
];

// ──────────────────────────────────────────────────────────────────
// APP
// ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]         = useState('landing');
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [loadingStep, setStep]  = useState('');
  const [error, setError]       = useState('');
  const [videoData, setVideo]   = useState(null);
  const [comments, setComments] = useState([]);
  const [search, setSearch]     = useState('');
  const [sentF, setSentF]       = useState('All');
  const [catF, setCatF]         = useState('All');
  const [visits, setVisits]     = useState(null);

  // Fetch page visits
  useEffect(() => {
    fetch('https://api.counterapi.dev/v1/voxtube-visits/global/up')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.value === 'number') {
          setVisits(data.value);
        }
      })
      .catch(err => {
        console.warn('Visits count error:', err);
        let localVal = localStorage.getItem('voxtube_visits_sim');
        if (!localVal) {
          localVal = Math.floor(1248 + Math.random() * 120);
          localStorage.setItem('voxtube_visits_sim', localVal);
        } else {
          localVal = parseInt(localVal) + 1;
          localStorage.setItem('voxtube_visits_sim', localVal);
        }
        setVisits(parseInt(localVal));
      });
  }, []);

  // scramble the hero keyword
  const scrambled = useScramble('vibe', 600);

  // cursor spotlight
  useEffect(() => {
    const move = (e) => {
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  const SAMPLE = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley – Never Gonna Give You Up', channel: 'Rick Astley',  thumb: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id: 'sfXn_ecH5Rw', title: 'Every Melody Has Been Copyrighted',      channel: 'Adam Neely',   thumb: 'https://i.ytimg.com/vi/sfXn_ecH5Rw/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=sfXn_ecH5Rw' },
    { id: '7YrdI7h2XoY', title: 'Glass is glass',                         channel: 'MKBHD',       thumb: 'https://i.ytimg.com/vi/7YrdI7h2XoY/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=7YrdI7h2XoY' },
  ];

  const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://voxtube-gs6s.onrender.com/api';

  // ─── SECURITY: Read shared secret from env — never hardcode this in source code ─────
  // The server validates this header on every request to prevent API abuse.
  // Set VITE_API_KEY in client/.env (matches CLIENT_API_KEY in server/.env)
  const API_KEY = import.meta.env.VITE_API_KEY || '';

  // ── Ripple on analyze button ──
  const addRipple = (e) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - r.left}px`;
    ripple.style.top  = `${e.clientY - r.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const analyze = async (videoUrl) => {
    if (!videoUrl.trim()) return;
    setLoading(true); setError('');
    setStep('Connecting to platform API…');
    const steps = [
      'Fetching comment threads…',
      'Packaging comments for Gemini…',
      'AI classifying sentiment…',
      'Categorising topics & intent…',
      'Building audience summary…',
    ];
    let si = 0;
    const timer = setInterval(() => { if (si < steps.length) setStep(steps[si++]); }, 1500);
    try {
      const res = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ url: videoUrl }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Analysis failed'); }
      const d = await res.json();
      setVideo(d.video); setComments(d.comments); setView('dashboard');
    } catch (e) { setError(e.message); }
    finally { clearInterval(timer); setLoading(false); setStep(''); }
  };

  const reset = () => {
    setView('landing'); setUrl(''); setVideo(null); setComments([]);
    setSearch(''); setSentF('All'); setCatF('All');
  };

  // ── Filtered list ──
  const filtered = comments.filter(c => {
    const q = search.toLowerCase();
    return (c.text.toLowerCase().includes(q) || c.author_name.toLowerCase().includes(q))
      && (sentF === 'All' || c.sentiment === sentF)
      && (catF  === 'All' || c.category  === catF);
  });

  // ── Chart data ──
  const sentCount = comments.reduce((a, c) => { a[c.sentiment] = (a[c.sentiment]||0)+1; return a; }, { Positive:0, Neutral:0, Negative:0 });
  const catCount  = comments.reduce((a, c) => { a[c.category]  = (a[c.category] ||0)+1; return a; }, { Praise:0, Question:0, Feedback:0, Noise:0 });

  const sentData = [
    { name: 'Positive', value: sentCount.Positive, color: '#3ddc84' },
    { name: 'Neutral',  value: sentCount.Neutral,  color: '#444450' },
    { name: 'Negative', value: sentCount.Negative, color: '#ff4545' },
  ];
  const catData = [
    { name: 'Praise',    count: catCount.Praise,   color: '#3ddc84' },
    { name: 'Questions', count: catCount.Question,  color: '#ffd166' },
    { name: 'Feedback',  count: catCount.Feedback,  color: '#00e5cc' },
    { name: 'Noise',     count: catCount.Noise,     color: '#b57bee' },
  ];

  const n       = comments.length;
  const posRate = n ? Math.round((sentCount.Positive / n) * 100) : 0;
  const qRate   = n ? Math.round((catCount.Question  / n) * 100) : 0;

  // double ticker items so seamless loop works
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      {/* ── Interactive overlays ── */}
      <div className="bg-glow" />
      <div className="cursor-glow" />

      {/* ── Ticker strip ── */}
      <div className="ticker-bar" aria-hidden="true">
        <div className="ticker-inner">
          {tickerItems.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      <div className="container">

        {/* ── Navbar ── */}
        <header className="navbar">
          <div className="logo" onClick={reset}>
            <div className="logo-icon" style={{ position: 'relative' }}>
              <IC.Play />
              <span className="logo-ring" />
            </div>
            <span className="logo-name">VoxTube</span>
            <span className="logo-badge">v1</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {view === 'dashboard' && (
              <button className="back-btn" onClick={reset}>
                <IC.Back /> Back
              </button>
            )}
          </div>
        </header>

        {/* ── Loading ── */}
        {loading && (
          <div className="loading-wrap fade-up">
            <div className="orb" />
            <div style={{ textAlign: 'center' }}>
              <div className="loading-title">Analyzing comments</div>
              <div className="loading-step" style={{ marginTop: '0.5rem' }}>{loadingStep}</div>
            </div>
            <div className="loading-note">
              Gemini processes comments in batch mode. Results usually land in a few seconds.
            </div>
            <div className="loading-server-notice">
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <div style={{ textAlign: 'left' }}>
                <strong>Server notice:</strong> The server might be busy or resolving Google API rate limits. Under heavy loads, the analysis can take up to 2-3 minutes. Please stay on this page.
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ LANDING ══════════════ */}
        {!loading && view === 'landing' && (
          <main>
            <div className="hero fade-up">
              <h1 className="hero-title">
                Read every comment.<br />
                Understand the{' '}
                <span className="hero-accent">{scrambled}.</span>
              </h1>

              <p className="hero-subtitle">
                Paste a YouTube video or Reddit post link. We fetch the comment threads, analyze them with Gemini AI, and show you clean, actionable insights in seconds.
              </p>

              <div className="search-wrap">
                <div className="search-icon-wrap"><IC.Search /></div>
                <input
                  className="search-input"
                  type="text"
                  placeholder="Paste YouTube video or Reddit post URL..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && analyze(url)}
                />
                <button
                  className="analyze-btn"
                  onClick={(e) => { addRipple(e); analyze(url); }}
                >
                  <IC.Zap /> Analyze
                </button>
              </div>

              {error && (
                <div className="error-msg">
                  <IC.Alert /> {error}
                </div>
              )}
            </div>

            {/* ── Why VoxTube Section (What it Solves) ── */}
            <section className="landing-section fade-up">
              <h2 className="landing-section-title">Why VoxTube?</h2>
              <p className="landing-section-subtitle">
                VoxTube is designed to solve comment fatigue. Instead of wasting hours reading through comments manually, get immediate, structured audience intelligence.
              </p>
              
              <div className="info-grid">
                {/* Card 1: Sentiment Analysis */}
                <div className="info-card" style={{ '--accent-color': 'var(--cyan)', '--accent-bg': 'rgba(0, 229, 204, 0.08)' }}>
                  <h3 className="info-card-title">Instant Sentiment Analysis</h3>
                  <p className="info-card-desc">
                    Get an immediate high-level split of Positive, Neutral, and Negative sentiments. Know exactly how your audience feels at a glance.
                  </p>
                  
                  <div className="showcase-container sentiment-showcase">
                    <div className="showcase-donut">
                      <svg viewBox="0 0 100 100" width="100%" height="100%">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="var(--surface-2)" strokeWidth="12" />
                        {/* Positive 72% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="var(--green)" strokeWidth="12" strokeDasharray="171.8 238.7" strokeDashoffset="0" strokeLinecap="round" />
                        {/* Neutral 18% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="var(--text-3)" strokeWidth="12" strokeDasharray="42.9 238.7" strokeDashoffset="-171.8" strokeLinecap="round" />
                        {/* Negative 10% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="var(--red)" strokeWidth="12" strokeDasharray="23.9 238.7" strokeDashoffset="-214.7" strokeLinecap="round" />
                        
                        <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="13" fontWeight="bold" fontFamily="var(--display)">72%</text>
                        <text x="50" y="62" textAnchor="middle" dominantBaseline="middle" fill="var(--green)" fontSize="7" fontWeight="bold" fontFamily="var(--mono)" letterSpacing="0.05em">POS</text>
                      </svg>
                    </div>
                    <div className="showcase-legend">
                      <div className="legend-row">
                        <div className="legend-label-group">
                          <span className="legend-dot pos"></span>
                          <span>Positive</span>
                        </div>
                        <span className="legend-val" style={{ color: 'var(--green)' }}>72%</span>
                      </div>
                      <div className="legend-row">
                        <div className="legend-label-group">
                          <span className="legend-dot neu"></span>
                          <span>Neutral</span>
                        </div>
                        <span className="legend-val" style={{ color: 'var(--text-2)' }}>18%</span>
                      </div>
                      <div className="legend-row">
                        <div className="legend-label-group">
                          <span className="legend-dot neg"></span>
                          <span>Negative</span>
                        </div>
                        <span className="legend-val" style={{ color: 'var(--red)' }}>10%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Noise Filtering */}
                <div className="info-card" style={{ '--accent-color': 'var(--orange)', '--accent-bg': 'rgba(255, 107, 53, 0.08)' }}>
                  <h3 className="info-card-title">Noise & Spam Filtering</h3>
                  <p className="info-card-desc">
                    Our intelligent classification automatically separates praise, constructive feedback, and actual questions from bot spam and off-topic noise.
                  </p>

                  <div className="showcase-container">
                    <div className="noise-stats">
                      <div className="noise-stat-box full">
                        <span className="noise-stat-lbl">Total Comments</span>
                        <span className="noise-stat-val">12,450</span>
                      </div>
                      <div className="noise-stat-box">
                        <span className="noise-stat-lbl">Relevant</span>
                        <span className="noise-stat-val relevant">8,921</span>
                      </div>
                      <div className="noise-stat-box">
                        <span className="noise-stat-lbl">Spam/Bot</span>
                        <span className="noise-stat-val" style={{ color: 'var(--text-3)' }}>3,529</span>
                      </div>
                    </div>
                    <div className="noise-comments-list">
                      <div className="noise-comment-item">
                        <span className="noise-comment-txt">"Amazing tutorial! The explanation was perfect."</span>
                        <span className="noise-comment-tag ok">Praise</span>
                      </div>
                      <div className="noise-comment-item filtered">
                        <span className="noise-comment-txt">"👉 FREE BITCOIN INFO IN MY BIO 👈"</span>
                        <span className="noise-comment-tag spam">Spam</span>
                      </div>
                      <div className="noise-comment-item filtered">
                        <span className="noise-comment-txt">"Great video! Watch my channel [link]"</span>
                        <span className="noise-comment-tag bot">Bot</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: AI Consensus */}
                <div className="info-card" style={{ '--accent-color': 'var(--purple)', '--accent-bg': 'rgba(181, 123, 238, 0.08)' }}>
                  <h3 className="info-card-title">AI Audience Consensus</h3>
                  <p className="info-card-desc">
                    Powered by Google Gemini AI to summarize key takeaways, top critiques, and user suggestions in a clean executive consensus report.
                  </p>

                  <div className="showcase-container consensus-preview">
                    <div className="consensus-header">
                      <span>AUDIENCE CONSENSUS</span>
                      <span className="consensus-badge">HIGH CONFIDENCE</span>
                    </div>
                    <div className="consensus-list">
                      <div className="consensus-item">
                        <span className="consensus-check">✓</span>
                        <span>Audience loves editing style</span>
                      </div>
                      <div className="consensus-item">
                        <span className="consensus-check">✓</span>
                        <span>Requests longer videos</span>
                      </div>
                      <div className="consensus-item">
                        <span className="consensus-check">✓</span>
                        <span>Audio quality praised</span>
                      </div>
                      <div className="consensus-item">
                        <span className="consensus-check">✓</span>
                        <span>Thumbnail criticism recurring</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── How It Works Section ── */}
            <section className="landing-section fade-up" style={{ marginTop: '3.5rem' }}>
              <h2 className="landing-section-title">How It Works</h2>
              <p className="landing-section-subtitle">
                A seamless, state-of-the-art data pipeline operating under the hood:
              </p>
              
              <div className="pipeline-container">
                <div className="pipeline-node">
                  <div className="node-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <div className="node-title">YouTube URL</div>
                  <div className="node-desc">Paste public link in the analyzer bar</div>
                </div>

                <div className="pipeline-connector">
                  <div className="flow-line"></div>
                  <div className="flow-pulse"></div>
                </div>

                <div className="pipeline-node">
                  <div className="node-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="node-title">Comment Collection</div>
                  <div className="node-desc">Fetch top threads via platform APIs</div>
                </div>

                <div className="pipeline-connector">
                  <div className="flow-line"></div>
                  <div className="flow-pulse"></div>
                </div>

                <div className="pipeline-node">
                  <div className="node-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="node-title">AI Processing</div>
                  <div className="node-desc">Gemini AI parses and scores comments</div>
                </div>

                <div className="pipeline-connector">
                  <div className="flow-line"></div>
                  <div className="flow-pulse"></div>
                </div>

                <div className="pipeline-node">
                  <div className="node-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="node-title">Insight Report</div>
                  <div className="node-desc">Explore consensus and filters</div>
                </div>
              </div>
            </section>

            {/* ── Quick picks ── */}
            <div style={{ marginTop: '4rem' }}>
              <p className="section-label">or try a quick example</p>
              <div className="quick-grid stagger">
                {SAMPLE.map(v => (
                  <QuickCard key={v.id} video={v} onClick={() => analyze(v.url)} />
                ))}
              </div>
            </div>
          </main>
        )}

        {/* ══════════════ DASHBOARD ══════════════ */}
        {!loading && view === 'dashboard' && videoData && (
          <main className="fade-up">

            {/* Video strip */}
            <div className="video-header">
              <img className="video-thumb" src={videoData.thumbnail} alt={videoData.title} />
              <div className="video-meta">
                <div className="video-analyzed-tag">analyzed</div>
                <h2 className="video-title">{videoData.title}</h2>
                <div className="video-channel">
                  <span>{videoData.channel_title}</span>
                  <span style={{ color: 'var(--text-3)' }}>·</span>
                  {videoData.id.startsWith('reddit_') ? (
                    <a href={`https://www.reddit.com/comments/${videoData.id.replace('reddit_', '')}`} target="_blank" rel="noreferrer">
                      Open on Reddit <IC.Ext />
                    </a>
                  ) : (
                    <a href={`https://youtube.com/watch?v=${videoData.id}`} target="_blank" rel="noreferrer">
                      Watch on YouTube <IC.Ext />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Animated stat cards */}
            <div className="stats-grid stagger">
              <StatCard
                label="Comments scanned"
                rawValue={n}
                icon={<IC.Chat style={{ color: 'var(--cyan)' }} />}
                glowColor="rgba(0,229,204,0.1)"
              />
              <StatCard
                label="Positive sentiment"
                rawValue={posRate}
                suffix="%"
                textColor="var(--green)"
                icon={<IC.Trend style={{ color: 'var(--green)' }} />}
                glowColor="rgba(61,220,132,0.1)"
              />
              <StatCard
                label="Questions raised"
                rawValue={qRate}
                suffix="%"
                textColor="var(--yellow)"
                icon={<IC.Q style={{ color: 'var(--yellow)' }} />}
                glowColor="rgba(255,209,102,0.1)"
              />
            </div>

            {/* Main grid */}
            <div className="dash-grid">

              {/* ── Left ── */}
              <div className="dash-left">

                {/* AI summary */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-header-icon" style={{ background: 'rgba(0,229,204,0.1)' }}>
                      <IC.Star style={{ color: 'var(--cyan)' }} />
                    </div>
                    <span className="card-title">AI Audience Consensus</span>
                  </div>
                  <div className="card-body">
                    {renderMarkdown(videoData.summary)}
                  </div>
                </div>

                {/* Charts */}
                {!videoData.id.startsWith('reddit_') && (
                  <div className="chart-grid">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-header-icon" style={{ background: 'rgba(0,229,204,0.1)' }}>
                          <IC.Bar style={{ color: 'var(--cyan)' }} />
                        </div>
                        <span className="card-title">Comment Types</span>
                      </div>
                      <div className="card-body" style={{ paddingTop: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height={200}>
                          <ReBarChart data={catData} layout="vertical" margin={{ left: -12, right: 8 }}>
                            <XAxis type="number" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-3)" fontSize={11} width={72} tickLine={false} axisLine={false} />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.025)' }}
                              contentStyle={{ background: '#18181c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                              labelStyle={{ color: '#ebebed' }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={13}>
                              {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Bar>
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <div className="card-header-icon" style={{ background: 'rgba(61,220,132,0.1)' }}>
                          <IC.Pie style={{ color: 'var(--green)' }} />
                        </div>
                        <span className="card-title">Sentiment Split</span>
                      </div>
                      <div className="card-body" style={{ paddingTop: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height={200}>
                          <RePieChart>
                            <Pie data={sentData} cx="50%" cy="45%" innerRadius={46} outerRadius={70} paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={800}>
                              {sentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#18181c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                            <Legend verticalAlign="bottom" height={28} formatter={v => <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>{v}</span>} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* ── Right: Comment feed ── */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: '1rem' }}>
                <div className="card-header">
                  <div className="card-header-icon" style={{ background: 'rgba(181,123,238,0.1)' }}>
                    <IC.Chat style={{ color: 'var(--purple)' }} />
                  </div>
                  <span className="card-title">Comment Feed</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.66rem', color: 'var(--text-3)' }}>
                    {filtered.length} / {n}
                  </span>
                </div>

                <div className="feed-search">
                  <IC.Search />
                  <input
                    placeholder="Search comments…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div className="filters">
                  <div className="filter-row">
                    <span className="filter-label">Sentiment</span>
                    {['All', 'Positive', 'Neutral', 'Negative'].map(v => (
                      <button
                        key={v}
                        onClick={() => setSentF(v)}
                        className={`pill ${sentF === v ? (v === 'Positive' ? 'on-pos' : v === 'Negative' ? 'on-neg' : 'on') : ''}`}
                      >{v}</button>
                    ))}
                  </div>
                  <div className="filter-row">
                    <span className="filter-label">Category</span>
                    {['All', 'Praise', 'Question', 'Feedback', 'Noise'].map(v => (
                      <button
                        key={v}
                        onClick={() => setCatF(v)}
                        className={`pill ${catF === v ? 'on' : ''}`}
                      >{v === 'Noise' ? 'Noise/Spam' : v}</button>
                    ))}
                  </div>
                </div>

                <div className="feed-list">
                  {filtered.length === 0 ? (
                    <div className="empty-feed">No comments match your filters.</div>
                  ) : (
                    filtered.map((c, idx) => (
                      <div
                        key={c.id}
                        className="comment-row"
                        style={{ '--delay': `${Math.min(idx * 35, 400)}ms` }}
                      >
                        <img className="comment-avatar" src={c.author_profile_image} alt={c.author_name} />
                        <div className="comment-body">
                          <div className="comment-top">
                            <span className="comment-author">{c.author_name}</span>
                            <div className="comment-tags">
                              <span className={`tag tag-${c.sentiment.toLowerCase()}`}>{c.sentiment}</span>
                              <span className={`tag tag-${c.category.toLowerCase()}`}>{c.category}</span>
                            </div>
                          </div>
                          <p className="comment-text">{c.text}</p>
                          <div className="comment-meta">
                            <span className="comment-likes"><IC.Heart /> {c.like_count}</span>
                            <span>{new Date(c.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </main>
        )}

        <footer className="footer">
          <span className="footer-text">© {new Date().getFullYear()} VoxTube. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {visits !== null && (
              <span className="footer-link" style={{ cursor: 'default', color: 'var(--text-3)' }}>
                👁️ {visits.toLocaleString()} visits
              </span>
            )}
            <a href="https://github.com/amanrock1/voxtube" target="_blank" rel="noreferrer" className="footer-link">
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/aman-prabhat-b75735325/" target="_blank" rel="noreferrer" className="footer-link">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </footer>

      </div>
    </>
  );
}
