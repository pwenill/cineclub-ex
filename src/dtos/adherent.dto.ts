import { Adherent } from '../entities/adherent';

export interface AdherentResponseDTO {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  dateInscription: Date;
}

export function toAdherentResponseDTO(adherent: Adherent): AdherentResponseDTO {
  return {
    id: adherent.id,
    nom: adherent.nom,
    prenom: adherent.prenom,
    email: adherent.email,
    telephone: adherent.telephone,
    dateInscription: adherent.dateInscription,
  };
}
