import { SeatLock } from '../models/SeatLock.js';
import { seatCategory } from '../models/seatLayout.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const MAX_SEATS_PER_BOOKING = 10;

function isDuplicateKeyError(err) {
  return err.code === 11000 || err.writeErrors?.some((e) => e.code === 11000);
}

// Hold `seats` for `userId` for SEAT_LOCK_MINUTES. Either every seat is locked or none is.
export async function lockSeats(show, seats, userId) {
  const invalid = seats.filter((s) => !seatCategory(show.layout, s));
  if (invalid.length) throw new AppError(`Invalid seats: ${invalid.join(', ')}`, 400);

  if (show.startTime <= new Date()) throw new AppError('This show has already started', 400);

  const booked = seats.filter((s) => show.bookedSeats.includes(s));
  if (booked.length) throw new AppError(`Already booked: ${booked.join(', ')}`, 409);

  const now = new Date();
  // Drop expired locks (TTL cleanup can lag ~60s) and this user's previous selection.
  await SeatLock.deleteMany({
    show: show._id,
    $or: [{ expiresAt: { $lte: now } }, { user: userId }],
  });

  const expiresAt = new Date(now.getTime() + env.seatLockMinutes * 60_000);
  try {
    await SeatLock.insertMany(
      seats.map((seat) => ({ show: show._id, seat, user: userId, expiresAt })),
      { ordered: false },
    );
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // Someone else got at least one of these seats first: release the ones we did get.
    await SeatLock.deleteMany({ show: show._id, user: userId });
    throw new AppError('Some of these seats were just taken. Please pick different seats.', 409);
  }

  return { seats, expiresAt };
}

export async function releaseSeats(showId, userId) {
  await SeatLock.deleteMany({ show: showId, user: userId });
}

// Seat map for the booking page: which seats are booked, held by others, or held by you.
export async function getSeatStatus(show, userId) {
  const locks = await SeatLock.find({ show: show._id, expiresAt: { $gt: new Date() } }).lean();

  const lockedByOthers = [];
  const mine = [];
  for (const lock of locks) {
    if (userId && lock.user.equals(userId)) mine.push(lock.seat);
    else lockedByOthers.push(lock.seat);
  }

  return {
    layout: show.layout,
    prices: show.prices,
    booked: show.bookedSeats,
    locked: lockedByOthers,
    mine,
    myLockExpiresAt: mine.length ? locks.find((l) => mine.includes(l.seat)).expiresAt : null,
  };
}
