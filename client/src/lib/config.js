// Origin of the Express server, e.g. https://cinebook-api.onrender.com. Empty in dev.
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

// Render's free tier sleeps after 15 idle minutes and takes ~30-50s to wake. Ping it the
// moment the page loads so it's usually awake by the time the user needs the API.
export function wakeBackend() {
  if (!BACKEND_URL) return;
  fetch(`${BACKEND_URL}/api/health`, { mode: 'no-cors' }).catch(() => {});
}
