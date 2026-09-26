import { Router } from 'express';
import * as theatres from '../controllers/theatre.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { theatreSchema } from '../validators.js';

const router = Router();
const admin = [protect, authorize('admin')];

router.get('/', theatres.listTheatres);
router.get('/cities', theatres.listCities);
router.get('/:id', theatres.getTheatre);
router.post('/', admin, validate(theatreSchema), theatres.createTheatre);
router.put('/:id', admin, validate(theatreSchema), theatres.updateTheatre);
router.delete('/:id', admin, theatres.deleteTheatre);

export default router;
