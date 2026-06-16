import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../src/app';

const jwtSecret = 'test-secret-sc5';
const app = createApp({ jwtSecret });

describe('Auth - routes protegees', () => {
  it('rejette une requete sans token avec 401', async () => {
    await request(app).get('/admin/stats').expect(401);
  });

  it('rejette un token JWT expire avec 401', async () => {
    const expiredToken = jwt.sign(
      {
        id: 1,
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      jwtSecret,
    );

    await request(app)
      .get('/admin/stats')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('rejette un role insuffisant avec 403', async () => {
    const userToken = jwt.sign({ id: 1, role: 'user' }, jwtSecret, { expiresIn: '1h' });

    await request(app)
      .delete('/admin/adherents/1')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('n expose pas les secrets dans la reponse health', async () => {
    const response = await request(app).get('/health').expect(200);
    const body = JSON.stringify(response.body);
    const secrets = [process.env.DB_PASS, process.env.JWT_SECRET, jwtSecret].filter(
      (secret): secret is string => Boolean(secret),
    );

    for (const secret of secrets) {
      expect(body).not.toContain(secret);
    }
  });
});
