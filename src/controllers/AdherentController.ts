import { Request, Response } from 'express';

import { toAdherentResponseDTO } from '../dtos/adherent.dto';
import { sendZodError } from '../helpers/zodResponse';
import { AdherentRepository } from '../repositories/AdherentRepository';
import {
  AdherentIdParamSchema,
  CreateAdherentSchema,
  UpdateAdherentSchema,
} from '../schemas/adherent.schema';

export class AdherentController {
  constructor(private readonly adherentRepository: AdherentRepository) {}

  findAll = async (_req: Request, res: Response): Promise<void> => {
    const adherents = await this.adherentRepository.findAll();
    res.json({
      data: adherents.map(toAdherentResponseDTO),
    });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = AdherentIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const adherent = await this.adherentRepository.findById(parsedParams.data.id);
    if (!adherent) {
      res.status(404).json({ message: 'Adherent introuvable.' });
      return;
    }

    res.json({ data: toAdherentResponseDTO(adherent) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    // eslint-disable-next-line no-console
    const parsedBody = CreateAdherentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendZodError(res, parsedBody.error);
      return;
    }

    const adherent = await this.adherentRepository.create(parsedBody.data);
    res.status(201).json({ data: toAdherentResponseDTO(adherent) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = AdherentIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const parsedBody = UpdateAdherentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendZodError(res, parsedBody.error);
      return;
    }

    const adherent = await this.adherentRepository.update(parsedParams.data.id, parsedBody.data);
    if (!adherent) {
      res.status(404).json({ message: 'Adherent introuvable.' });
      return;
    }

    res.json({ data: toAdherentResponseDTO(adherent) });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = AdherentIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const deleted = await this.adherentRepository.delete(parsedParams.data.id);
    if (!deleted) {
      res.status(404).json({ message: 'Adherent introuvable.' });
      return;
    }

    res.status(204).send();
  };
}
