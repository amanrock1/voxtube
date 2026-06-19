# 🎥 VoxTube — AI-Powered YouTube Comment Analyzer

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg?logo=vite)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-4-lightgrey.svg?logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg?logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI-orange.svg?logo=google)](https://ai.google.dev/)

VoxTube is a premium, high-fidelity web application that analyzes YouTube video comments in real-time. By combining the official **YouTube Data API v3** with Google's **Gemini AI**, it automatically scrapes comments, runs sentiment analysis, categorizes user feedback, and generates comprehensive audience summaries. It features database caching via **Supabase** to avoid redundant API hits.

---

## 📷 Screenshots & Demo

Here is a preview of the VoxTube interface:

<!-- SCREENSHOT 1: LANDING PAGE -->
<p align="center">
  <img src="https://via.placeholder.com/800x450.png?text=VoxTube+Landing+Page+Screenshot+Placeholder" alt="VoxTube Premium Landing Page" width="800" style="border-radius: 8px; box-shadow: 0 4px 30px rgba(0,0,0,0.4);" />
  <br />
  <em>Figure 1: High-fidelity dark mode landing page with particle background and interactive cards.</em>
</p>

<!-- SCREENSHOT 2: ANALYTICS DASHBOARD -->
<p align="center">
  <img src="https://via.placeholder.com/800x450.png?text=VoxTube+Dashboard+Screenshot+Placeholder" alt="VoxTube Analytics Dashboard" width="800" style="border-radius: 8px; box-shadow: 0 4px 30px rgba(0,0,0,0.4);" />
  <br />
  <em>Figure 2: Real-time analytics dashboard presenting AI sentiment breakdown, category charts, and detailed comment filters.</em>
</p>

---

## ✨ Features

* **Premium Dark Aesthetics:** Glassmorphism UI built with custom CSS, containing neon glow effects, dynamic particle canvas, magnetic buttons, and smooth hover micro-animations.
* **Intelligent AI Pipeline:** Batch-processes up to 300 comments sequentially using Google's `gemini-2.5-flash` model to guarantee rate limit compliance on the free tier.
* **Granular Sentiment & Intent Analysis:** Classifies comments into Positive, Neutral, or Negative sentiments, and categorizes them as Praise, Question, Feedback, or Noise.
* **AI-Generated Summary:** Produces a high-level executive markdown summary of the audience consensus (General Consensus, what they loved, and top critiques).
* **Supabase Smart Caching:** Stores previously analyzed videos and comment classifications to ensure lightning-fast subsequent loads and protect your Google/YouTube API quotas.
* **Interactive Filtering:** Live-search comments by keyword, sentiment, or category with real-time responsive counters.

---

## 🛠️ Tech Stack

### Frontend
* **Core:** React 19, Vite 8, Vanilla CSS
* **Visualization:** Recharts (responsive Pie & Bar charts)
* **Animations:** Interactive Canvas API (particles), Custom React Hooks (animated counters)

### Backend
* **Runtime:** Node.js, Express
* **Database & Caching:** Supabase PostgreSQL (PostgREST)
* **AI Orchestration:** `@google/generative-ai` SDK
* **YouTube Ingestion:** Google APIs (`googleapis`)

---

## 🚀 Local Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/amanrock1/voxtube.git
cd voxtube
```

### 2. Configure Environment Variables
Create a `.env` file inside the `server/` directory:
```env
PORT=5001
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-google-ai-studio-api-key
YOUTUBE_API_KEY=your-youtube-data-api-v3-key
```

### 3. Run Backend (Express)
```bash
cd server
npm install
npm run dev
```

### 4. Run Frontend (React + Vite)
```bash
cd ../client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser to view the application!

---

## 📦 Deployment

* **Frontend:** Hosted on [Vercel](https://vercel.com/) (Root folder: `client/`)
* **Backend:** Hosted on [Render.com](https://render.com/) (Root folder: `server/`)
