const supabase = require('../utils/supabase');

const mockVideo = {
  id: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
  channel_title: 'Rick Astley',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  published_at: new Date('1987-07-27').toISOString(),
  summary: `### 📊 Audience Sentiment & Feedback Summary

* **General Consensus:** The comment section is overwhelmingly positive, filled with nostalgia, humorous memes, and respect for this legendary track. It represents one of the most united and wholesome spaces on the internet.
* **What They Loved:**
  - The iconic 80s dance moves and synth-pop instrumentation.
  - The wholesomeness of the "Rickroll" meme culture.
  - Rick Astley's incredible deep voice.
* **Critiques & Suggestions:**
  - Nostalgic users wishing music was still made like this.
  - Users jokingly complaining that they were tricked into opening the video again.`
};

const mockComments = [
  {
    id: 'c1',
    video_id: 'dQw4w9WgXcQ',
    author_name: 'David Miller',
    author_profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
    text: 'Can we all appreciate that this song has literally united the internet for decades? Absolute masterpiece!',
    like_count: 342,
    published_at: new Date().toISOString(),
    sentiment: 'Positive',
    category: 'Praise'
  },
  {
    id: 'c2',
    video_id: 'dQw4w9WgXcQ',
    author_name: 'Sarah Jenkins',
    author_profile_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80',
    text: 'Is Rick Astley still touring in 2026? I would absolutely love to see him perform this live!',
    like_count: 57,
    published_at: new Date().toISOString(),
    sentiment: 'Neutral',
    category: 'Question'
  },
  {
    id: 'c3',
    video_id: 'dQw4w9WgXcQ',
    author_name: 'SpamBot_99',
    author_profile_image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&h=80&q=80',
    text: 'FREE BITCOIN HERE!!! CLICK LINK ON MY PROFILE 💰🔥!!!',
    like_count: 0,
    published_at: new Date().toISOString(),
    sentiment: 'Negative',
    category: 'Noise'
  },
  {
    id: 'c4',
    video_id: 'dQw4w9WgXcQ',
    author_name: 'Alex Rivera',
    author_profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80',
    text: 'The audio mixing on this version sounds a bit bass-heavy compared to the original vinyl release. Anyone else notice this?',
    like_count: 14,
    published_at: new Date().toISOString(),
    sentiment: 'Neutral',
    category: 'Feedback'
  },
  {
    id: 'c5',
    video_id: 'dQw4w9WgXcQ',
    author_name: 'Emily Watson',
    author_profile_image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80',
    text: 'I got Rickrolled by a link in my computer science syllabus... I am not even mad, this song is a bop!',
    like_count: 820,
    published_at: new Date().toISOString(),
    sentiment: 'Positive',
    category: 'Praise'
  }
];

async function seed() {
  console.log('Starting Supabase database seeding...');

  try {
    // Insert Mock Video
    console.log('Inserting mock video metadata...');
    const { error: videoErr } = await supabase
      .from('videos')
      .upsert([mockVideo]);

    if (videoErr) throw videoErr;

    // Insert Mock Comments
    console.log('Inserting mock comments...');
    const { error: commentsErr } = await supabase
      .from('comments')
      .upsert(mockComments);

    if (commentsErr) throw commentsErr;

    console.log('Database seeded successfully! You can now test the app with the sample Rick Astley video.');
  } catch (error) {
    console.error('Seeding failed:', error.message);
    console.log('Please ensure your SQL schema has been created in your Supabase SQL Editor first.');
  }
}

seed();
