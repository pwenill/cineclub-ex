import { Types } from 'mongoose';

import { Avis, AvisPhoto, AvisStatut } from '../entities/avis';
import { FilmStats, FilmSummary } from '../entities/film';
import { AvisModel } from '../models/Avis.model';
import { CreateAvisDTO, UpdateAvisDTO } from '../schemas/avis.schema';
import { invalidateTopFilmsCache } from './CachedFilmRepository';

interface AvisObject {
  _id: Types.ObjectId;
  adherentId: number;
  filmId:
    | number
    | {
        _id: number;
        titre: string;
        annee: number;
      };
  note: number;
  commentaire?: string;
  tags?: string[];
  photos?: AvisPhoto[];
  slug?: string;
  statut?: AvisStatut;
  createdAt: Date;
  updatedAt: Date;
}

interface FilmStatsDocument {
  filmId: number;
  titre?: string;
  annee?: number;
  noteMoyenne: number;
  nbAvis: number;
  meilleureNote: number;
}

export interface AvisRepository {
  findAllByFilm(filmId: number): Promise<Avis[]>;
  findById(id: string): Promise<Avis | null>;
  create(data: CreateAvisDTO): Promise<Avis>;
  update(id: string, data: UpdateAvisDTO): Promise<Avis | null>;
  remove(id: string): Promise<Avis | null>;
  notesParFilm(depuis: Date, limit?: number): Promise<FilmStats[]>;
}

function toFilmId(filmId: AvisObject['filmId']): number {
  return typeof filmId === 'number' ? filmId : filmId._id;
}

function toFilmSummary(filmId: AvisObject['filmId']): FilmSummary | undefined {
  if (typeof filmId === 'number') {
    return undefined;
  }

  return {
    id: filmId._id,
    titre: filmId.titre,
    annee: filmId.annee,
  };
}

function toAvis(document: AvisObject): Avis {
  return {
    id: document._id.toString(),
    adherentId: document.adherentId,
    filmId: toFilmId(document.filmId),
    film: toFilmSummary(document.filmId),
    note: document.note,
    commentaire: document.commentaire,
    tags: document.tags ?? [],
    photos: document.photos ?? [],
    slug: document.slug,
    statut: document.statut ?? 'publie',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export class MongooseAvisRepository implements AvisRepository {
  async findAllByFilm(filmId: number): Promise<Avis[]> {
    const documents = await AvisModel.find({ filmId, statut: 'publie' })
      .populate('filmId', 'titre annee')
      .sort({ createdAt: -1 })
      .lean<AvisObject[]>();

    return documents.map(toAvis);
  }

  async findById(id: string): Promise<Avis | null> {
    const document = await AvisModel.findById(id).lean<AvisObject | null>();
    return document ? toAvis(document) : null;
  }

  async create(data: CreateAvisDTO): Promise<Avis> {
    const document = await AvisModel.create(data);
    await invalidateTopFilmsCache();
    return toAvis(document.toObject() as unknown as AvisObject);
  }

  async update(id: string, data: UpdateAvisDTO): Promise<Avis | null> {
    const document = await AvisModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean<AvisObject | null>();

    if (document) {
      await invalidateTopFilmsCache();
    }

    return document ? toAvis(document) : null;
  }

  async remove(id: string): Promise<Avis | null> {
    const document = await AvisModel.findByIdAndDelete(id).lean<AvisObject | null>();
    if (document) {
      await invalidateTopFilmsCache();
    }
    return document ? toAvis(document) : null;
  }

  async notesParFilm(depuis: Date, limit = 10): Promise<FilmStats[]> {
    const documents = await AvisModel.aggregate<FilmStatsDocument>([
      {
        $match: {
          statut: 'publie',
          createdAt: { $gte: depuis },
        },
      },
      {
        $group: {
          _id: '$filmId',
          noteMoyenne: { $avg: '$note' },
          nbAvis: { $sum: 1 },
          meilleureNote: { $max: '$note' },
        },
      },
      {
        $lookup: {
          from: 'films',
          localField: '_id',
          foreignField: '_id',
          as: 'film',
        },
      },
      {
        $unwind: {
          path: '$film',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          filmId: '$_id',
          titre: '$film.titre',
          annee: '$film.annee',
          noteMoyenne: { $round: ['$noteMoyenne', 1] },
          nbAvis: 1,
          meilleureNote: 1,
        },
      },
      { $sort: { noteMoyenne: -1, nbAvis: -1 } },
      { $limit: limit },
    ]).exec();

    return documents;
  }
}
