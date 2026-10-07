# VoxTube: stabilize, fix and restructure

Date: 2026-10-07. Status: awaiting owner review. Nothing is committed or pushed; the owner runs all git commands.

## Goal
Make VoxTube (YouTube + Reddit comment analyzer: Express API, React/Vite client, Supabase, Gemini, Turnstile) work end to end, correct and maintainable, with the same features and look. Remove learning-stage mistakes and misleading copy.

## Diagnosis (verified 2026-10-07)
- Supabase: `SUPABASE_URL` host returns ENOTFOUND, so every analyze call fails at the cache lookup. **Needs the owner**: a live Supabase project, URL and service_role key.
- Gemini: `gemini-flash-latest` fails; the code swallows errors and stores every comment as Neutral/Noise, and that bad result is cached.
- YouTube API works. Server boots and `/api/health` returns 200. Reddit scraping unconfirmed (TLS error in the test environment).
- Other defects from the review (ports, Reddit parent ids, limiter order, dummy Turnstile keys, dead API-key code, fake visit counter, wrong copy, lint errors, unused deps, duplicated schema).

## Server changes
Layout: `src/config.js` (env validation, fails fast in production), `src/app.js` (builds the app, no listen), `src/index.js` (listen), `src/middleware/` (cors, turnstile, limits, errors), `src/routes/` (analyze, videos), `src/services/` (youtube, reddit, gemini, analysis pipeline), `src/utils/`.
- **Gemini:** one shared `withRetry` helper replaces three copies. Models come from env (`GEMINI_MODEL`, default `gemini-2.5-flash-lite`; fallback `gemini-2.5-flash`). Comments are classified in chunks of 50. Any chunk that cannot be classified makes the request fail with a clear error. Fallback labels are never stored. Summaries use the most-liked comments.
- **Cache:** only complete, successful analyses are stored. Entries older than 7 days are re-analysed. Concurrent requests for the same id share one in-flight job.
- **Reddit:** fix parent-id prefixing so reply threading works. Timeout 20s. Resolve relative redirects. Return a clear "Reddit blocked the request" error. Remove unused `REDDIT_*` vars from docs.
- **YouTube:** `order=relevance`, request timeouts, tolerate disabled-comment errors.
- **Security:** rate limiter runs before CAPTCHA; limiter also on `/api/videos*`. Turnstile fails closed unless `NODE_ENV=development`. Remove the dummy secret from `.env.example`. Remove dead `x-api-key`. CORS origins come from `FRONTEND_URL` (comma list) plus localhost only in development; CORS errors return JSON; `/api/health` is exempt from the Origin rule.
- **Cleanup:** delete `delete_cache.js`; `seed.js` refuses to run in production and is clearly labelled; drop `@google/genai`; one `schema.sql` containing the tables, indexes and RLS (the README points to it).
- **Tests:** `node:test`, no new dependencies. Cover URL parsing, Reddit HTML parsing (fixture), retry helper, classification failure handling, middleware order, CAPTCHA fail-closed, and the analyze route with mocked services.

## Client changes
- Split the 962-line `App.jsx` into `components/` (Landing, Dashboard, Charts, CommentFeed, Icons, Footer), `hooks/`, and `lib/api.js`. Keep `index.css` and the current look.
- API base from `VITE_API_URL`, default `http://localhost:5000/api`; add `client/.env.example`. Remove `VITE_API_KEY`. Turnstile site key must come from env; show a config message instead of a test key.
- Icons accept props so their colours work. Fix lint (unused `React`/`API_KEY`, `useCounter`, `useScramble` deps) so `npm run lint` passes.
- **Honesty:** the visit counter shows only the real count (hidden on failure, no offset, no random fallback). Landing mock numbers are labelled "Example". Ticker and copy corrected (model name, "usually under a minute", not "real-time"). The README is aligned with the code.
- Remove unused `lucide-react`; drop `legacy-peer-deps` if installs stay clean (recharts version bumped if needed). Replace the Vite template `client/README.md`.

## Verification
Server tests pass; `npm run lint` and `npm run build` pass; boot server and exercise endpoints with real YouTube and Gemini calls. Database and Reddit paths are tested with mocks until the owner supplies a working Supabase project. I will report exactly what was and wasn't verified end to end.

## Out of scope
New features, a redesign, TypeScript migration, deployment config, and any git commit or push.
