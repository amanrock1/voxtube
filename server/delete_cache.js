const supabase = require('./src/utils/supabase');

async function clean() {
  const videoId = '7YrdI7h2XoY';
  console.log(`Deleting cached comments for video: ${videoId}`);
  const { error: err1 } = await supabase.from('comments').delete().eq('video_id', videoId);
  if (err1) console.error('Error deleting comments:', err1.message);

  console.log(`Deleting cached video: ${videoId}`);
  const { error: err2 } = await supabase.from('videos').delete().eq('id', videoId);
  if (err2) console.error('Error deleting video:', err2.message);

  console.log('Cleanup completed successfully!');
}

clean();

