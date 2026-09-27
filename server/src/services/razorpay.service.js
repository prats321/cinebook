import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Thin wrapper over Razorpay's REST API. Plain fetch + Basic auth instead of the SDK:
// it's only two endpoints, and it lets tests swap in a local stub via RAZORPAY_API_URL.

function authHeader() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError('Payments are not configured on the server', 503);
  }
  return 'Basic ' + Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
}

async function request(method, path, body) {
  const res = await fetch(env.razorpayApiUrl + path, {
    method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Razorpay ${method} ${path} failed (${res.status}):`, data.error);
    throw new AppError(data.error?.description || 'Payment provider error', 502);
  }
  return data;
}

// Amounts in our app are rupees; Razorpay works in paise.
export function createOrder({ amount, receipt, notes }) {
  return request('POST', '/orders', { amount: amount * 100, currency: 'INR', receipt, notes });
}

export function refundPayment(paymentId, amount) {
  return request('POST', `/payments/${paymentId}/refund`, { amount: amount * 100 });
}

function hmacHex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Constant-time compare so an attacker can't guess a signature byte by byte from response timing.
function safeEqual(expected, received) {
  const a = Buffer.from(expected);
  const b = Buffer.from(String(received ?? ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Checkout returns order_id, payment_id and a signature. Only someone holding our key
// secret can produce HMAC(order_id|payment_id), so a valid signature proves the
// payment really happened and wasn't faked by the browser.
export function isValidPaymentSignature({ orderId, paymentId, signature }) {
  if (!env.razorpayKeySecret) return false;
  return safeEqual(hmacHex(env.razorpayKeySecret, `${orderId}|${paymentId}`), signature);
}

// Webhooks are signed over the exact raw request body with the webhook secret.
export function isValidWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) return false;
  return safeEqual(hmacHex(env.razorpayWebhookSecret, rawBody), signature);
}
