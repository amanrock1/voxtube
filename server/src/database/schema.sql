-- VoxTube schema. Run once in the Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(255) PRIMARY KEY,                 -- YouTube video id, or "reddit_<post id>"
    title TEXT NOT NULL,
    channel_title VARCHAR(255) NOT NULL,
    thumbnail TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    video_id VARCHAR(255) REFERENCES videos(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_profile_image TEXT,
    text TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    sentiment VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment);
CREATE INDEX IF NOT EXISTS idx_comments_category ON comments(category);

-- Row Level Security: no policies are created on purpose, so the public anon key can read nothing.
-- Only the backend (service_role key, which bypasses RLS) can read and write.
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
