import { Movie } from '../models/Movie.js';
import { Show } from '../models/Show.js';
import { Theatre } from '../models/Theatre.js';
import { istDateTime, todayInIST } from '../utils/time.js';

// Keeps the demo alive: every screen always has shows for the next DAYS_AHEAD days.
// Without this, a deployed site would run out of showtimes a week after seeding.
export const DAYS_AHEAD = 7;
const SLOTS = ['10:00', '13:30', '17:00', '20:30'];
const MAX_RUNTIME = 190; // longer films would overlap the next 3.5-hour slot
const REFRESH_MS = 6 * 60 * 60 * 1000;

const PRICES = {
  '2D': { RECLINER: 450, PREMIUM: 280, NORMAL: 200 },
  '3D': { RECLINER: 550, PREMIUM: 350, NORMAL: 260 },
};

const dayNumber = (dateStr) => Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86_400_000);

// Idempotent: only fills slots that are empty, so it's safe to run on every boot,
// and it never touches shows an admin scheduled by hand.
export async function ensureUpcomingShows() {
  const now = new Date();
  const today = todayInIST();
  const dates = Array.from({ length: DAYS_AHEAD }, (_, i) =>
    new Date(new Date(`${today}T12:00:00+05:30`).getTime() + i * 86_400_000).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    }),
  );
  const windowEnd = new Date(`${dates.at(-1)}T23:59:59+05:30`);

  const [theatres, movies, existing] = await Promise.all([
    Theatre.find().lean(),
    Movie.find({ isActive: true, runtime: { $lte: MAX_RUNTIME } }).sort({ rating: -1, _id: 1 }).lean(),
    Show.find({ startTime: { $lt: windowEnd }, endTime: { $gt: now } }, { screenId: 1, startTime: 1, endTime: 1 }).lean(),
  ]);
  if (!movies.length || !theatres.length) return 0;

  const busy = new Map(); // screenId -> [[start, end]] of existing shows
  for (const s of existing) {
    const key = String(s.screenId);
    if (!busy.has(key)) busy.set(key, []);
    busy.get(key).push([s.startTime.getTime(), s.endTime.getTime()]);
  }

  const shows = [];
  let screenIndex = 0;
  for (const theatre of theatres) {
    for (const screen of theatre.screens) {
      screenIndex++;
      const taken = busy.get(String(screen._id)) || [];
      for (const date of dates) {
        SLOTS.forEach((slot, slotIndex) => {
          const startTime = istDateTime(date, slot);
          if (startTime <= now) return;

          // Deterministic pick, so the same slot always gets the same movie across runs.
          const released = movies.filter((m) => !m.releaseDate || m.releaseDate <= startTime);
          if (!released.length) return;
          const pick = dayNumber(date) * 7 + screenIndex * SLOTS.length + slotIndex;
          const movie = released[pick % released.length];
          const endTime = new Date(startTime.getTime() + movie.runtime * 60_000);

          const clashes = taken.some(([s, e]) => startTime.getTime() < e && endTime.getTime() > s);
          if (clashes) return;

          const format = pick % 5 === 0 ? '3D' : '2D';
          shows.push({
            movie: movie._id,
            theatre: theatre._id,
            screenId: screen._id,
            screenName: screen.name,
            city: theatre.city,
            startTime,
            endTime,
            format,
            language: movie.language,
            prices: PRICES[format],
            layout: screen.rows,
          });
          taken.push([startTime.getTime(), endTime.getTime()]);
        });
      }
    }
  }

  if (shows.length) await Show.insertMany(shows);
  return shows.length;
}

// Tops up on boot (Render's free tier sleeps, so boots are frequent) and every 6 hours.
export function startShowScheduler() {
  const run = () =>
    ensureUpcomingShows()
      .then((n) => n && console.log(`Scheduler: added ${n} upcoming shows`))
      .catch((err) => console.error('Scheduler failed:', err.message));
  run();
  setInterval(run, REFRESH_MS).unref();
}
