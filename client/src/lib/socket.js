import { io } from 'socket.io-client';
import { BACKEND_URL } from './config.js';

// REST calls go through Vercel's /api rewrite, but Vercel can't proxy WebSockets,
// so the socket connects straight to the backend. In dev BACKEND_URL is empty and
// Vite proxies /socket.io. No cookies are needed: seat rooms are public.
export const socket = io(BACKEND_URL || undefined, { autoConnect: false });
