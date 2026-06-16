import request from 'supertest';

import { createApp } from '../../src/app';
import { AdherentRepository } from '../../src/repositories/AdherentRepository';

const fakeAdherentRepository: AdherentRepository = {
  async findAll() {
    return [];
  },
  async findById() {
    return null;
  },
  async findByEmail() {
    return [];
  },
  async create() {
    throw new Error('La route aurait du rejeter le payload avant le repository.');
  },
  async update() {
    return null;
  },
  async delete() {
    return false;
  },
};

const app = createApp({ adherentRepository: fakeAdherentRepository });

const payloads = [
  { nom: 'Test', prenom: 'NoSQL', email: { $gt: '' } },
  { nom: 'Test', prenom: 'NoSQL', email: { $where: '1==1' } },
  { nom: 'Test', prenom: 'NoSQL', email: ['a@cineclub.fr', 'b@cineclub.fr'] },
];

describe('NoSQL Injection - POST /adherents', () => {
  it.each(payloads)('rejette le payload %# avec 400', async (payload) => {
    const response = await request(app).post('/adherents').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.message ?? response.body.error).toBeDefined();
  });
});
