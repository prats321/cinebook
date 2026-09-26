import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  await mongoose.connect(env.mongoUri);
  // Wait for indexes to exist before serving traffic: seat locking depends on
  // the unique (show, seat) index being in place.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
