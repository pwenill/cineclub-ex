const mockExecute = jest.fn();
const mockPool = { execute: mockExecute };

jest.mock('../../src/infra/mysql', () => ({
  getPool: jest.fn(() => mockPool),
}));

import { MySQLAdherentRepository } from '../../src/repositories/AdherentRepository';

const repository = new MySQLAdherentRepository();

const payloads = [
  "' OR '1'='1",
  "'; DROP TABLE adherent; --",
  "' UNION SELECT * FROM adherent --",
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SQL Injection - MySQLAdherentRepository.findByEmail', () => {
  it.each(payloads)('traite le payload comme une valeur: %s', async (payload) => {
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await repository.findByEmail(payload);

    const [sqlQuery, sqlParams] = mockExecute.mock.calls[0] as [string, unknown[]];
    expect(sqlQuery).toContain('?');
    expect(sqlQuery).not.toContain(payload);
    expect(sqlParams).toEqual([payload]);
    expect(result).toHaveLength(0);
  });
});
