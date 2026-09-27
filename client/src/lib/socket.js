import { io } from 'socket.io-client';

// In production the API is on its own domain (e.g. Render), so connect there.
// In dev there's no VITE_API_URL and Vite proxies /socket.io to the Express server.
const apiUrl = import.meta.env.VITE_API_URL;
const socketUrl = apiUrl ? new URL(apiUrl).origin : undefined;

// One shared connection for the whole app, opened the first time a page needs it.
export const socket = io(socketUrl, { autoConnect: false, withCredentials: true });
