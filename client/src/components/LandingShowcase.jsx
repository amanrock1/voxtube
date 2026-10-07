export default function LandingShowcase() {
  return (
    <>
            <section className="landing-section fade-up">
              <h2 className="landing-section-title">Why VoxTube?</h2>
              <p className="landing-section-subtitle">
                VoxTube is designed to solve comment fatigue. Instead of wasting hours reading through comments manually, get immediate, structured audience intelligence.
              </p>
              
              <div className="info-grid">
                {/* Card 1: Sentiment Analysis */}
                <div className="info-card" style={{ '--accent-color': 'var(--cyan)', '--accent-bg': 'rgba(0, 229, 204, 0.08)' }}>
                  <span className="example-tag">Example</span>
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
                  <span className="example-tag">Example</span>
                  <h3 className="info-card-title">Noise & Spam Filtering</h3>
                  <p className="info-card-desc">
                    Our intelligent classification automatically separates praise, constructive feedback, and actual questions from bot spam and off-topic noise.
                  </p>

                  <div className="showcase-container">
                    <div className="noise-stats">
                      <div className="noise-stat-box full">
                        <span className="noise-stat-lbl">Total Comments</span>
                        <span className="noise-stat-val">300</span>
                      </div>
                      <div className="noise-stat-box">
                        <span className="noise-stat-lbl">Relevant</span>
                        <span className="noise-stat-val relevant">212</span>
                      </div>
                      <div className="noise-stat-box">
                        <span className="noise-stat-lbl">Noise</span>
                        <span className="noise-stat-val" style={{ color: 'var(--text-3)' }}>88</span>
                      </div>
                    </div>
                    <div className="noise-comments-list">
                      <div className="noise-comment-item">
                        <span className="noise-comment-txt">"Amazing tutorial! The explanation was perfect."</span>
                        <span className="noise-comment-tag ok">Praise</span>
                      </div>
                      <div className="noise-comment-item filtered">
                        <span className="noise-comment-txt">"👉 FREE BITCOIN INFO IN MY BIO 👈"</span>
                        <span className="noise-comment-tag spam">Noise</span>
                      </div>
                      <div className="noise-comment-item filtered">
                        <span className="noise-comment-txt">"Great video! Watch my channel [link]"</span>
                        <span className="noise-comment-tag bot">Noise</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: AI Consensus */}
                <div className="info-card" style={{ '--accent-color': 'var(--purple)', '--accent-bg': 'rgba(181, 123, 238, 0.08)' }}>
                  <span className="example-tag">Example</span>
                  <h3 className="info-card-title">AI Audience Consensus</h3>
                  <p className="info-card-desc">
                    Powered by Google Gemini AI to summarize key takeaways, top critiques, and user suggestions in a clean executive consensus report.
                  </p>

                  <div className="showcase-container consensus-preview">
                    <div className="consensus-header">
                      <span>AUDIENCE CONSENSUS</span>
                      <span className="consensus-badge">SAMPLE</span>
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
                What happens when you press Analyze:
              </p>
              
              <div className="pipeline-container">
                <div className="pipeline-node">
                  <div className="node-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <div className="node-title">YouTube or Reddit URL</div>
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
                  <div className="node-desc">Up to 300 YouTube comments via the API, or a Reddit thread read from its page</div>
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
    </>
  );
}
