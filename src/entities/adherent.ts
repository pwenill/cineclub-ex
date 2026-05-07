export interface Adherent {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  actif: boolean;
  dateInscription: Date;
  createdAt: Date;
  updatedAt: Date;
}
