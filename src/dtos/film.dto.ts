import { Film, FilmStats } from '../entities/film';

export interface FilmResponseDTO {
  id: number;
  titre: string;
  realisateur: string;
  annee: number;
  dureeMinutes: number;
  createdAt: Date;
}

export interface FilmStatsResponseDTO {
  filmId: number;
  titre?: string;
  annee?: number;
  noteMoyenne: number;
  nbAvis: number;
  meilleureNote: number;
}

export function toFilmResponseDTO(film: Film): FilmResponseDTO {
  return {
    id: film.id,
    titre: film.titre,
    realisateur: film.realisateur,
    annee: film.annee,
    dureeMinutes: film.dureeMinutes,
    createdAt: film.createdAt,
  };
}

export function toFilmStatsResponseDTO(stats: FilmStats): FilmStatsResponseDTO {
  return {
    filmId: stats.filmId,
    titre: stats.titre,
    annee: stats.annee,
    noteMoyenne: stats.noteMoyenne,
    nbAvis: stats.nbAvis,
    meilleureNote: stats.meilleureNote,
  };
}
