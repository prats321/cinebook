import { Server } from 'socket.io';
import { env } from './config/env.js';
import { SeatLock } from './models/SeatLock.js';

// Each show is a Socket.io room ("show:<id>"). When its seats change, everyone viewing
// that show gets a tiny "seats:changed" ping and refetches the seat map over REST.
// The event carries no seat data, so nobody learns who is holding what, and the REST
// endpoint stays the single source of truth.

let io = null;
const OBJECT_ID = /^[a-f\d]{24}$/i;
const SWEEP_MS = 15_000;

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    // Sockets connect straight to Render (Vercel rewrites can't proxy WebSockets),
    // so this one really is cross-origin. Rooms are public, so no cookie is needed.
    cors: { origin: env.clientUrls },
  });

  io.on('connection', (socket) => {
    socket.on('show:join', (showId) => {
      if (typeof showId === 'string' && OBJECT_ID.test(showId)) socket.join(`show:${showId}`);
    });
    socket.on('show:leave', (showId) => {
      if (typeof showId === 'string') socket.leave(`show:${showId}`);
    });
  });

  startExpirySweeper();
  return io;
}

export function notifySeatsChanged(showId) {
  io?.to(`show:${showId}`).emit('seats:changed', { showId: String(showId) });
}

// MongoDB's TTL index deletes expired holds silently, so nobody would be told the seats
// are free again. This sweep removes them first (every 15s, vs TTL's ~60s) and notifies.
function startExpirySweeper() {
  const timer = setInterval(async () => {
    try {
      const now = new Date();
      const shows = await SeatLock.distinct('show', { expiresAt: { $lte: now } });
      if (!shows.length) return;
      await SeatLock.deleteMany({ expiresAt: { $lte: now } });
      shows.forEach(notifySeatsChanged);
    } catch (err) {
      console.error('Seat hold sweep failed:', err.message);
    }
  }, SWEEP_MS);
  timer.unref(); // don't keep the process alive just for this
}
