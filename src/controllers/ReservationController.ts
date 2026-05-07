import { Request, Response } from 'express';

import { toReservationResponseDTO } from '../dtos/reservation.dto';
import { sleep } from '../helpers/timing';
import { sendZodError } from '../helpers/zodResponse';
import { CreateReservationBodySchema } from '../schemas/reservation.schema';
import { ConflictError, ReservationService } from '../services/ReservationService';

const MAX_RESERVATION_RETRIES = 3;
const RETRY_DELAY_MS = 30;

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

    for (let attempt = 1; attempt <= MAX_RESERVATION_RETRIES; attempt += 1) {
      try {
        const reservationId = await this.reservationService.reserver(
          parsedBody.data.adherentId,
          parsedBody.data.seanceId,
          parsedBody.data.montantCents,
        );

        res.status(201).json({ data: toReservationResponseDTO(reservationId) });
        return;
      } catch (error) {
        if (error instanceof ConflictError && attempt < MAX_RESERVATION_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }

        if (error instanceof ConflictError) {
          res.status(409).json({
            message: 'Conflit persistant, retentez votre reservation.',
          });
          return;
        }

        throw error;
      }
    }
  };
}
