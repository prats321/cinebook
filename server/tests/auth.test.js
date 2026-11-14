import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminCookie, startTestServer } from './helpers.js';

let ctx;
let api;
before(async () => {
  ctx = await startTestServer();
  api = ctx.api;
});
after(() => ctx.stop());

describe('auth', () => {
  it('registers a user with an httpOnly cookie and hides the password', async () => {
    const res = await api.post('/auth/register', { name: 'Asha', email: '  Asha@Example.COM ', password: 'password123' });
    assert.equal(res.status, 201);
    assert.equal(res.json.user.email, 'asha@example.com', 'email is trimmed and lower-cased');
    assert.equal('password' in res.json.user, false);
    assert.match(res.setCookie, /HttpOnly/i);
    assert.match(res.setCookie, /SameSite=Lax/i);
  });

  it('ignores a role sent at signup (no self-promotion to admin)', async () => {
    const res = await api.post('/auth/register', { name: 'Mallory', email: 'mallory@example.com', password: 'password123', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.json.user.role, 'user');
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await api.post('/auth/register', { name: 'Asha', email: 'asha@example.com', password: 'password123' });
    assert.equal(res.status, 409);
  });

  it('returns per-field validation errors', async () => {
    const res = await api.post('/auth/register', { name: 'A', email: 'not-an-email', password: 'short' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.json.details.map((d) => d.field).sort(), ['email', 'name', 'password']);
  });

  it('uses the same message for a wrong password and an unknown email', async () => {
    const wrong = await api.post('/auth/login', { email: 'asha@example.com', password: 'wrongpass' });
    const unknown = await api.post('/auth/login', { email: 'nobody@example.com', password: 'whatever1' });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.json.message, unknown.json.message, 'no user enumeration');
  });

  it('logs in and reads the session back', async () => {
    const login = await api.post('/auth/login', { email: 'asha@example.com', password: 'password123' });
    assert.equal(login.status, 200);
    const me = await api.get('/auth/me', { cookie: login.cookie });
    assert.equal(me.json.user.email, 'asha@example.com');
  });

  it('rejects requests without a valid session', async () => {
    assert.equal((await api.get('/auth/me')).status, 401);
    assert.equal((await api.get('/auth/me', { cookie: 'token=forged.jwt.value' })).status, 401);
  });

  it('logout clears the cookie', async () => {
    const res = await api.post('/auth/logout');
    assert.equal(res.cookie, 'token=');
  });

  it('keeps admin routes admin-only', async () => {
    const user = await api.newUser();
    const body = { name: 'X', city: 'Delhi', screens: [{ name: 'S1', rows: [{ label: 'A', category: 'NORMAL', seats: 5 }] }] };
    assert.equal((await api.post('/theatres', body, { cookie: user })).status, 403);
    assert.equal((await api.post('/theatres', body)).status, 401);
    assert.equal((await api.post('/theatres', body, { cookie: await adminCookie(api) })).status, 201);
  });
});

describe('error handling', () => {
  it('returns JSON 404 for unknown routes and 400 for malformed ids', async () => {
    assert.equal((await api.get('/nope')).status, 404);
    assert.equal((await api.get('/movies/not-an-id')).status, 400);
  });

  it('answers health checks on /api/health and on the bare root URL', async () => {
    assert.equal((await api.get('/health')).status, 200);
    const root = await fetch(`${ctx.origin}/`);
    assert.equal(root.status, 200, 'uptime monitors often ping "/"');
  });
});
