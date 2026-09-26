import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// One document per seat a user is holding while they pay.
//
// The unique (show, seat) index is what stops double booking: if two users
// try to lock A5 at the same moment, MongoDB accepts exactly one insert and
// rejects the other with a duplicate-key error. No race condition in app code.
const seatLockSchema = new mongoose.Schema({
  show: { type: ObjectId, ref: 'Show', required: true },
  seat: { type: String, required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
});

seatLockSchema.index({ show: 1, seat: 1 }, { unique: true });
// TTL index: MongoDB deletes the lock automatically after expiresAt.
// (The TTL monitor runs about once a minute, so code also checks expiresAt.)
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SeatLock = mongoose.model('SeatLock', seatLockSchema);
