import { Router } from 'express';

import { SeanceController } from '../controllers/SeanceController';
import { asyncRoute } from '../helpers/asyncRoute';

export function createSeanceRouter(controller: SeanceController): Router {
  const router = Router();

  router.post('/archive-old', asyncRoute(controller.archiveOld));

  return router;
}
