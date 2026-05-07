import { NextFunction, Request, Response } from 'express';

import { isHttpParseError } from '../helpers/httpParseError';
import { DuplicateAdherentEmailError } from '../repositories/AdherentRepository';
import {
  AdherentNotFoundError,
  ConflictError,
  DuplicateReservationError,
  InvalidPaymentAmountError,
  NotEnoughSeatsError,
  SeanceNotFoundError,
} from '../services/ReservationService';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isHttpParseError(err) && (err.status === 400 || err.statusCode === 400)) {
    res.status(400).json({ message: 'JSON invalide.' });
    return;
  }

  if (err instanceof AdherentNotFoundError || err instanceof SeanceNotFoundError) {
    res.status(404).json({ message: err.message });
    return;
  }

  if (
    err instanceof ConflictError ||
    err instanceof NotEnoughSeatsError ||
    err instanceof DuplicateReservationError
  ) {
    res.status(409).json({ message: err.message });
    return;
  }

  if (err instanceof InvalidPaymentAmountError) {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err instanceof DuplicateAdherentEmailError) {
    res.status(409).json({ message: err.message });
    return;
  }

  if (err instanceof Error && err.name === 'ValidationError') {
    res.status(400).json({ message: err.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[api] Erreur non geree :', err);
  res.status(500).json({ message: 'Erreur interne serveur.' });
}
