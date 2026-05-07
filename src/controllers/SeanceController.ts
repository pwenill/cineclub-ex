import { Request, Response } from 'express';

import { sendZodError } from '../helpers/zodResponse';
import { ArchiveOldSeancesBodySchema } from '../schemas/seance.schema';
import { SeanceArchiveService } from '../services/SeanceArchiveService';

export class SeanceController {
  constructor(private readonly seanceArchiveService: SeanceArchiveService) {}

  archiveOld = async (req: Request, res: Response): Promise<void> => {
    const parsedBody = ArchiveOldSeancesBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendZodError(res, parsedBody.error);
      return;
    }

    const archivedCount = await this.seanceArchiveService.archiveOldSeances(parsedBody.data.avant);
    res.json({ data: { archivedCount } });
  };
}
