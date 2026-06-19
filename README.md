<div align="center">
  <img src="https://via.placeholder.com/150?text=VoxTube+Logo" alt="VoxTube Logo" width="120" />
  <h1>🎥 VoxTube</h1>
  <p><strong>AI-Powered YouTube Comment Analyzer & Insight Generator</strong></p>

  [![React](https://img.shields.io/badge/React-19-blue.svg?logo=react&style=for-the-badge)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-8-purple.svg?logo=vite&style=for-the-badge)](https://vite.dev/)
  [![Express](https://img.shields.io/badge/Express-4-lightgrey.svg?logo=express&style=for-the-badge)](https://expressjs.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg?logo=supabase&style=for-the-badge)](https://supabase.com/)
  [![Gemini](https://img.shields.io/badge/Google_Gemini-AI-orange.svg?logo=google&style=for-the-badge)](https://ai.google.dev/)
</div>

<br />

VoxTube is a premium, high-fidelity web application that analyzes YouTube video comments in real-time. By combining the official **YouTube Data API v3** with Google's **Gemini AI**, it automatically scrapes comments, runs sentiment analysis, categorizes user feedback, and generates comprehensive audience summaries. 

---

## 📷 Interface Previews

Here is a preview of the VoxTube interface in action:

<!-- SCREENSHOT 1 -->
<p align="center">
  <img src="https://via.placeholder.com/800x450.png?text=Screenshot+1+Placeholder" alt="VoxTube Premium Landing Page" width="800" style="border-radius: 8px; box-shadow: 0 4px 30px rgba(0,0,0,0.4);" />
  <br />
  <em>Figure 1: High-fidelity dark mode landing page with particle background and interactive cards.</em>
</p>

<!-- SCREENSHOT 2 -->
<p align="center">
  <img src="https://via.placeholder.com/800x450.png?text=Screenshot+2+Placeholder" alt="VoxTube Analytics Dashboard" width="800" style="border-radius: 8px; box-shadow: 0 4px 30px rgba(0,0,0,0.4);" />
  <br />
  <em>Figure 2: Real-time analytics dashboard presenting AI sentiment breakdown, category charts, and detailed comment filters.</em>
</p>

---

## 🎯 What Does It Solve?

Content creators, marketers, and researchers often spend hours manually reading through thousands of YouTube comments to understand audience reception. 

**VoxTube solves this problem by providing:**
1. **Instant Feedback Loop:** You don't need to scroll endlessly. VoxTube instantly tells you how the viewers feel about a specific video.
2. **Noise Reduction:** Filters out spam, trolls, and irrelevant comments, highlighting only meaningful questions, praise, and constructive feedback.
3. **Data-Driven Decisions:** Provides actionable insights via an executive summary, enabling creators to make data-backed decisions for their next video content.

---

## ⚙️ How It Works

The workflow of VoxTube is highly optimized for performance and cost-efficiency:

1. **Input:** You simply paste any YouTube video URL into the interface.
2. **Data Ingestion:** The backend uses the official **YouTube Data API v3** to fetch the top comments for that specific video.
3. **AI Processing:** Comments are batched and sent to **Google's Gemini AI**. The AI model assigns a sentiment (Positive/Negative/Neutral) and an intent category (Praise/Feedback/Question/Noise) to each comment.
4. **Executive Summary:** Gemini generates a comprehensive markdown summary, highlighting the general consensus, what viewers loved most, and top critiques.
5. **Smart Caching:** Results are instantly saved into a **Supabase PostgreSQL** database. If the same video URL is queried again, the data is served directly from the cache—resulting in lightning-fast load times and zero wasted API quotas!

---

## ✨ Key Features

* **Premium Dark Aesthetics:** Glassmorphism UI built with custom CSS, containing neon glow effects, dynamic particle canvas, magnetic buttons, and smooth hover micro-animations.
* **Intelligent AI Pipeline:** Batch-processes up to 300 comments sequentially using Google's `gemini-2.5-flash` model.
* **Granular Sentiment & Intent Analysis:** Classifies comments dynamically.
* **Supabase Smart Caching:** Stores previously analyzed videos to protect your Google/YouTube API quotas.
* **Interactive Filtering:** Live-search comments by keyword, sentiment, or category with real-time responsive Recharts graphs.

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

## 👨‍💻 About The Author

This project was built and designed by **amanrock1**.

* 🔗 **GitHub Repository:** [https://github.com/amanrock1/voxtube](https://github.com/amanrock1/voxtube)
* 💡 Contributions, issues, and feature requests are always welcome! Feel free to check the issues page or submit a pull request.

<p align="center">
  <br/>
  <em>If you found this project helpful, don't forget to give it a ⭐️ on GitHub!</em>
</p>
