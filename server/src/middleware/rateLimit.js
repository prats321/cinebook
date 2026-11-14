import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const message = { success: false, message: 'Too many requests, please try again later' };
// The test suite signs up dozens of users from one IP; limits would make it flaky.
const skip = () => env.nodeEnv === 'test';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message,
  skip,
});

// Login/register get a much tighter limit to slow down password guessing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message,
  skip,
});
