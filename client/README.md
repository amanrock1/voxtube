# VoxTube client

React 19 + Vite single-page app for [VoxTube](../README.md). It sends a YouTube or Reddit URL (plus a Cloudflare Turnstile token) to the API and renders the sentiment charts, AI summary and filterable comment feed.

## Run it

```bash
cp .env.example .env     # then set VITE_TURNSTILE_SITE_KEY
npm install
npm run dev              # http://localhost:5173
```

The API must be running too (see `../server`). In development the client calls `http://localhost:5000` unless `VITE_API_URL` is set.

## Scripts

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for `src/lib` (`node:test`) |

## Environment

| Variable | Needed | Purpose |
| :-- | :-- | :-- |
| `VITE_TURNSTILE_SITE_KEY` | Yes | Turnstile **site** key (public). The Analyze button is disabled without it. |
| `VITE_API_URL` | Production | API origin, e.g. `https://your-api.onrender.com`. Set it on your hosting platform. |

## Layout

- `src/App.jsx`: state and screen switching (landing, loading, dashboard)
- `src/components/`: UI pieces (Landing, Dashboard, CommentFeed, Charts, Icons, ...)
- `src/hooks/`: small effects (counter animation, text scramble, visit counter, cursor glow)
- `src/lib/`: `api.js` (server calls), `stats.js` (chart numbers), `samples.js` (example videos, ticker text)
