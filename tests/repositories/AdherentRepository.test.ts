const mockExecute = jest.fn();
const mockPool = { execute: mockExecute };

jest.mock('../../src/infra/mysql', () => ({
  getPool: jest.fn(() => mockPool),
}));

import {
  DuplicateAdherentEmailError,
  MySQLAdherentRepository,
} from '../../src/repositories/AdherentRepository';

const repository = new MySQLAdherentRepository();

function adherentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    nom: 'Dupont',
    prenom: 'Alice',
    email: 'alice@cineclub.fr',
    telephone: '0692000000',
    actif: 1,
    date_inscription: '2026-01-10T00:00:00.000Z',
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: '2026-01-10T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MySQLAdherentRepository.findAll', () => {
  it('retourne tous les adherents', async () => {
    mockExecute.mockResolvedValueOnce([[adherentRow()]]);

    const result = await repository.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      nom: 'Dupont',
      prenom: 'Alice',
      email: 'alice@cineclub.fr',
      actif: true,
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('retourne un tableau vide si aucun adherent', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await repository.findAll();

    expect(result).toHaveLength(0);
  });
});

describe('MySQLAdherentRepository.findById', () => {
  it('retourne un adherent existant', async () => {
    mockExecute.mockResolvedValueOnce([[adherentRow({ id: 42, nom: 'Martin' })]]);

    const result = await repository.findById(42);

    expect(result).not.toBeNull();
    expect(result?.nom).toBe('Martin');
    expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [42]);
  });

  it('retourne null si aucun adherent ne correspond', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });

  it('propage les erreurs MySQL', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ER_NO_SUCH_TABLE'));

    await expect(repository.findById(1)).rejects.toThrow('ER_NO_SUCH_TABLE');
  });
});

describe('MySQLAdherentRepository.create', () => {
  it('insere puis relit l adherent cree', async () => {
    mockExecute
      .mockResolvedValueOnce([{ insertId: 5 }])
      .mockResolvedValueOnce([[adherentRow({ id: 5 })]]);

    const result = await repository.create({
      nom: 'Durand',
      prenom: 'Nadia',
      email: 'nadia@cineclub.fr',
      telephone: '0692111111',
    });

    expect(result.id).toBe(5);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO adherent'),
      ['Durand', 'Nadia', 'nadia@cineclub.fr', '0692111111', true],
    );
  });

  it('leve une erreur metier en cas de doublon email', async () => {
    const error = new Error('Duplicate entry') as Error & { code: string };
    error.code = 'ER_DUP_ENTRY';
    mockExecute.mockRejectedValueOnce(error);

    await expect(
      repository.create({
        nom: 'Durand',
        prenom: 'Nadia',
        email: 'nadia@cineclub.fr',
      }),
    ).rejects.toBeInstanceOf(DuplicateAdherentEmailError);
  });

  it('signale une creation impossible a relire', async () => {
    mockExecute.mockResolvedValueOnce([{ insertId: 5 }]).mockResolvedValueOnce([[]]);

    await expect(
      repository.create({
        nom: 'Durand',
        prenom: 'Nadia',
        email: 'nadia@cineclub.fr',
      }),
    ).rejects.toThrow('[adherent] Creation impossible a relire.');
  });
});

describe('MySQLAdherentRepository.update', () => {
  it('met a jour puis relit l adherent modifie', async () => {
    mockExecute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[adherentRow({ id: 7, nom: 'Robert', telephone: null, actif: 0 })]]);

    const result = await repository.update(7, {
      nom: 'Robert',
      telephone: null,
      actif: false,
    });

    expect(result).toMatchObject({
      id: 7,
      nom: 'Robert',
      telephone: null,
      actif: false,
    });
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE adherent'),
      ['Robert', null, false, 7],
    );
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it('retourne null si aucun adherent n est modifie', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const result = await repository.update(404, { nom: 'Introuvable' });

    expect(result).toBeNull();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

describe('MySQLAdherentRepository.delete', () => {
  it('retourne true si une ligne est supprimee', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await repository.delete(12);

    expect(result).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith('DELETE FROM adherent WHERE id = ?', [12]);
  });

  it('retourne false si aucune ligne n est supprimee', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const result = await repository.delete(12);

    expect(result).toBe(false);
  });
});
