require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH });
const { loadConfig } = require('./config');

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`[STARTUP ERROR] ${err.message}`);
  console.error('Copy server/.env.example to server/.env and fill in the values.');
  process.exit(1);
}

const { createApp } = require('./app');
const { createSupabase } = require('./utils/supabase');
const { createYoutubeService } = require('./services/youtubeService');
const { createRedditService } = require('./services/redditService');
const { createAiService, createGeminiGenerator } = require('./services/aiService');
const { createAnalysisService } = require('./services/analysisService');

const supabase = createSupabase(config.supabaseUrl, config.supabaseKey);
const analysis = createAnalysisService({
  supabase,
  youtube: createYoutubeService({ apiKey: config.youtubeKey }),
  reddit: createRedditService(),
  ai: createAiService({ generate: createGeminiGenerator(config.geminiKey), models: config.geminiModels }),
  ttlMs: config.cacheTtlMs,
});

createApp({ config, supabase, analysis }).listen(config.port, () => {
  console.log(`VoxTube API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
