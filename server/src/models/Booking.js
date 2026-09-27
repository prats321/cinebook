import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SEAT_CATEGORIES } from './seatLayout.js';

const { ObjectId } = mongoose.Schema.Types;

export const BOOKING_STATUS = ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'];

// No 0/O or 1/I, so codes are easy to read out at the counter.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateBookingCode() {
  let code = 'CB';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

const itemSchema = new mongoose.Schema(
  {
    seat: { type: String, required: true },
    category: { type: String, enum: SEAT_CATEGORIES, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    show: { type: ObjectId, ref: 'Show', required: true },
    seats: { type: [String], required: true },
    // Price per seat at checkout time, so later price changes never alter a past booking.
    items: [itemSchema],
    amount: { type: Number, required: true, min: 0 }, // rupees
    status: { type: String, enum: BOOKING_STATUS, default: 'PENDING' },
    bookingCode: { type: String, required: true, unique: true },
    payment: {
      orderId: String,
      paymentId: String,
      refundId: String,
    },
    failureReason: String,
    confirmedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

bookingSchema.index({ 'payment.orderId': 1 }, { unique: true, sparse: true });
bookingSchema.index({ user: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
