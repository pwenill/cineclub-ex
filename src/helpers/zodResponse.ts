import { Response } from 'express';
import { ZodError } from 'zod';

export function sendZodError(res: Response, error: ZodError): void {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

  res.status(400).json({
    error: 'VALIDATION_ERROR',
    message: details[0]?.message ?? 'Donnees invalides.',
    details,
    errors: error.flatten(),
  });
}
