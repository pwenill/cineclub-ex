import { z } from 'zod';

function isValidDateOnly(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const ArchiveOldSeancesBodySchema = z
  .object({
    avant: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'La date doit etre au format YYYY-MM-DD.',
      })
      .refine(isValidDateOnly, {
        message: 'La date fournie est invalide.',
      }),
  })
  .strict();

export type ArchiveOldSeancesDTO = z.infer<typeof ArchiveOldSeancesBodySchema>;
