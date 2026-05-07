import { NextFunction, Request, Response } from 'express';

import { containsUnsafeMongoKey } from '../helpers/mongoSecurity';

export function rejectMongoOperators(req: Request, res: Response, next: NextFunction): void {
  if (req.body !== undefined && containsUnsafeMongoKey(req.body)) {
    res.status(400).json({
      message: 'Donnees invalides : cle MongoDB interdite.',
    });
    return;
  }

  next();
}
