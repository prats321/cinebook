import mongoose from 'mongoose';
import { rowSchema } from './seatLayout.js';

const screenSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rows: {
    type: [rowSchema],
    validate: { validator: (rows) => rows.length > 0, message: 'A screen needs at least one row' },
  },
});

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    screens: [screenSchema],
  },
  { timestamps: true },
);

export const Theatre = mongoose.model('Theatre', theatreSchema);
