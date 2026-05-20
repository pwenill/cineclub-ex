import { RowDataPacket } from 'mysql2/promise';

import { Film } from '../entities/film';
import { getPool } from '../infra/mysql';

type MySqlDate = Date | string;

interface FilmRow extends RowDataPacket {
  id: number;
  titre: string;
  realisateur: string;
  annee: number;
  duree_minutes: number;
  created_at: MySqlDate;
}

export interface FilmRepository {
  findAll(): Promise<Film[]>;
}

function toDate(value: MySqlDate): Date {
  return value instanceof Date ? value : new Date(value);
}

function toFilm(row: FilmRow): Film {
  return {
    id: row.id,
    titre: row.titre,
    realisateur: row.realisateur,
    annee: row.annee,
    dureeMinutes: row.duree_minutes,
    createdAt: toDate(row.created_at),
  };
}

export class MySQLFilmRepository implements FilmRepository {
  async findAll(): Promise<Film[]> {
    const [rows] = await getPool().execute<FilmRow[]>(
      `SELECT id, titre, realisateur, annee, duree_minutes, created_at
         FROM film
        ORDER BY titre ASC`,
    );

    return rows.map(toFilm);
  }
}
