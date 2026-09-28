// Fills the database with demo data: an admin, theatres in 3 cities, movies from
// TMDB and a week of shows. WARNING: wipes existing movies, theatres, shows and bookings.
//
//   npm run seed
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Movie } from '../models/Movie.js';
import { Theatre } from '../models/Theatre.js';
import { Show } from '../models/Show.js';
import { SeatLock } from '../models/SeatLock.js';
import { Booking } from '../models/Booking.js';
import * as tmdb from '../services/tmdb.service.js';
import { ensureUpcomingShows, DAYS_AHEAD } from '../services/showScheduler.service.js';

const standardScreen = (name) => ({
  name,
  rows: [
    { label: 'A', category: 'RECLINER', seats: 8 },
    { label: 'B', category: 'RECLINER', seats: 8 },
    { label: 'C', category: 'PREMIUM', seats: 12 },
    { label: 'D', category: 'PREMIUM', seats: 12 },
    { label: 'E', category: 'PREMIUM', seats: 12 },
    { label: 'F', category: 'NORMAL', seats: 14 },
    { label: 'G', category: 'NORMAL', seats: 14 },
    { label: 'H', category: 'NORMAL', seats: 14 },
    { label: 'I', category: 'NORMAL', seats: 14 },
  ],
});

const THEATRES = [
  { name: 'PVR Phoenix Palladium', city: 'Mumbai', address: 'Lower Parel, Mumbai', screens: [standardScreen('Audi 1'), standardScreen('Audi 2')] },
  { name: 'INOX R-City', city: 'Mumbai', address: 'Ghatkopar West, Mumbai', screens: [standardScreen('Screen 1')] },
  { name: 'Cinepolis Seasons Mall', city: 'Pune', address: 'Magarpatta, Pune', screens: [standardScreen('Audi 1'), standardScreen('Audi 2')] },
  { name: 'PVR Pavillion', city: 'Pune', address: 'Senapati Bapat Road, Pune', screens: [standardScreen('Screen 1')] },
  { name: 'PVR Orion Mall', city: 'Bengaluru', address: 'Rajajinagar, Bengaluru', screens: [standardScreen('Audi 1'), standardScreen('Audi 2')] },
  { name: 'INOX Garuda Mall', city: 'Bengaluru', address: 'Magrath Road, Bengaluru', screens: [standardScreen('Screen 1')] },
];

// Used only when TMDB_READ_TOKEN isn't set, so the app still has something to show.
const FALLBACK_MOVIES = [
  { title: 'Demo Movie One', genres: ['Action'], language: 'Hindi', runtime: 150, rating: 7.8 },
  { title: 'Demo Movie Two', genres: ['Comedy', 'Drama'], language: 'English', runtime: 120, rating: 7.1 },
  { title: 'Demo Movie Three', genres: ['Thriller'], language: 'Telugu', runtime: 165, rating: 8.2 },
].map((m) => ({ ...m, releaseDate: new Date(), overview: 'Add TMDB_READ_TOKEN and re-run the seed for real movies.' }));

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('- ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin user');
    return;
  }
  let admin = await User.findOne({ email });
  if (!admin) admin = new User({ name: 'Admin', email, password });
  admin.role = 'admin';
  admin.password = password;
  await admin.save();
  console.log(`- admin user ready: ${email}`);
}

async function seedMovies() {
  if (!env.tmdbToken) {
    console.log('- TMDB_READ_TOKEN not set, using demo movies');
    return Movie.insertMany(FALLBACK_MOVIES);
  }

  const [nowPlaying, upcoming] = await Promise.all([
    tmdb.listMovieIds('now_playing', 10),
    tmdb.listMovieIds('upcoming', 6),
  ]);
  const ids = [...new Set([...nowPlaying, ...upcoming])];

  const movies = [];
  for (const id of ids) {
    try {
      movies.push(await tmdb.getMovieDetails(id));
    } catch (err) {
      console.log(`  skipped TMDB movie ${id}: ${err.message}`);
    }
  }
  console.log(`- imported ${movies.length} movies from TMDB`);
  return Movie.insertMany(movies);
}

await connectDB();
console.log('Seeding...');

// Bookings go too: a booking whose show no longer exists would break My Bookings.
await Promise.all([Movie.deleteMany(), Theatre.deleteMany(), Show.deleteMany(), SeatLock.deleteMany(), Booking.deleteMany()]);
await seedAdmin();
const theatres = await Theatre.insertMany(THEATRES);
console.log(`- created ${theatres.length} theatres`);
await seedMovies();
console.log(`- created ${await ensureUpcomingShows()} shows over the next ${DAYS_AHEAD} days`);

console.log('Done.');
await mongoose.connection.close();
