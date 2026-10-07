import { useState } from 'react';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Loading from './components/Loading';
import Footer from './components/Footer';
import { IC } from './components/Icons';
import useVisits from './hooks/useVisits';
import useCursorGlow from './hooks/useCursorGlow';
import { analyzeUrl } from './lib/api';
import { TICKER_ITEMS } from './lib/samples';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const LOADING_STEPS = [
  'Fetching comment threads…',
  'Packaging comments for Gemini…',
  'AI classifying sentiment…',
  'Categorising topics & intent…',
  'Building audience summary…',
];

export default function App() {
  const [view, setView] = useState('landing');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState(null); // { video, comments }
  const [token, setToken] = useState('');
  const visits = useVisits();
  useCursorGlow();

  const analyze = async (videoUrl) => {
    if (loading || !videoUrl.trim()) return;
    if (!token) {
      setError('Please wait for the security check (CAPTCHA) to finish.');
      return;
    }
    setLoading(true);
    setError('');
    setStep('Connecting to platform API…');
    let i = 0;
    const timer = setInterval(() => { if (i < LOADING_STEPS.length) setStep(LOADING_STEPS[i++]); }, 1500);
    try {
      setData(await analyzeUrl(videoUrl.trim(), token));
      setView('dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timer);
      setLoading(false);
      setStep('');
      // A Turnstile token is single-use. The landing page unmounts while loading and remounts
      // afterwards, which creates a new widget and a fresh token.
      setToken('');
    }
  };

  const reset = () => { setView('landing'); setUrl(''); setData(null); setError(''); };
  const ticker = [...TICKER_ITEMS, ...TICKER_ITEMS]; // doubled for a seamless loop

  return (
    <>
      <div className="bg-glow" />
      <div className="cursor-glow" />

      <div className="ticker-bar" aria-hidden="true">
        <div className="ticker-inner">{ticker.map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>

      <div className="container">
        <header className="navbar">
          <div className="logo" onClick={reset}>
            <div className="logo-icon" style={{ position: 'relative', overflow: 'hidden' }}>
              <img src="/favicon.png" alt="VoxTube Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              <span className="logo-ring" />
            </div>
            <span className="logo-name">VoxTube</span>
            <span className="logo-badge">v1</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {view === 'dashboard' && <button className="back-btn" onClick={reset}><IC.Back /> Back</button>}
          </div>
        </header>

        {loading && <Loading step={step} />}

        {!loading && view === 'landing' && (
          <Landing
            url={url}
            setUrl={setUrl}
            onAnalyze={analyze}
            error={error}
            setError={setError}
            token={token}
            setToken={setToken}
            siteKey={SITE_KEY}
          />
        )}

        {!loading && view === 'dashboard' && data && <Dashboard video={data.video} comments={data.comments} />}

        <Footer visits={visits} />
      </div>
    </>
  );
}
