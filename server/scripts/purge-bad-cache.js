// Finds cached analyses that are corrupt (failed summary, all-Neutral/Noise, no comments, demo rows) and
// optionally deletes them so they are re-analysed on the next request.
//   npm run purge-cache               -> dry run, lists problems
//   npm run purge-cache -- --apply    -> deletes them
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH });
const { createSupabase } = require('../src/utils/supabase');
const { getCacheProblem } = require('../src/utils/cachePolicy');

const SEED_COMMENT_IDS = /^c[1-5]$/;

async function main() {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_KEY are required.');
  const apply = process.argv.includes('--apply');
  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);

  const { data: videos, error } = await supabase.from('videos').select('*');
  if (error) throw new Error(`Could not read videos: ${error.message}`);

  const bad = [];
  for (const video of videos) {
    const { data: comments, error: cErr } = await supabase.from('comments').select('id,sentiment,category').eq('video_id', video.id);
    if (cErr) throw new Error(`Could not read comments for ${video.id}: ${cErr.message}`);
    const problem = comments.some((c) => SEED_COMMENT_IDS.test(c.id))
      ? 'seed-data'
      : getCacheProblem({ video, comments, ttlMs: Infinity });
    if (problem) bad.push({ id: video.id, title: String(video.title).slice(0, 50), problem, comments: comments.length });
  }

  console.log(`${videos.length} cached analyses checked, ${bad.length} problem(s).`);
  console.table(bad);
  if (!apply) {
    if (bad.length) console.log('Dry run only. Re-run with --apply to delete these.');
    return;
  }
  for (const b of bad) {
    await supabase.from('comments').delete().eq('video_id', b.id);
    await supabase.from('videos').delete().eq('id', b.id);
  }
  console.log(`Deleted ${bad.length} record(s).`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
