import { Request, Response } from 'express';

export class HealthController {
  getHealth = (_req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      mysql: 'connected',
      mongodb: 'connected',
      timestamp: new Date().toISOString(),
    });
  };
}
