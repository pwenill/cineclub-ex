import { FilmModel } from '../../src/models/Film.model';
import {
  clearMongoMemory,
  connectMongoMemory,
  disconnectMongoMemory,
} from '../setup/mongoSetup';

beforeAll(connectMongoMemory);
afterEach(clearMongoMemory);
afterAll(disconnectMongoMemory);

describe('FilmModel', () => {
  it('cree un film valide', async () => {
    const film = await FilmModel.create({
      _id: 1,
      titre: 'Inception',
      annee: 2010,
      genre: 'science-fiction',
    });

    expect(film._id).toBe(1);
    expect(film.titre).toBe('Inception');
    expect(film.genre).toBe('science-fiction');
  });

  it('rejette un film sans titre', async () => {
    await expect(
      FilmModel.create({
        _id: 2,
        annee: 2010,
        genre: 'action',
      }),
    ).rejects.toThrow(/validation failed/i);
  });

  it('rejette une annee inferieure a 1895', async () => {
    await expect(
      FilmModel.create({
        _id: 3,
        titre: 'Avant le cinema',
        annee: 1894,
        genre: 'documentaire',
      }),
    ).rejects.toThrow(/validation failed/i);
  });

  it('rejette un genre hors enum', async () => {
    await expect(
      FilmModel.create({
        _id: 4,
        titre: 'Genre inconnu',
        annee: 2000,
        genre: 'western',
      } as never),
    ).rejects.toThrow(/validation failed/i);
  });
});
