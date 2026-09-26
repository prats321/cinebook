import { Router } from 'express';
import * as shows from '../controllers/show.controller.js';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { showSchema, lockSeatsSchema } from '../validators.js';

const router = Router();

router.get('/:id', shows.getShow);
router.get('/:id/seats', optionalAuth, shows.getSeats);
router.post('/:id/lock', protect, validate(lockSeatsSchema), shows.lockSeats);
router.delete('/:id/lock', protect, shows.releaseSeats);

router.post('/', protect, authorize('admin'), validate(showSchema), shows.createShow);
router.delete('/:id', protect, authorize('admin'), shows.deleteShow);

export default router;
