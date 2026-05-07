import { Request, Response } from 'express';

import { toReservationResponseDTO } from '../dtos/reservation.dto';
import { sendZodError } from '../helpers/zodResponse';
import { CreateReservationBodySchema } from '../schemas/reservation.schema';
import { ReservationService } from '../services/ReservationService';

export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(req.body);
    const parsedBody = CreateReservationBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendZodError(res, parsedBody.error);
      return;
    }

    const reservationId = await this.reservationService.reserver(
      parsedBody.data.adherentId,
      parsedBody.data.seanceId,
      parsedBody.data.montantCents,
    );

    res.status(201).json({ data: toReservationResponseDTO(reservationId) });
  };
}
