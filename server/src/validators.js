import { z } from 'zod';
import { SEAT_CATEGORIES } from './models/seatLayout.js';
import { MAX_SEATS_PER_BOOKING } from './services/seatLock.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email'));

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(50),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  city: z.string().trim().max(50).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  city: z.string().trim().max(50).optional(),
});

const rowSchema = z.object({
  label: z.string().trim().toUpperCase().regex(/^[A-Z]{1,2}$/, 'Row label must be 1-2 letters'),
  category: z.enum(SEAT_CATEGORIES),
  seats: z.number().int().min(1).max(40),
});

const screenSchema = z.object({
  name: z.string().trim().min(1),
  rows: z
    .array(rowSchema)
    .min(1)
    .refine((rows) => new Set(rows.map((r) => r.label)).size === rows.length, 'Row labels must be unique'),
});

export const theatreSchema = z.object({
  name: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().optional(),
  screens: z.array(screenSchema).min(1),
});

export const showSchema = z.object({
  movieId: objectId,
  theatreId: objectId,
  screenId: objectId,
  startTime: z.coerce.date(),
  format: z.enum(['2D', '3D', 'IMAX']).default('2D'),
  language: z.string().trim().optional(),
  prices: z.partialRecord(z.enum(SEAT_CATEGORIES), z.number().min(0)),
});

export const lockSeatsSchema = z.object({
  seats: z
    .array(z.string().trim().toUpperCase())
    .min(1, 'Select at least one seat')
    .max(MAX_SEATS_PER_BOOKING, `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time`)
    .refine((seats) => new Set(seats).size === seats.length, 'Duplicate seats'),
});

export const updateMovieSchema = z.object({
  isActive: z.boolean().optional(),
  runtime: z.number().int().min(1).max(400).optional(),
});
