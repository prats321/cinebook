import { Router } from 'express';
import * as bookings from '../controllers/booking.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkoutSchema, verifyPaymentSchema } from '../validators.js';

const router = Router();

router.use(protect);

router.post('/checkout', validate(checkoutSchema), bookings.checkout);
router.post('/verify', validate(verifyPaymentSchema), bookings.verifyPayment);
router.get('/me', bookings.myBookings);
router.get('/:id', bookings.getBooking);
router.post('/:id/cancel', bookings.cancel);

export default router;
