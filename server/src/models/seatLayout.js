import mongoose from 'mongoose';

export const SEAT_CATEGORIES = ['RECLINER', 'PREMIUM', 'NORMAL'];

// One row of seats in a screen, e.g. { label: 'A', category: 'RECLINER', seats: 10 }
// gives seats A1..A10. Used by Theatre screens and copied into each Show.
export const rowSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, uppercase: true, match: /^[A-Z]{1,2}$/ },
    category: { type: String, enum: SEAT_CATEGORIES, required: true },
    seats: { type: Number, required: true, min: 1, max: 40 },
  },
  { _id: false },
);

// "C12" -> { row: 'C', number: 12 }
export function parseSeatId(seatId) {
  const match = /^([A-Z]{1,2})(\d{1,2})$/.exec(seatId);
  if (!match) return null;
  return { row: match[1], number: Number(match[2]) };
}

// Returns the seat's category if it exists in this layout, otherwise null.
export function seatCategory(layout, seatId) {
  const parsed = parseSeatId(seatId);
  if (!parsed) return null;
  const row = layout.find((r) => r.label === parsed.row);
  if (!row || parsed.number < 1 || parsed.number > row.seats) return null;
  return row.category;
}
