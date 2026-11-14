import crypto from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

export const RZP = {
  keyId: 'rzp_test_fakekey',
  keySecret: 'fake_key_secret_for_tests',
  webhookSecret: 'fake_webhook_secret_for_tests',
};

// Minimal stand-in for Razorpay's REST API: records every call so tests can assert on them.
async function startFakeRazorpay() {
  const calls = [];
  let n = 0;
  const expectedAuth = 'Basic ' + Buffer.from(`${RZP.keyId}:${RZP.keySecret}`).toString('base64');

  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const json = body ? JSON.parse(body) : {};
    const okAuth = req.headers.authorization === expectedAuth;
    calls.push({ method: req.method, url: req.url, body: json, okAuth });

    res.setHeader('Content-Type', 'application/json');
    if (!okAuth) return res.writeHead(401).end(JSON.stringify({ error: { description: 'bad auth' } }));
    if (req.url === '/v1/orders') {
      return res.end(JSON.stringify({ id: `order_fake${++n}`, amount: json.amount, currency: json.currency, receipt: json.receipt }));
    }
    const refund = /^\/v1\/payments\/(.+)\/refund$/.exec(req.url);
    if (refund) return res.end(JSON.stringify({ id: `rfnd_fake${++n}`, payment_id: refund[1], amount: json.amount }));
    res.writeHead(404).end('{}');
  });

  server.listen(0);
  await once(server, 'listening');
  return { url: `http://127.0.0.1:${server.address().port}/v1`, calls, close: () => server.close() };
}

// Boots the real Express app against a throwaway replica set (transactions need one).
// Env vars are set before the app is imported, because config/env.js reads them on import.
export async function startTestServer() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const razorpay = await startFakeRazorpay();

  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: replSet.getUri('cinebook-test'),
    JWT_SECRET: 'test-jwt-secret-that-is-long-enough-123456',
    CLIENT_URL: 'http://localhost:5173',
    TMDB_READ_TOKEN: '',
    RAZORPAY_KEY_ID: RZP.keyId,
    RAZORPAY_KEY_SECRET: RZP.keySecret,
    RAZORPAY_WEBHOOK_SECRET: RZP.webhookSecret,
    RAZORPAY_API_URL: razorpay.url,
  });

  const { default: mongoose } = await import('mongoose');
  const { connectDB } = await import('../src/config/db.js');
  const { default: app } = await import('../src/app.js');
  await connectDB();

  const server = app.listen(0);
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;

  return {
    origin,
    api: makeApi(`${origin}/api`),
    razorpay,
    async stop() {
      server.close();
      razorpay.close();
      await mongoose.disconnect();
      await replSet.stop();
    },
  };
}

function makeApi(base) {
  async function request(method, path, { body, cookie, headers = {}, raw } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...headers },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const setCookie = res.headers.get('set-cookie');
    return {
      status: res.status,
      json: await res.json().catch(() => null),
      cookie: setCookie?.split(';')[0],
      setCookie,
    };
  }

  let userCount = 0;
  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    put: (path, body, opts) => request('PUT', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
    delete: (path, opts) => request('DELETE', path, opts),
    raw: request,

    // Signs up a fresh user and returns their auth cookie.
    async newUser(name = 'Test User') {
      const email = `user${++userCount}.${Date.now()}@test.dev`;
      const res = await request('POST', '/auth/register', { body: { name, email, password: 'password123' } });
      if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.json)}`);
      return res.cookie;
    },
  };
}

// Creates an admin directly in the DB (signup can never grant admin) and logs in.
export async function adminCookie(api) {
  const { User } = await import('../src/models/User.js');
  const email = `admin.${Date.now()}@test.dev`;
  await User.create({ name: 'Admin', email, password: 'Admin@12345', role: 'admin' });
  return (await api.post('/auth/login', { email, password: 'Admin@12345' })).cookie;
}

export const signPayment = (orderId, paymentId) =>
  crypto.createHmac('sha256', RZP.keySecret).update(`${orderId}|${paymentId}`).digest('hex');

export function webhookRequest(api, payload, secret = RZP.webhookSecret) {
  const raw = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return api.raw('POST', '/payments/webhook', { raw, headers: { 'X-Razorpay-Signature': signature } });
}

export const capturedEvent = (orderId, paymentId) => ({
  event: 'payment.captured',
  payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
});
