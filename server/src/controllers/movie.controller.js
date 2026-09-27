import { Movie } from '../models/Movie.js';
import { Show } from '../models/Show.js';
import * as tmdb from '../services/tmdb.service.js';
import { AppError } from '../utils/AppError.js';
import { istDayRange } from '../utils/time.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/movies?status=now_showing|upcoming&search=&genre=&language=&page=&limit=
export async function listMovies(req, res) {
  const { status, search, genre, language } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const filter = { isActive: true };
  if (status === 'now_showing') filter.releaseDate = { $lte: new Date() };
  if (status === 'upcoming') filter.releaseDate = { $gt: new Date() };
  if (search) filter.title = { $regex: escapeRegex(String(search)), $options: 'i' };
  if (genre) filter.genres = String(genre);
  if (language) filter.language = String(language);

  const [movies, total] = await Promise.all([
    Movie.find(filter)
      .select('-cast')
      .sort({ releaseDate: status === 'upcoming' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Movie.countDocuments(filter),
  ]);

  res.json({ success: true, movies, page, totalPages: Math.ceil(total / limit), total });
}

// GET /api/movies/filters -> genres and languages that actually exist, for filter chips
export async function getFilters(req, res) {
  const [genres, languages] = await Promise.all([
    Movie.distinct('genres', { isActive: true }),
    Movie.distinct('language', { isActive: true }),
  ]);
  res.json({ success: true, genres: genres.sort(), languages: languages.sort() });
}

export async function getMovie(req, res) {
  const movie = await Movie.findById(req.params.id).lean();
  if (!movie) throw new AppError('Movie not found', 404);
  res.json({ success: true, movie });
}

// GET /api/movies/:id/shows?city=Pune&date=2026-09-27
// Returns the day's shows grouped by theatre, the way the booking page shows them.
export async function getMovieShows(req, res) {
  const { city, date } = req.query;
  if (!city || !date) throw new AppError('city and date are required', 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('date must be YYYY-MM-DD', 400);

  const { start, end } = istDayRange(date);
  const from = start > new Date() ? start : new Date(); // never list shows that already started

  const shows = await Show.find({
    movie: req.params.id,
    city: String(city),
    startTime: { $gte: from, $lt: end },
  })
    .select('theatre screenName startTime format language prices layout bookedSeats')
    .populate('theatre', 'name address')
    .sort({ startTime: 1 })
    .lean();

  const byTheatre = new Map();
  for (const show of shows) {
    const id = show.theatre._id.toString();
    if (!byTheatre.has(id)) byTheatre.set(id, { theatre: show.theatre, shows: [] });

    const totalSeats = show.layout.reduce((sum, row) => sum + row.seats, 0);
    byTheatre.get(id).shows.push({
      _id: show._id,
      startTime: show.startTime,
      format: show.format,
      language: show.language,
      screenName: show.screenName,
      minPrice: Math.min(...Object.values(show.prices).filter((p) => p != null)),
      availability: 1 - show.bookedSeats.length / totalSeats, // for green/orange/red dots
    });
  }

  res.json({ success: true, theatres: [...byTheatre.values()] });
}

// ---- admin ----

export async function searchTmdb(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q) throw new AppError('q is required', 400);
  res.json({ success: true, results: await tmdb.searchMovies(q) });
}

// POST /api/movies/import/:tmdbId -> create or refresh a movie from TMDB
export async function importFromTmdb(req, res) {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) throw new AppError('Invalid TMDB id', 400);

  const data = await tmdb.getMovieDetails(tmdbId);
  const movie = await Movie.findOneAndUpdate({ tmdbId }, data, {
    upsert: true,
    returnDocument: 'after',
    runValidators: true,
  });
  res.status(201).json({ success: true, movie });
}

export async function updateMovie(req, res) {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
  if (!movie) throw new AppError('Movie not found', 404);
  res.json({ success: true, movie });
}
