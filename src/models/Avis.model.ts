import { Schema, model } from 'mongoose';
import slugify from 'slugify';

import { FilmModel } from './Film.model';

export interface AvisDocument {
  _id: Schema.Types.ObjectId;
  adherentId: number;
  filmId: number;
  note: number;
  commentaire?: string;
  tags?: string[];
  photos?: Array<{
    url: string;
    legende?: string;
  }>;
  slug?: string;
  statut: 'publie' | 'modere' | 'masque';
  createdAt: Date;
  updatedAt: Date;
}

const avisPhotoSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      match: /^https?:\/\//,
    },
    legende: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false, strict: true },
);

const avisSchema = new Schema<AvisDocument>(
  {
    adherentId: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    filmId: {
      type: Number,
      ref: 'Film',
      required: true,
      min: 1,
      index: true,
    },
    note: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    commentaire: {
      type: String,
      maxlength: 2000,
      trim: true,
    },
    tags: [
      {
        type: String,
        maxlength: 30,
        trim: true,
      },
    ],
    photos: [avisPhotoSchema],
    slug: {
      type: String,
      trim: true,
      maxlength: 255,
      index: true,
    },
    statut: {
      type: String,
      enum: ['publie', 'modere', 'masque'],
      default: 'publie',
    },
  },
  {
    collection: 'avis',
    timestamps: true,
    strict: true,
    versionKey: false,
  },
);

avisSchema.pre('save', async function setFilmSlug(next) {
  if (!this.isNew && !this.isModified('filmId')) {
    return next();
  }

  const film = await FilmModel.findById(this.filmId).select('titre').lean<{ titre: string } | null>();
  if (film?.titre) {
    this.slug = slugify(film.titre, {
      lower: true,
      strict: true,
    });
  }

  return next();
});

avisSchema.index({ filmId: 1, statut: 1, createdAt: -1 });

export const AvisModel = model<AvisDocument>('Avis', avisSchema);
