import { Router } from 'express';

import { AvisController } from '../controllers/AvisController';
import { FilmController } from '../controllers/FilmController';
import { asyncRoute } from '../helpers/asyncRoute';

export function createFilmRouter(
  filmController: FilmController,
  avisController: AvisController,
): Router {
  const router = Router();

  router.get('/', asyncRoute(filmController.findAll));
  router.get('/top-rated', asyncRoute(avisController.topRatedFilms));
  router.get('/:id/avis', asyncRoute(avisController.findAllByFilm));
  router.post('/:id/avis', asyncRoute(avisController.createForFilm));

  return router;
}
