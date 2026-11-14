import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { capturedEvent, signPayment, startTestServer, webhookRequest } from './helpers.js';
import { createShow } from './fixtures.js';

let ctx;
let api;
before(async () => {
  ctx = await startTestServer();
  api = ctx.api;
});
after(() => ctx.stop());

const lock = (cookie, showId, seats) => api.post(`/shows/${showId}/lock`, { seats }, { cookie });
const checkout = (cookie, showId, extra = {}) => api.post('/bookings/checkout', { showId, ...extra }, { cookie });
const verify = (cookie, orderId, paymentId, signature = signPayment(orderId, paymentId)) =>
  api.post('/bookings/verify', { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }, { cookie });
const booked = async (showId) => (await api.get(`/shows/${showId}/seats`)).json.booked;
const refundCalls = () => ctx.razorpay.calls.filter((c) => c.url.endsWith('/refund'));

describe('checkout', () => {
  it('needs login and a live hold', async () => {
    const { id } = await createShow();
    const user = await api.newUser();
    assert.equal((await checkout(undefined, id)).status, 401);
    assert.equal((await checkout(user, id)).status, 409);
    assert.equal((await checkout(user, 'not-an-id')).status, 400);
  });

  it('prices the order on the server, ignoring anything the client sends', async () => {
    const { id } = await createShow();
    const user = await api.newUser();
    await lock(user, id, ['A1', 'C5', 'C6']);
    const res = await checkout(user, id, { amount: 1 });

    assert.equal(res.status, 201);
    assert.equal(res.json.booking.amount, 450 + 280 + 280);
    assert.equal(res.json.order.amount, 101000, 'Razorpay gets paise');
    assert.equal(res.json.booking.status, 'PENDING');
    assert.match(res.json.booking.bookingCode, /^CB[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(res.json.keyId, 'rzp_test_fakekey');
    const call = ctx.razorpay.calls.at(-1);
    assert.ok(call.okAuth, 'uses Basic auth with the key pair');
    assert.equal(call.body.receipt, res.json.booking.bookingCode);
  });
});

describe('payment confirmation', () => {
  it('rejects a forged signature and books nothing', async () => {
    const { id } = await createShow();
    const user = await api.newUser();
    await lock(user, id, ['F1']);
    const { json } = await checkout(user, id);
    assert.equal((await verify(user, json.order.id, 'pay_x', 'deadbeef')).status, 400);
    assert.deepEqual(await booked(id), []);
  });

  it('confirms once, however many times it is confirmed', async () => {
    const { id } = await createShow();
    const user = await api.newUser();
    await lock(user, id, ['C1', 'C2']);
    const { json } = await checkout(user, id);

    const first = await verify(user, json.order.id, 'pay_1');
    assert.equal(first.status, 200);
    assert.equal(first.json.booking.status, 'CONFIRMED');

    assert.equal((await verify(user, json.order.id, 'pay_1')).status, 200);
    assert.equal((await webhookRequest(api, capturedEvent(json.order.id, 'pay_1'))).status, 200);

    assert.deepEqual((await booked(id)).sort(), ['C1', 'C2'], 'no duplicates in bookedSeats');
    assert.deepEqual((await api.get(`/shows/${id}/seats`, { cookie: user })).json.mine, [], 'hold cleared');
  });

  it("won't reveal another user's booking through verify", async () => {
    const { id } = await createShow();
    const owner = await api.newUser();
    const other = await api.newUser();
    await lock(owner, id, ['F5']);
    const { json } = await checkout(owner, id);
    assert.equal((await verify(other, json.order.id, 'pay_o')).status, 403);
  });

  it('refunds a payment that lands after the seat was sold to someone else', async () => {
    const { id } = await createShow();
    const slow = await api.newUser('Slow payer');
    const fast = await api.newUser('Fast payer');

    await lock(slow, id, ['C9']);
    const slowCheckout = await checkout(slow, id);
    await api.delete(`/shows/${id}/lock`, { cookie: slow }); // their hold lapses mid-payment

    await lock(fast, id, ['C9']);
    const fastCheckout = await checkout(fast, id);
    assert.equal((await verify(fast, fastCheckout.json.order.id, 'pay_fast')).json.booking.status, 'CONFIRMED');

    const before = refundCalls().length;
    const late = await verify(slow, slowCheckout.json.order.id, 'pay_slow');
    assert.equal(late.status, 409);
    assert.match(late.json.message, /refunded/);

    const refund = refundCalls().slice(before);
    assert.equal(refund.length, 1);
    assert.equal(refund[0].url, '/v1/payments/pay_slow/refund');
    assert.equal(refund[0].body.amount, 28000, 'full Premium price in paise');
    assert.deepEqual(await booked(id), ['C9'], 'sold exactly once');
  });
});

describe('webhook', () => {
  it('confirms a booking on its own when the browser never calls verify', async () => {
    const { id } = await createShow();
    const user = await api.newUser();
    await lock(user, id, ['A5', 'A6']);
    const { json } = await checkout(user, id);
    assert.equal((await webhookRequest(api, capturedEvent(json.order.id, 'pay_hook'))).status, 200);
    assert.deepEqual((await booked(id)).sort(), ['A5', 'A6']);
  });

  it('rejects bad signatures and acknowledges events it does not need', async () => {
    assert.equal((await webhookRequest(api, capturedEvent('order_x', 'pay_x'), 'wrong-secret')).status, 400);
    assert.equal((await webhookRequest(api, capturedEvent('order_unknown', 'pay_y'))).status, 200);
    assert.equal((await webhookRequest(api, { event: 'payment.failed', payload: {} })).status, 200);
  });
});

describe('my bookings and cancellation', () => {
  async function paidBooking({ hoursFromNow = 24, seats = ['F10', 'F11'] } = {}) {
    const { id } = await createShow({ hoursFromNow });
    const user = await api.newUser();
    await lock(user, id, seats);
    const { json } = await checkout(user, id);
    const paymentId = `pay_${json.order.id}`;
    const { json: done } = await verify(user, json.order.id, paymentId);
    return { user, showId: id, booking: done.booking, paymentId };
  }

  it('lists real outcomes only, with the show populated and no raw payment ids', async () => {
    const { user } = await paidBooking();
    const { id } = await createShow();
    await lock(user, id, ['A1']);
    await checkout(user, id); // left unpaid -> PENDING, must stay hidden

    const list = (await api.get('/bookings/me', { cookie: user })).json.bookings;
    assert.deepEqual(list.map((b) => b.status), ['CONFIRMED']);
    assert.ok(list[0].show.movie.title && list[0].show.theatre.name);
    assert.equal(list[0].canCancel, true);
    assert.deepEqual(Object.keys(list[0].payment), ['refunded']);
  });

  it("returns 404 for someone else's booking", async () => {
    const { booking } = await paidBooking();
    const stranger = await api.newUser();
    assert.equal((await api.get(`/bookings/${booking._id}`, { cookie: stranger })).status, 404);
    assert.equal((await api.post(`/bookings/${booking._id}/cancel`, undefined, { cookie: stranger })).status, 403);
  });

  it('cancels with a full refund and frees the seats', async () => {
    const { user, showId, booking, paymentId } = await paidBooking();
    const res = await api.post(`/bookings/${booking._id}/cancel`, undefined, { cookie: user });

    assert.equal(res.status, 200);
    assert.equal(res.json.booking.status, 'CANCELLED');
    assert.equal(res.json.booking.payment.refunded, true);
    assert.ok(refundCalls().some((c) => c.url === `/v1/payments/${paymentId}/refund` && c.body.amount === 40000));
    assert.deepEqual(await booked(showId), []);
    assert.equal((await api.post(`/bookings/${booking._id}/cancel`, undefined, { cookie: user })).status, 409, 'only once');
  });

  it('closes cancellation 2 hours before the show', async () => {
    const { user, booking } = await paidBooking({ hoursFromNow: 1.5 });
    const detail = (await api.get(`/bookings/${booking._id}`, { cookie: user })).json.booking;
    assert.equal(detail.canCancel, false);
    assert.equal((await api.post(`/bookings/${booking._id}/cancel`, undefined, { cookie: user })).status, 400);
    assert.equal((await api.get(`/bookings/${booking._id}`, { cookie: user })).json.booking.status, 'CONFIRMED');
  });
});
