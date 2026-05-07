import { Router } from 'express';

import { ReservationController } from '../controllers/ReservationController';
import { asyncRoute } from '../helpers/asyncRoute';

export function createReservationRouter(controller: ReservationController): Router {
  const router = Router();

  router.post('/', asyncRoute(controller.create));

  return router;
}
