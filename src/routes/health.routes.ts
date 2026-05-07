import { Router } from 'express';

import { HealthController } from '../controllers/HealthController';

export function createHealthRouter(controller: HealthController): Router {
  const router = Router();

  router.get('/', controller.getHealth);

  return router;
}
