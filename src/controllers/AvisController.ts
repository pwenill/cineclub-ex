import { Request, Response } from 'express';

import { toAvisResponseDTO } from '../dtos/avis.dto';
import { toFilmStatsResponseDTO } from '../dtos/film.dto';
import { sendZodError } from '../helpers/zodResponse';
import { CachedFilmRepository } from '../repositories/CachedFilmRepository';
import { AvisRepository } from '../repositories/AvisRepository';
import {
  AvisIdParamSchema,
  CreateAvisBodySchema,
  FilmIdParamSchema,
  TopRatedFilmsQuerySchema,
  UpdateAvisSchema,
} from '../schemas/avis.schema';

export class AvisController {
  constructor(
    private readonly avisRepository: AvisRepository,
    private readonly cachedFilmRepository: CachedFilmRepository,
  ) {}

  topRatedFilms = async (req: Request, res: Response): Promise<void> => {
    const parsedQuery = TopRatedFilmsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      sendZodError(res, parsedQuery.error);
      return;
    }

    const films = await this.cachedFilmRepository.getTopFilms(
      parsedQuery.data.days,
      parsedQuery.data.limit,
    );

    res.json({
      data: films.map(toFilmStatsResponseDTO),
    });
  };

  findAllFilm = async(req: Request, res: Response): Promise<void> => {
    // const films = await 
  }

  findAllByFilm = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = FilmIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const avis = await this.avisRepository.findAllByFilm(parsedParams.data.id);
    res.json({
      data: avis.map(toAvisResponseDTO),
    });
  };

  createForFilm = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = FilmIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const parsedBody = CreateAvisBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendZodError(res, parsedBody.error);
      return;
    }

    const avis = await this.avisRepository.create({
      ...parsedBody.data,
      filmId: parsedParams.data.id,
    });
    res.status(201).json({ data: toAvisResponseDTO(avis) });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = AvisIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const avis = await this.avisRepository.findById(parsedParams.data.id);
    if (!avis) {
      res.status(404).json({ message: 'Avis introuvable.' });
      return;
    }

    res.json({ data: toAvisResponseDTO(avis) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = AvisIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const parsedBody = UpdateAvisSchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendZodError(res, parsedBody.error);
      return;
    }

    const avis = await this.avisRepository.update(parsedParams.data.id, parsedBody.data);
    if (!avis) {
      res.status(404).json({ message: 'Avis introuvable.' });
      return;
    }

    res.json({ data: toAvisResponseDTO(avis) });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const parsedParams = AvisIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendZodError(res, parsedParams.error);
      return;
    }

    const avis = await this.avisRepository.remove(parsedParams.data.id);
    if (!avis) {
      res.status(404).json({ message: 'Avis introuvable.' });
      return;
    }

    res.status(204).send();
  };
}
