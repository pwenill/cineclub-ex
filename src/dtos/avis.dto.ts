import { Avis, AvisPhoto, AvisStatut } from '../entities/avis';

export interface AvisResponseDTO {
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

export function toAvisResponseDTO(avis: Avis): AvisResponseDTO {
  return {
    id: avis.id,
    adherentId: avis.adherentId,
    filmId: avis.filmId,
    film: avis.film,
    note: avis.note,
    commentaire: avis.commentaire,
    tags: avis.tags,
    photos: avis.photos,
    slug: avis.slug,
    statut: avis.statut,
    createdAt: avis.createdAt,
    updatedAt: avis.updatedAt,
  };
}
