import { IC } from './Icons';
import StatCard from './StatCard';
import Markdown from './Markdown';
import Charts from './Charts';
import CommentFeed from './CommentFeed';
import { computeStats } from '../lib/stats';

export default function Dashboard({ video, comments }) {
  const { n, posRate, qRate, sentData, catData } = computeStats(comments);

  return (
    <main className="fade-up">
            <div className="video-header">
              <img className="video-thumb" src={video.thumbnail} alt={video.title} />
              <div className="video-meta">
                <div className="video-analyzed-tag">analyzed</div>
                <h2 className="video-title">{video.title}</h2>
                <div className="video-channel">
                  <span>{video.channel_title}</span>
                  <span style={{ color: 'var(--text-3)' }}>·</span>
                  {video.id.startsWith('reddit_') ? (
                    <a href={`https://www.reddit.com/comments/${video.id.replace('reddit_', '')}`} target="_blank" rel="noreferrer">
                      Open on Reddit <IC.Ext />
                    </a>
                  ) : (
                    <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
                      Watch on YouTube <IC.Ext />
                    </a>
                  )}
                </div>
              </div>
            </div>

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

      <div className="dash-grid">
        <div className="dash-left">
                <div className="card">
                  <div className="card-header">
                    <div className="card-header-icon" style={{ background: 'rgba(0,229,204,0.1)' }}>
                      <IC.Star style={{ color: 'var(--cyan)' }} />
                    </div>
                    <span className="card-title">AI Audience Consensus</span>
                  </div>
                  <div className="card-body">
                    <Markdown text={video.summary} />
                  </div>
                </div>

          {!video.id.startsWith('reddit_') && <Charts sentData={sentData} catData={catData} />}
        </div>

        <CommentFeed comments={comments} />
      </div>
    </main>
  );
}
