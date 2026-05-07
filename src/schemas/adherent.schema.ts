import { z } from 'zod';

const RequiredNameSchema = z.string().trim().min(1).max(80);
const EmailSchema = z.string().trim().email().max(160).transform((email) => email.toLowerCase());
const TelephoneSchema = z.string().trim().regex(/^0[1-9]\d{8}$/, {
  message: 'Le telephone doit contenir 10 chiffres et commencer par 0.',
});

export const AdherentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const CreateAdherentSchema = z
  .object({
    nom: RequiredNameSchema,
    prenom: RequiredNameSchema,
    email: EmailSchema,
    telephone: TelephoneSchema.optional(),
  })
  .strict();

export const UpdateAdherentSchema = z
  .object({
    nom: RequiredNameSchema.optional(),
    prenom: RequiredNameSchema.optional(),
    email: EmailSchema.optional(),
    telephone: TelephoneSchema.nullable().optional(),
    actif: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit etre fourni.',
  });

export type CreateAdherentDTO = z.infer<typeof CreateAdherentSchema>;
export type UpdateAdherentDTO = z.infer<typeof UpdateAdherentSchema>;
