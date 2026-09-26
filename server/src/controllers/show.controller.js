import { Show } from '../models/Show.js';
import { Movie } from '../models/Movie.js';
import { Theatre } from '../models/Theatre.js';
import { SeatLock } from '../models/SeatLock.js';
import * as seatLock from '../services/seatLock.service.js';
import { AppError } from '../utils/AppError.js';

// Cleaning + ads between two shows on the same screen.
const BUFFER_MINUTES = 20;

async function findShow(id) {
  const show = await Show.findById(id);
  if (!show) throw new AppError('Show not found', 404);
  return show;
}

export async function getShow(req, res) {
  const show = await Show.findById(req.params.id)
    .select('-bookedSeats -layout')
    .populate('movie', 'title posterUrl runtime genres language rating')
    .populate('theatre', 'name address city')
    .lean();
  if (!show) throw new AppError('Show not found', 404);
  res.json({ success: true, show });
}

export async function getSeats(req, res) {
  const show = await findShow(req.params.id);
  const status = await seatLock.getSeatStatus(show, req.user?._id);
  res.json({ success: true, ...status });
}

export async function lockSeats(req, res) {
  const show = await findShow(req.params.id);
  const lock = await seatLock.lockSeats(show, req.body.seats, req.user._id);
  res.json({ success: true, ...lock });
}

export async function releaseSeats(req, res) {
  await seatLock.releaseSeats(req.params.id, req.user._id);
  res.json({ success: true });
}

// ---- admin ----

export async function createShow(req, res) {
  const { movieId, theatreId, screenId, startTime, format, language, prices } = req.body;

  const [movie, theatre] = await Promise.all([Movie.findById(movieId), Theatre.findById(theatreId)]);
  if (!movie) throw new AppError('Movie not found', 404);
  if (!theatre) throw new AppError('Theatre not found', 404);

  const screen = theatre.screens.id(screenId);
  if (!screen) throw new AppError('Screen not found in this theatre', 404);
  if (startTime <= new Date()) throw new AppError('Show must start in the future', 400);

  const categories = [...new Set(screen.rows.map((r) => r.category))];
  const missing = categories.filter((c) => prices[c] == null);
  if (missing.length) throw new AppError(`Price missing for: ${missing.join(', ')}`, 400);

  const endTime = new Date(startTime.getTime() + movie.runtime * 60_000);

  // Two shows overlap on a screen if one starts before the other ends (+ buffer).
  const buffer = BUFFER_MINUTES * 60_000;
  const clash = await Show.findOne({
    screenId,
    startTime: { $lt: new Date(endTime.getTime() + buffer) },
    endTime: { $gt: new Date(startTime.getTime() - buffer) },
  }).populate('movie', 'title');
  if (clash) {
    throw new AppError(
      `Screen is busy: "${clash.movie?.title}" runs ${clash.startTime.toISOString()} - ${clash.endTime.toISOString()}`,
      409,
    );
  }

  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    screenId: screen._id,
    screenName: screen.name,
    city: theatre.city,
    startTime,
    endTime,
    format,
    language: language || movie.language,
    prices,
    layout: screen.rows,
  });
  res.status(201).json({ success: true, show });
}

export async function deleteShow(req, res) {
  const show = await findShow(req.params.id);
  if (show.bookedSeats.length) {
    throw new AppError('Tickets have been sold for this show, it cannot be deleted', 409);
  }
  await Promise.all([show.deleteOne(), SeatLock.deleteMany({ show: show._id })]);
  res.json({ success: true });
}
