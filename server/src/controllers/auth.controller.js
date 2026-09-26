import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env, isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const TOKEN_TTL_DAYS = 7;

// httpOnly: JavaScript in the browser can't read the token, so an XSS bug can't steal it.
// sameSite 'none' + secure in production because the frontend (Vercel) and API (Render)
// live on different domains.
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

function sendAuth(res, user, status = 200) {
  const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: `${TOKEN_TTL_DAYS}d` });
  res.cookie('token', token, cookieOptions).status(status).json({ success: true, user });
}

export async function register(req, res) {
  // validate() already stripped unknown fields, so nobody can sign up with role: 'admin'
  const user = await User.create(req.body);
  sendAuth(res, user, 201);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Same message for "no such email" and "wrong password" so attackers can't probe emails.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  sendAuth(res, user);
}

export function logout(req, res) {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie('token', clearOptions).json({ success: true });
}

export function me(req, res) {
  res.json({ success: true, user: req.user });
}

export async function updateMe(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ success: true, user: req.user });
}
