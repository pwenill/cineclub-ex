import { Avis, AvisPhoto, AvisStatut } from '../entities/avis';

export interface AvisResponseDTO {
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

export function toAvisResponseDTO(avis: Avis): AvisResponseDTO {
  return {
    id: avis.id,
    adherentId: avis.adherentId,
    filmId: avis.filmId,
    note: avis.note,
    commentaire: avis.commentaire,
    tags: avis.tags,
    photos: avis.photos,
    statut: avis.statut,
    createdAt: avis.createdAt,
    updatedAt: avis.updatedAt,
  };
}
