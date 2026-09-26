import rateLimit from 'express-rate-limit';

const message = { success: false, message: 'Too many requests, please try again later' };

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message,
});

// Login/register get a much tighter limit to slow down password guessing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message,
});
