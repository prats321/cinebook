import * as bookings from '../services/booking.service.js';
import * as razorpay from '../services/razorpay.service.js';
import { AppError } from '../utils/AppError.js';

export async function checkout(req, res) {
  const result = await bookings.startCheckout(req.body.showId, req.user);
  res.status(201).json({
    success: true,
    ...result,
    prefill: { name: req.user.name, email: req.user.email },
  });
}

export async function verifyPayment(req, res) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

  if (!razorpay.isValidPaymentSignature({ orderId, paymentId, signature })) {
    throw new AppError('Payment verification failed', 400);
  }

  const booking = await bookings.confirmPayment(orderId, paymentId);
  if (!booking.user.equals(req.user._id)) throw new AppError('This payment belongs to another account', 403);

  if (booking.status === 'FAILED') {
    throw new AppError(`${booking.failureReason}. Your payment is being refunded.`, 409);
  }
  res.json({ success: true, booking });
}

// Razorpay calls this server-to-server. It covers the case where the user pays
// and then closes the tab before the browser's verify call reaches us.
export async function webhook(req, res) {
  const rawBody = req.body; // Buffer, thanks to express.raw() on this route
  if (!razorpay.isValidWebhookSignature(rawBody, req.get('x-razorpay-signature'))) {
    throw new AppError('Invalid webhook signature', 400);
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload.payment.entity;
    try {
      await bookings.confirmPayment(payment.order_id, payment.id);
    } catch (err) {
      // Orders we don't know about (e.g. from another app on the same account) are acknowledged, not retried.
      if (err.statusCode !== 404) throw err;
    }
  }
  res.json({ received: true });
}
