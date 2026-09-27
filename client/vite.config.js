import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In dev, /api calls go to the Express server. Same origin for the browser,
    // so the auth cookie just works without any CORS setup.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
