export type AvisStatut = 'publie' | 'modere' | 'masque';

export interface AvisPhoto {
  url: string;
  legende?: string;
}

export interface Avis {
  id: string;
  adherentId: number;
  filmId: number;
  film?: {
    id: number;
    titre: string;
    annee: number;
  };
  note: number;
  commentaire?: string;
  tags: string[];
  photos: AvisPhoto[];
  slug?: string;
  statut: AvisStatut;
  createdAt: Date;
  updatedAt: Date;
}
