import { Router } from 'express';

import { AvisController } from '../controllers/AvisController';
import { asyncRoute } from '../helpers/asyncRoute';

export function createAvisRouter(controller: AvisController): Router {
  const router = Router();

  router.get('/:id', asyncRoute(controller.findById));
  router.put('/:id', asyncRoute(controller.update));
  router.delete('/:id', asyncRoute(controller.remove));

  return router;
}
