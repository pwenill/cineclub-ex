import { Schema, model } from 'mongoose';

export interface FilmDocument {
  _id: number;
  titre: string;
  annee: number;
  affiche?: string;
}

const filmSchema = new Schema<FilmDocument>(
  {
    _id: {
      type: Number,
      required: true,
      min: 1,
    },
    titre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    annee: {
      type: Number,
      required: true,
      min: 1888,
      max: 2100,
    },
    affiche: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    collection: 'films',
    strict: true,
    versionKey: false,
  },
);

filmSchema.index({ titre: 1 });

export const FilmModel = model<FilmDocument>('Film', filmSchema);
