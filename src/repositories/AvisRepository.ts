import { Types } from 'mongoose';

import { Avis, AvisPhoto, AvisStatut } from '../entities/avis';
import { AvisModel } from '../models/Avis.model';
import { CreateAvisDTO, UpdateAvisDTO } from '../schemas/avis.schema';

interface AvisObject {
  _id: Types.ObjectId;
  adherentId: number;
  filmId: number;
  note: number;
  commentaire?: string;
  tags?: string[];
  photos?: AvisPhoto[];
  statut?: AvisStatut;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvisRepository {
  findAllByFilm(filmId: number): Promise<Avis[]>;
  findById(id: string): Promise<Avis | null>;
  create(data: CreateAvisDTO): Promise<Avis>;
  update(id: string, data: UpdateAvisDTO): Promise<Avis | null>;
  remove(id: string): Promise<Avis | null>;
}

function toAvis(document: AvisObject): Avis {
  return {
    id: document._id.toString(),
    adherentId: document.adherentId,
    filmId: document.filmId,
    note: document.note,
    commentaire: document.commentaire,
    tags: document.tags ?? [],
    photos: document.photos ?? [],
    statut: document.statut ?? 'publie',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export class MongooseAvisRepository implements AvisRepository {
  async findAllByFilm(filmId: number): Promise<Avis[]> {
    const documents = await AvisModel.find({ filmId, statut: 'publie' })
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
    return toAvis(document.toObject() as AvisObject);
  }

  async update(id: string, data: UpdateAvisDTO): Promise<Avis | null> {
    const document = await AvisModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean<AvisObject | null>();

    return document ? toAvis(document) : null;
  }

  async remove(id: string): Promise<Avis | null> {
    const document = await AvisModel.findByIdAndDelete(id).lean<AvisObject | null>();
    return document ? toAvis(document) : null;
  }
}
