import { Router } from 'express';

import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

export function createAdminRouter(jwtSecret = process.env.JWT_SECRET ?? 'test-secret'): Router {
  const router = Router();

  router.use(authenticateToken(jwtSecret));

  router.get('/stats', (_req, res) => {
    res.json({
      data: {
        status: 'protected',
      },
    });
  });

  router.delete('/adherents/:id', requireRole('admin'), (_req, res) => {
    res.status(204).send();
  });

  return router;
}
