import mongoose from 'mongoose';
import { rowSchema } from './seatLayout.js';

const { ObjectId } = mongoose.Schema.Types;

const showSchema = new mongoose.Schema(
  {
    movie: { type: ObjectId, ref: 'Movie', required: true },
    theatre: { type: ObjectId, ref: 'Theatre', required: true },
    screenId: { type: ObjectId, required: true },
    screenName: String,
    city: { type: String, required: true }, // copied from theatre so "shows in Pune" is one indexed query
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    format: { type: String, enum: ['2D', '3D', 'IMAX'], default: '2D' },
    language: String,
    prices: {
      RECLINER: { type: Number, min: 0 },
      PREMIUM: { type: Number, min: 0 },
      NORMAL: { type: Number, min: 0 },
    },
    // Snapshot of the screen layout when the show was created, so editing a
    // theatre later can't break seats that were already sold for this show.
    layout: [rowSchema],
    bookedSeats: { type: [String], default: [] },
  },
  { timestamps: true },
);

showSchema.index({ movie: 1, city: 1, startTime: 1 });
showSchema.index({ screenId: 1, startTime: 1 });

export const Show = mongoose.model('Show', showSchema);
