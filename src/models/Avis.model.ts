import { Schema, model } from 'mongoose';

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

const avisSchema = new Schema(
  {
    adherentId: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    filmId: {
      type: Number,
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

avisSchema.index({ filmId: 1, createdAt: -1 });

export const AvisModel = model('Avis', avisSchema);
