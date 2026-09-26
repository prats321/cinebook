import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

function readToken(req) {
  return req.cookies?.token || req.headers.authorization?.replace(/^Bearer /, '');
}

async function userFromToken(token) {
  try {
    const { id } = jwt.verify(token, env.jwtSecret);
    return await User.findById(id);
  } catch {
    return null;
  }
}

// Route requires a logged-in user.
export async function protect(req, res, next) {
  const token = readToken(req);
  if (!token) throw new AppError('Please log in to continue', 401);

  const user = await userFromToken(token);
  if (!user) throw new AppError('Session expired, please log in again', 401);

  req.user = user;
  next();
}

// Route works for guests too, but knows who you are if you're logged in.
export async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) req.user = await userFromToken(token);
  next();
}

// Use after protect: authorize('admin')
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError('You do not have permission to do this', 403);
  }
  next();
};
