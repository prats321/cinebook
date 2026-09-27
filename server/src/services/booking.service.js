import mongoose from 'mongoose';
import { Booking, generateBookingCode } from '../models/Booking.js';
import { Show } from '../models/Show.js';
import { SeatLock } from '../models/SeatLock.js';
import { seatCategory } from '../models/seatLayout.js';
import * as razorpay from './razorpay.service.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Step 1: turn the user's seat hold into a PENDING booking plus a Razorpay order.
// The price is computed here from the show's prices, never taken from the client.
export async function startCheckout(showId, user) {
  const show = await Show.findById(showId).populate('movie', 'title');
  if (!show) throw new AppError('Show not found', 404);
  if (show.startTime <= new Date()) throw new AppError('This show has already started', 400);

  const locks = await SeatLock.find({ show: show._id, user: user._id, expiresAt: { $gt: new Date() } }).lean();
  if (!locks.length) throw new AppError('Your seat hold has expired. Please select your seats again.', 409);

  const seats = locks.map((l) => l.seat).sort();
  const items = seats.map((seat) => {
    const category = seatCategory(show.layout, seat);
    return { seat, category, price: show.prices[category] };
  });
  const amount = items.reduce((sum, i) => sum + i.price, 0);

  const booking = new Booking({ user: user._id, show: show._id, seats, items, amount, bookingCode: generateBookingCode() });
  const order = await razorpay.createOrder({
    amount,
    receipt: booking.bookingCode,
    notes: { bookingId: booking.id, showId: show.id },
  });
  booking.payment = { orderId: order.id };
  await booking.save();

  return {
    booking,
    order: { id: order.id, amount: order.amount, currency: order.currency },
    keyId: env.razorpayKeyId,
    description: `${show.movie.title} · ${seats.join(', ')}`,
  };
}

// Step 2: payment succeeded. Called from both the browser's verify call and the
// Razorpay webhook, so it must be idempotent: whichever arrives second is a no-op.
//
// A MongoDB transaction makes "mark seats sold" and "mark booking confirmed" happen
// together or not at all. The seats update only matches if none of the seats are
// already sold, which is what guarantees no double booking, even if this user's
// hold expired while they were on the payment screen.
export async function confirmPayment(orderId, paymentId) {
  let booking;
  let seatsTaken = false;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      seatsTaken = false;
      booking = await Booking.findOne({ 'payment.orderId': orderId }).session(session);
      if (!booking) throw new AppError('No booking found for this payment', 404);
      if (booking.status !== 'PENDING') return; // already handled

      const result = await Show.updateOne(
        { _id: booking.show, bookedSeats: { $nin: booking.seats } },
        { $push: { bookedSeats: { $each: booking.seats } } },
        { session },
      );

      booking.payment.paymentId = paymentId;
      if (result.modifiedCount === 0) {
        seatsTaken = true;
        booking.status = 'FAILED';
        booking.failureReason = 'The seats were sold to someone else before your payment completed';
      } else {
        booking.status = 'CONFIRMED';
        booking.confirmedAt = new Date();
        await SeatLock.deleteMany({ show: booking.show, seat: { $in: booking.seats } }, { session });
      }
      await booking.save({ session });
    });
  } finally {
    await session.endSession();
  }

  // The user was charged but gets no seats: give the money back.
  if (seatsTaken) await refund(booking);
  return booking;
}

export async function refund(booking) {
  if (!booking.payment?.paymentId || booking.payment.refundId) return;
  try {
    const r = await razorpay.refundPayment(booking.payment.paymentId, booking.amount);
    booking.payment.refundId = r.id;
    await booking.save();
  } catch (err) {
    // Don't lose the booking state over a refund hiccup; it can be retried from the dashboard.
    console.error(`Refund failed for booking ${booking.bookingCode}:`, err.message);
  }
}
