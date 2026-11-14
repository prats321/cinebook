import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminCookie, startTestServer } from './helpers.js';
import { createMovie, createShow, createTheatre, PRICES } from './fixtures.js';

let ctx;
let api;
let showId;
let alice;
let bob;
before(async () => {
  ctx = await startTestServer();
  api = ctx.api;
  alice = await api.newUser('Alice');
  bob = await api.newUser('Bob');
});
beforeEach(async () => {
  ({ id: showId } = await createShow());
});
after(() => ctx.stop());

const lock = (cookie, seats, id = showId) => api.post(`/shows/${id}/lock`, { seats }, { cookie });
const seatsFor = async (cookie, id = showId) => (await api.get(`/shows/${id}/seats`, { cookie })).json;

describe('seat holds', () => {
  it('shows guests the seat map but requires login to hold seats', async () => {
    const map = await seatsFor();
    assert.equal(map.layout.length, 3);
    assert.deepEqual(map.prices, PRICES);
    assert.equal((await api.post(`/shows/${showId}/lock`, { seats: ['A1'] })).status, 401);
  });

  it('lets exactly one of two simultaneous requests win an overlapping seat', async () => {
    const [a, b] = await Promise.all([lock(alice, ['C5', 'C6']), lock(bob, ['C6', 'C7'])]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);

    const winner = a.status === 200 ? alice : bob;
    const loser = winner === alice ? bob : alice;
    const winnerSeats = winner === alice ? ['C5', 'C6'] : ['C6', 'C7'];

    assert.deepEqual((await seatsFor(winner)).mine.sort(), winnerSeats);
    const loserView = await seatsFor(loser);
    assert.deepEqual(loserView.mine, [], 'the loser holds nothing: all-or-nothing');
    assert.deepEqual(loserView.locked.sort(), winnerSeats);
  });

  it('replaces a previous hold when the same user picks again', async () => {
    await lock(alice, ['A1', 'A2']);
    await lock(alice, ['F1']);
    assert.deepEqual((await seatsFor(alice)).mine, ['F1']);
    assert.equal((await lock(bob, ['A1'])).status, 200, 'the old seats are free again');
  });

  it('releases a hold on request', async () => {
    await lock(alice, ['A3']);
    assert.equal((await api.delete(`/shows/${showId}/lock`, { cookie: alice })).status, 200);
    assert.deepEqual((await seatsFor(alice)).mine, []);
  });

  it('ignores holds that have expired even before the TTL job removes them', async () => {
    const { SeatLock } = await import('../src/models/SeatLock.js');
    const { User } = await import('../src/models/User.js');
    const someone = await User.findOne();
    await SeatLock.create({ show: showId, seat: 'A8', user: someone._id, expiresAt: new Date(Date.now() - 1000) });
    assert.ok(!(await seatsFor(bob)).locked.includes('A8'));
    assert.equal((await lock(bob, ['A8'])).status, 200);
  });

  it('validates seat ids, limits and duplicates', async () => {
    assert.equal((await lock(alice, ['Z99'])).status, 400, 'row does not exist');
    assert.equal((await lock(alice, ['A9'])).status, 400, 'row A only has 8 seats');
    assert.equal((await lock(alice, Array.from({ length: 11 }, (_, i) => `F${i + 1}`))).status, 400, 'max 10 seats');
    assert.equal((await lock(alice, ['F1', 'f1'])).status, 400, 'duplicates after upper-casing');
    assert.equal((await lock(alice, [])).status, 400);
  });

  it('refuses sold seats and shows that already started', async () => {
    const { Show } = await import('../src/models/Show.js');
    await Show.updateOne({ _id: showId }, { $push: { bookedSeats: 'C1' } });
    assert.equal((await lock(alice, ['C1'])).status, 409);

    const { id: pastShow } = await createShow({ hoursFromNow: -1 });
    assert.equal((await lock(alice, ['A1'], pastShow)).status, 400);
  });
});

describe('show scheduling (admin)', () => {
  it('rejects overlapping shows on a screen and missing category prices', async () => {
    const admin = await adminCookie(api);
    const movie = await createMovie({ runtime: 120 });
    const theatre = await createTheatre();
    const screenId = theatre.screens[0]._id.toString();
    const start = new Date(Date.now() + 48 * 3_600_000);
    const body = (startTime, prices = PRICES) => ({
      movieId: movie.id, theatreId: theatre.id, screenId, startTime: startTime.toISOString(), prices,
    });

    assert.equal((await api.post('/shows', body(start), { cookie: admin })).status, 201);
    const clash = await api.post('/shows', body(new Date(start.getTime() + 60 * 60_000)), { cookie: admin });
    assert.equal(clash.status, 409, 'starts while the first show is still running');
    const tooSoon = await api.post('/shows', body(new Date(start.getTime() + 130 * 60_000)), { cookie: admin });
    assert.equal(tooSoon.status, 409, 'inside the 20-minute cleaning buffer');
    const later = await api.post('/shows', body(new Date(start.getTime() + 145 * 60_000)), { cookie: admin });
    assert.equal(later.status, 201);

    const noPrice = await api.post('/shows', body(new Date(start.getTime() + 10 * 3_600_000), { NORMAL: 100 }), { cookie: admin });
    assert.equal(noPrice.status, 400);
  });
});
