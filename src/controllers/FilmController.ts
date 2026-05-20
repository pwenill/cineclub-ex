import { Request, Response } from 'express';

import { toFilmResponseDTO } from '../dtos/film.dto';
import { FilmRepository } from '../repositories/FilmRepository';

export class FilmController {
  constructor(private readonly filmRepository: FilmRepository) {}

  findAll = async (_req: Request, res: Response): Promise<void> => {
    const films = await this.filmRepository.findAll();
    res.json({
      data: films.map(toFilmResponseDTO),
    });
  };
}
