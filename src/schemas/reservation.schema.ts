import { z } from "zod";

export const CreateReservationBodySchema = z
  .object({
    adherentId: z.number().int().positive(),
    seanceId: z.number().int().positive(),
    montantCents: z.number().int(),
  })
  .strict();

export type CreateReservationDTO = z.infer<typeof CreateReservationBodySchema>;
