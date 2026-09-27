import { Router } from 'express';
import * as bookings from '../controllers/booking.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkoutSchema, verifyPaymentSchema } from '../validators.js';

const router = Router();

router.post('/checkout', protect, validate(checkoutSchema), bookings.checkout);
router.post('/verify', protect, validate(verifyPaymentSchema), bookings.verifyPayment);

export default router;
