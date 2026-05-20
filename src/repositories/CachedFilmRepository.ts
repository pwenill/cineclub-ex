import { FilmStats } from '../entities/film';
import { getRedis } from '../infra/redis';
import type { AvisRepository } from './AvisRepository';

const TOP_FILMS_CACHE_PREFIX = 'top:films';
const TOP_FILMS_TTL_SECONDS = 300;

function buildTopFilmsCacheKey(days: number, limit: number): string {
  return `${TOP_FILMS_CACHE_PREFIX}:days:${days}:limit:${limit}`;
}

export async function invalidateTopFilmsCache(): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(`${TOP_FILMS_CACHE_PREFIX}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[redis] Invalidation du cache top films impossible :', error);
  }
}

export class CachedFilmRepository {
  constructor(private readonly avisRepository: Pick<AvisRepository, 'notesParFilm'>) {}

  async getTopFilms(days = 30, limit = 10): Promise<FilmStats[]> {
    const cacheKey = buildTopFilmsCacheKey(days, limit);

    try {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as FilmStats[];
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[redis] Lecture cache top films impossible :', error);
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const topFilms = await this.avisRepository.notesParFilm(since, limit);

    try {
      await getRedis().set(cacheKey, JSON.stringify(topFilms), 'EX', TOP_FILMS_TTL_SECONDS);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[redis] Ecriture cache top films impossible :', error);
    }

    return topFilms;
  }
}
