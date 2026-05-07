import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { withTransaction } from '../infra/mysql';

interface IdRow extends RowDataPacket {
  id: number;
}

interface SeanceForUpdateRow extends RowDataPacket {
  id: number;
  places_restantes: number;
}

interface MySqlDriverError extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

export class AdherentNotFoundError extends Error {
  constructor(adherentId: number) {
    super(`Adherent ${adherentId} introuvable ou inactif.`);
    this.name = 'AdherentNotFoundError';
  }
}

export class SeanceNotFoundError extends Error {
  constructor(seanceId: number) {
    super(`Seance ${seanceId} introuvable ou archivee.`);
    this.name = 'SeanceNotFoundError';
  }
}

export class NotEnoughSeatsError extends Error {
  constructor(seanceId: number) {
    super(`Plus de places disponibles pour la seance ${seanceId}.`);
    this.name = 'NotEnoughSeatsError';
  }
}

export class DuplicateReservationError extends Error {
  constructor(adherentId: number, seanceId: number) {
    super(`L'adherent ${adherentId} a deja une reservation pour la seance ${seanceId}.`);
    this.name = 'DuplicateReservationError';
  }
}

export class InvalidPaymentAmountError extends Error {
  constructor() {
    super('Le montant du paiement doit etre strictement positif.');
    this.name = 'InvalidPaymentAmountError';
  }
}

function isMySqlDriverError(error: unknown): error is MySqlDriverError {
  return error instanceof Error && 'code' in error;
}

function isPaymentAmountError(error: unknown): boolean {
  return (
    isMySqlDriverError(error) &&
    error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' &&
    (error.sqlMessage ?? '').includes('chk_paiement_montant_positif')
  );
}

export class ReservationService {
  async reserver(adherentId: number, seanceId: number, montantCents = 1200): Promise<number> {
    return withTransaction(async (connection) => {
      const [adherentRows] = await connection.execute<IdRow[]>(
        'SELECT id FROM adherent WHERE id = ? AND actif = 1',
        [adherentId],
      );
      if (adherentRows.length === 0) {
        throw new AdherentNotFoundError(adherentId);
      }

      const [seanceRows] = await connection.execute<SeanceForUpdateRow[]>(
        `SELECT id, places_restantes
           FROM seance
          WHERE id = ?
            AND archived_at IS NULL
          FOR UPDATE`,
        [seanceId],
      );
      const seance = seanceRows[0];
      if (!seance) {
        throw new SeanceNotFoundError(seanceId);
      }
      if (seance.places_restantes < 1) {
        throw new NotEnoughSeatsError(seanceId);
      }

      let reservationId: number;
      try {
        const [reservationResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO reservation (adherent_id, seance_id, statut)
                VALUES (?, ?, 'CONFIRMEE')`,
          [adherentId, seanceId],
        );
        reservationId = reservationResult.insertId;
      } catch (error) {
        if (isMySqlDriverError(error) && error.code === 'ER_DUP_ENTRY') {
          throw new DuplicateReservationError(adherentId, seanceId);
        }
        throw error;
      }

      const [updateResult] = await connection.execute<ResultSetHeader>(
        `UPDATE seance
            SET places_restantes = places_restantes - 1
          WHERE id = ?
            AND places_restantes > 0`,
        [seanceId],
      );
      if (updateResult.affectedRows === 0) {
        throw new NotEnoughSeatsError(seanceId);
      }

      try {
        await connection.execute(
          `INSERT INTO paiement (reservation_id, montant_cents, statut)
                VALUES (?, ?, 'EN_ATTENTE')`,
          [reservationId, montantCents],
        );
      } catch (error) {
        if (isPaymentAmountError(error)) {
          throw new InvalidPaymentAmountError();
        }
        throw error;
      }

      return reservationId;
    });
  }
}
