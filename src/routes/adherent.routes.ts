import { Router } from 'express';

import { AdherentController } from '../controllers/AdherentController';
import { asyncRoute } from '../helpers/asyncRoute';

export function createAdherentRouter(controller: AdherentController): Router {
  const router = Router();

  router.get('/', asyncRoute(controller.findAll));
  router.get('/:id', asyncRoute(controller.findById));
  router.post('/', asyncRoute(controller.create));
  router.put('/:id', asyncRoute(controller.update));
  router.delete('/:id', asyncRoute(controller.remove));

  return router;
}
