export interface FilmSummary {
  id: number;
  titre: string;
  annee: number;
}

export interface FilmStats {
  filmId: number;
  titre?: string;
  annee?: number;
  noteMoyenne: number;
  nbAvis: number;
  meilleureNote: number;
}
