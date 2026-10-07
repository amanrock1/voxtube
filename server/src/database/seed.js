// DEMO DATA ONLY. Inserts one clearly fake record under the id "demo_seed" (never a real video id),
// so it can never be served as the cached analysis of a real YouTube video.
// Usage: npm run seed -- --yes     (refuses to run when NODE_ENV=production)
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH });
const { createSupabase } = require('../utils/supabase');

const DEMO_ID = 'demo_seed';

const mockVideo = {
  id: DEMO_ID,
  title: 'DEMO: sample analysis (not a real video)',
  channel_title: 'Demo channel',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  published_at: new Date('2026-01-01').toISOString(),
  summary: `### Audience Sentiment & Feedback Summary

* **General Consensus:** Sample text used to preview the dashboard. These comments are invented and do not come from a real video.
* **What They Loved:**
  - Sample praise comment.
  - Sample enthusiasm comment.
* **Critiques & Suggestions:**
  - Sample question comment.
  - Sample feedback comment.`,
};

const demoComment = (n, author, text, likes, sentiment, category) => ({
  id: `demo_c${n}`,
  video_id: DEMO_ID,
  author_name: author,
  author_profile_image: null,
  text,
  like_count: likes,
  published_at: new Date('2026-01-01').toISOString(),
  sentiment,
  category,
});

const mockComments = [
  demoComment(1, 'Demo User A', 'Sample praise: this is a great video, thank you!', 342, 'Positive', 'Praise'),
  demoComment(2, 'Demo User B', 'Sample question: will there be a follow-up video?', 57, 'Neutral', 'Question'),
  demoComment(3, 'Demo Spam Bot', 'SAMPLE SPAM: click the link in my profile!!!', 0, 'Negative', 'Noise'),
  demoComment(4, 'Demo User C', 'Sample feedback: the audio was a little quiet in the middle.', 14, 'Neutral', 'Feedback'),
  demoComment(5, 'Demo User D', 'Sample praise: I learned a lot from this.', 820, 'Positive', 'Praise'),
];

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data in production.');
  if (!process.argv.includes('--yes')) throw new Error('This writes demo rows to your database. Re-run with --yes to confirm.');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_KEY are required.');

  const supabase = createSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const v = await supabase.from('videos').upsert([mockVideo]);
  if (v.error) throw v.error;
  const c = await supabase.from('comments').upsert(mockComments);
  if (c.error) throw c.error;
  console.log(`Seeded demo record "${DEMO_ID}". View it via GET /api/videos/${DEMO_ID}.`);
}

seed().catch((err) => { console.error('Seeding failed:', err.message); process.exit(1); });
