export default function Loading({ step }) {
  return (
          <div className="loading-wrap fade-up">
            <div className="orb" />
            <div style={{ textAlign: 'center' }}>
              <div className="loading-title">Analyzing comments</div>
              <div className="loading-step" style={{ marginTop: '0.5rem' }}>{step}</div>
            </div>
            <div className="loading-note">
              Gemini analyzes comments in batches. Most videos finish in under a minute; large threads can take longer.
            </div>
            <div className="loading-server-notice">
              <div style={{ textAlign: 'left' }}>
                <strong>Server notice:</strong> The server might be busy or resolving Google API rate limits. Under heavy loads, the analysis can take up to 2-3 minutes. Please stay on this page.
              </div>
            </div>
          </div>
  );
}
