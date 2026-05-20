import { FilmStats } from '../entities/film';

export interface FilmStatsResponseDTO {
  filmId: number;
  titre?: string;
  annee?: number;
  noteMoyenne: number;
  nbAvis: number;
  meilleureNote: number;
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
