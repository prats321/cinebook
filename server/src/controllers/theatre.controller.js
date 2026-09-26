import { Theatre } from '../models/Theatre.js';
import { Show } from '../models/Show.js';
import { AppError } from '../utils/AppError.js';

export async function listCities(req, res) {
  const cities = await Theatre.distinct('city');
  res.json({ success: true, cities: cities.sort() });
}

export async function listTheatres(req, res) {
  const filter = req.query.city ? { city: String(req.query.city) } : {};
  const theatres = await Theatre.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, theatres });
}

export async function getTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id).lean();
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true, theatre });
}

export async function createTheatre(req, res) {
  const theatre = await Theatre.create(req.body);
  res.status(201).json({ success: true, theatre });
}

// Existing shows keep their own layout snapshot, so editing screens here is safe.
export async function updateTheatre(req, res) {
  const theatre = await Theatre.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true, theatre });
}

export async function deleteTheatre(req, res) {
  const upcoming = await Show.exists({ theatre: req.params.id, startTime: { $gt: new Date() } });
  if (upcoming) throw new AppError('This theatre has upcoming shows. Delete them first.', 409);

  const theatre = await Theatre.findByIdAndDelete(req.params.id);
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true });
}
