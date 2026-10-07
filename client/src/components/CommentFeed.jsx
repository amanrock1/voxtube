import { useState } from 'react';
import { IC } from './Icons';
import Avatar from './Avatar';

export default function CommentFeed({ comments }) {
  const [search, setSearch] = useState('');
  const [sentF, setSentF] = useState('All');
  const [catF, setCatF] = useState('All');

  const q = search.toLowerCase();
  const filtered = comments.filter((c) =>
    ((c.text || '').toLowerCase().includes(q) || (c.author_name || '').toLowerCase().includes(q))
    && (sentF === 'All' || c.sentiment === sentF)
    && (catF === 'All' || c.category === catF));

  return (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: '1rem' }}>
                <div className="card-header">
                  <div className="card-header-icon" style={{ background: 'rgba(181,123,238,0.1)' }}>
                    <IC.Chat style={{ color: 'var(--purple)' }} />
                  </div>
                  <span className="card-title">Comment Feed</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.66rem', color: 'var(--text-3)' }}>
                    {filtered.length} / {comments.length}
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
                        <Avatar src={c.author_profile_image} name={c.author_name} />
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
                            {c.published_at && <span>{new Date(c.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
  );
}
