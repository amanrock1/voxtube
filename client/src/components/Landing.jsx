import { Turnstile } from '@marsidev/react-turnstile';
import { IC } from './Icons';
import QuickCard from './QuickCard';
import LandingShowcase from './LandingShowcase';
import useScramble from '../hooks/useScramble';
import { SAMPLES } from '../lib/samples';

export default function Landing({ url, setUrl, onAnalyze, error, setError, token, setToken, siteKey }) {
  const scrambled = useScramble('vibe', 600);
  const ready = Boolean(siteKey) && Boolean(token);

  const addRipple = (e) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - r.left}px`;
    ripple.style.top = `${e.clientY - r.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <main>
      <div className="hero fade-up">
        <h1 className="hero-title">
          Read every comment.<br />
          Understand the{' '}
          <span className="hero-accent">{scrambled}.</span>
        </h1>

        <p className="hero-subtitle">
          Paste a YouTube video or Reddit post link. We fetch the comment threads, analyze them with Gemini AI, and show you clean, actionable insights, usually within a minute.
        </p>

        <div className="search-wrap">
          <div className="search-icon-wrap"><IC.Search /></div>
          <input
            className="search-input"
            type="text"
            placeholder="Paste YouTube video or Reddit post URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ready && onAnalyze(url)}
          />
          <button
            className="analyze-btn"
            disabled={!ready}
            onClick={(e) => { addRipple(e); onAnalyze(url); }}
          >
            <IC.Zap /> Analyze
          </button>
        </div>

        <div className="captcha-wrap" style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'center' }}>
          {siteKey ? (
            <Turnstile
              siteKey={siteKey}
              onSuccess={(t) => setToken(t)}
              onError={() => setError('CAPTCHA failed to load. Please reload the page.')}
              onExpire={() => { setToken(''); setError('CAPTCHA expired. Please complete the security check again.'); }}
              options={{ theme: 'dark' }}
            />
          ) : (
            <div className="error-msg"><IC.Alert /> The CAPTCHA site key is not configured (VITE_TURNSTILE_SITE_KEY), so analysis is disabled.</div>
          )}
        </div>
        {siteKey && !token && <p className="section-label" style={{ textAlign: 'center' }}>Verifying you are human…</p>}

        {error && (
          <div className="error-msg">
            <IC.Alert /> {error}
          </div>
        )}
      </div>

      <LandingShowcase />

      <div style={{ marginTop: '4rem' }}>
        <p className="section-label">or try a quick example</p>
        <div className="quick-grid stagger">
          {SAMPLES.map((v) => (
            <QuickCard key={v.id} video={v} disabled={!ready} onClick={() => onAnalyze(v.url)} />
          ))}
        </div>
      </div>
    </main>
  );
}
