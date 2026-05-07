import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { Adherent } from '../entities/adherent';
import { getPool } from '../infra/mysql';
import { CreateAdherentDTO, UpdateAdherentDTO } from '../schemas/adherent.schema';

type MySqlDate = Date | string;

interface AdherentRow extends RowDataPacket {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  actif: 0 | 1;
  date_inscription: MySqlDate;
  created_at: MySqlDate;
  updated_at: MySqlDate;
}

interface MySqlDriverError extends Error {
  code?: string;
  errno?: number;
}

export interface AdherentRepository {
  findAll(): Promise<Adherent[]>;
  findById(id: number): Promise<Adherent | null>;
  create(data: CreateAdherentDTO): Promise<Adherent>;
  update(id: number, data: UpdateAdherentDTO): Promise<Adherent | null>;
  delete(id: number): Promise<boolean>;
}

export class DuplicateAdherentEmailError extends Error {
  constructor(email: string) {
    super(`Un adherent existe deja avec l'email ${email}.`);
    this.name = 'DuplicateAdherentEmailError';
  }
}

function toDate(value: MySqlDate): Date {
  return value instanceof Date ? value : new Date(value);
}

function toAdherent(row: AdherentRow): Adherent {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    telephone: row.telephone,
    actif: Boolean(row.actif),
    dateInscription: toDate(row.date_inscription),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function isMySqlDriverError(error: unknown): error is MySqlDriverError {
  return error instanceof Error && 'code' in error;
}

function assertNotDuplicateEmail(error: unknown, email: string): never {
  if (isMySqlDriverError(error) && error.code === 'ER_DUP_ENTRY') {
    throw new DuplicateAdherentEmailError(email);
  }
  throw error;
}

export class MySQLAdherentRepository implements AdherentRepository {
  async findAll(): Promise<Adherent[]> {
    const [rows] = await getPool().execute<AdherentRow[]>(
      `SELECT id, nom, prenom, email, telephone, actif,
              date_inscription, created_at, updated_at
         FROM adherent
        ORDER BY nom ASC, prenom ASC`,
    );

    return rows.map(toAdherent);
  }

  async findById(id: number): Promise<Adherent | null> {
    const [rows] = await getPool().execute<AdherentRow[]>(
      `SELECT id, nom, prenom, email, telephone, actif,
              date_inscription, created_at, updated_at
         FROM adherent
        WHERE id = ?`,
      [id],
    );

    const row = rows[0];
    return row ? toAdherent(row) : null;
  }

  async create(data: CreateAdherentDTO): Promise<Adherent> {
    try {
      const [result] = await getPool().execute<ResultSetHeader>(
        `INSERT INTO adherent (nom, prenom, email, telephone, actif)
              VALUES (?, ?, ?, ?, ?)`,
        [data.nom, data.prenom, data.email, data.telephone ?? null, true],
      );

      const created = await this.findById(result.insertId);
      if (!created) {
        throw new Error('[adherent] Creation impossible a relire.');
      }

      return created;
    } catch (error) {
      assertNotDuplicateEmail(error, data.email);
    }
  }

  async update(id: number, data: UpdateAdherentDTO): Promise<Adherent | null> {
    const fields: string[] = [];
    const values: Array<string | boolean | null | number> = [];

    if (data.nom !== undefined) {
      fields.push('nom = ?');
      values.push(data.nom);
    }
    if (data.prenom !== undefined) {
      fields.push('prenom = ?');
      values.push(data.prenom);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.telephone !== undefined) {
      fields.push('telephone = ?');
      values.push(data.telephone);
    }
    if (data.actif !== undefined) {
      fields.push('actif = ?');
      values.push(data.actif);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    try {
      const [result] = await getPool().execute<ResultSetHeader>(
        `UPDATE adherent
            SET ${fields.join(', ')}
          WHERE id = ?`,
        values,
      );

      if (result.affectedRows === 0) {
        return null;
      }

      return this.findById(id);
    } catch (error) {
      assertNotDuplicateEmail(error, data.email ?? '');
    }
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await getPool().execute<ResultSetHeader>(
      'DELETE FROM adherent WHERE id = ?',
      [id],
    );

    return result.affectedRows > 0;
  }
}
