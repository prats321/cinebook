const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key} (see .env.example)`);
    process.exit(1);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  tmdbToken: process.env.TMDB_READ_TOKEN,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  // Overridable so tests can point at a local stub instead of the real API.
  razorpayApiUrl: process.env.RAZORPAY_API_URL || 'https://api.razorpay.com/v1',
  seatLockMinutes: Number(process.env.SEAT_LOCK_MINUTES) || 5,
};

export const isProd = env.nodeEnv === 'production';
