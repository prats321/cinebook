import { Router } from 'express';
import * as movies from '../controllers/movie.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateMovieSchema } from '../validators.js';

const router = Router();
const admin = [protect, authorize('admin')];

router.get('/', movies.listMovies);
router.get('/filters', movies.getFilters);
router.get('/tmdb/search', admin, movies.searchTmdb);
router.post('/import/:tmdbId', admin, movies.importFromTmdb);
router.get('/:id', movies.getMovie);
router.get('/:id/shows', movies.getMovieShows);
router.patch('/:id', admin, validate(updateMovieSchema), movies.updateMovie);

export default router;
