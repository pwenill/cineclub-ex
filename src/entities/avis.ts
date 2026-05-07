export type AvisStatut = 'publie' | 'modere' | 'masque';

export interface AvisPhoto {
  url: string;
  legende?: string;
}

export interface Avis {
  id: string;
  adherentId: number;
  filmId: number;
  note: number;
  commentaire?: string;
  tags: string[];
  photos: AvisPhoto[];
  statut: AvisStatut;
  createdAt: Date;
  updatedAt: Date;
}
