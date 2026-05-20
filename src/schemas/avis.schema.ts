import { z } from 'zod';

export const FilmIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const AvisIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Identifiant MongoDB invalide.',
  }),
});

export const AvisStatutSchema = z.enum(['publie', 'modere', 'masque']);

export const TopRatedFilmsQuerySchema = z
  .object({
    days: z.coerce.number().int().positive().max(365).default(30),
    limit: z.coerce.number().int().positive().max(50).default(10),
  })
  .strict();

const AvisPhotoSchema = z
  .object({
    url: z.string().trim().url().max(500),
    legende: z.string().trim().max(120).optional(),
  })
  .strict();

export const CreateAvisBodySchema = z
  .object({
    adherentId: z.number().int().positive(),
    note: z.number().int().min(0).max(5),
    commentaire: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    photos: z.array(AvisPhotoSchema).max(5).optional(),
    statut: AvisStatutSchema.optional(),
  })
  .strict();

export const UpdateAvisSchema = z
  .object({
    note: z.number().int().min(0).max(5).optional(),
    commentaire: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    photos: z.array(AvisPhotoSchema).max(5).optional(),
    statut: AvisStatutSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit etre fourni.',
  });

export type CreateAvisBodyDTO = z.infer<typeof CreateAvisBodySchema>;
export type CreateAvisDTO = CreateAvisBodyDTO & { filmId: number };
export type UpdateAvisDTO = z.infer<typeof UpdateAvisSchema>;
export type TopRatedFilmsQueryDTO = z.infer<typeof TopRatedFilmsQuerySchema>;
