import { Router } from 'express';

import { AvisController } from '../controllers/AvisController';
import { asyncRoute } from '../helpers/asyncRoute';

export function createFilmRouter(avisController: AvisController): Router {
  const router = Router();

  router.get('/:id/avis', asyncRoute(avisController.findAllByFilm));
  router.post('/:id/avis', asyncRoute(avisController.createForFilm));

  return router;
}
