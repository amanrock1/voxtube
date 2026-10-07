// In development the API is on localhost:5000 (the server default). In production set VITE_API_URL
// on the hosting platform; the Render URL is the fallback so an unset variable does not break the deploy.
const DEFAULT_ORIGIN = import.meta.env?.DEV ? 'http://localhost:5000' : 'https://voxtube-gs6s.onrender.com';
export const API_BASE = `${(import.meta.env?.VITE_API_URL || DEFAULT_ORIGIN).replace(/\/+$/, '')}/api`;

export async function analyzeUrl(url, turnstileToken, { fetchImpl = (...a) => fetch(...a), base = API_BASE } = {}) {
  let res;
  try {
    res = await fetchImpl(`${base}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, turnstileToken }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* body was not JSON */ }

  if (!res.ok) throw new Error(data?.error || `Analysis failed (HTTP ${res.status}).`);
  if (!data?.video || !Array.isArray(data.comments)) throw new Error('The server returned an unexpected response.');
  return data;
}
