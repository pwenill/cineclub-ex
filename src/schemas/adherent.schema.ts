import { z } from 'zod';

const RequiredNameSchema = z
  .string({
    required_error: 'Ce champ est obligatoire.',
    invalid_type_error: 'Ce champ doit etre une chaine de caracteres.',
  })
  .trim()
  .min(1, 'Ce champ est obligatoire.')
  .max(80, 'Ce champ ne doit pas depasser 80 caracteres.');

const EmailSchema = z
  .string({
    required_error: 'L email est obligatoire.',
    invalid_type_error: 'L email doit etre une chaine de caracteres.',
  })
  .trim()
  .email('L email doit etre valide.')
  .max(160, 'L email ne doit pas depasser 160 caracteres.')
  .transform((email) => email.toLowerCase());

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
