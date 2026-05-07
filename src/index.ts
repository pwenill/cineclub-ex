/**
 * src/index.ts
 * ------------------------------------------------------------------
 * Point d'entrée de l'application (bootstrap).
 *
 * Séquence de démarrage (fail-fast) :
 *   1. Chargement des variables d'environnement (.env)
 *   2. Connexion MySQL        -> testConnection()
 *   3. Connexion MongoDB      -> connectMongo() bite
 *   4. Démarrage du serveur Express uniquement si 2 + 3 réussissent
 *
 * Si une des deux connexions échoue, on log l'erreur et on quitte avec
 * process.exit(1) pour que l'orchestrateur (systemd / Docker / PM2)
 * redémarre le conteneur. On ne démarre JAMAIS Express avec une DAL HS.
 * ------------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';

import { AdherentController } from './controllers/AdherentController';
import { AvisController } from './controllers/AvisController';
import { HealthController } from './controllers/HealthController';
import { ReservationController } from './controllers/ReservationController';
import { SeanceController } from './controllers/SeanceController';
import { testConnection as testMySQL, closePool } from './infra/mysql';
import { connectMongo, closeMongo, pingMongo } from './infra/mongodb';
import { errorMiddleware } from './middlewares/error.middleware';
import { rejectMongoOperators } from './middlewares/rejectMongoOperators.middleware';
import { MySQLAdherentRepository } from './repositories/AdherentRepository';
import { MongooseAvisRepository } from './repositories/AvisRepository';
import { createAdherentRouter } from './routes/adherent.routes';
import { createAvisRouter } from './routes/avis.routes';
import { createFilmRouter } from './routes/film.routes';
import { createHealthRouter } from './routes/health.routes';
import { createReservationRouter } from './routes/reservation.routes';
import { createSeanceRouter } from './routes/seance.routes';
import { ReservationService } from './services/ReservationService';
import { SeanceArchiveService } from './services/SeanceArchiveService';

async function bootstrap(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🚀 Démarrage du back-end CinéClub Réunion...');

  // --- 1. Connexion MySQL ---
  try {
    await testMySQL();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] ❌ Échec MySQL :', err);
    process.exit(1);
  }

  // --- 2. Connexion MongoDB ---
  try {
    await connectMongo();
    await pingMongo();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] ❌ Échec MongoDB :', err);
    // On ferme MySQL avant de quitter pour ne pas laisser de sockets ouverts.
    await closePool();
    process.exit(1);
  }

  // --- 3. Démarrage Express ---
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(rejectMongoOperators);

  const adherentRepository = new MySQLAdherentRepository();
  const avisRepository = new MongooseAvisRepository();
  const reservationService = new ReservationService();
  const seanceArchiveService = new SeanceArchiveService();

  const healthController = new HealthController();
  const adherentController = new AdherentController(adherentRepository);
  const avisController = new AvisController(avisRepository);
  const reservationController = new ReservationController(reservationService);
  const seanceController = new SeanceController(seanceArchiveService);

  app.use('/health', createHealthRouter(healthController));
  app.use('/adherents', createAdherentRouter(adherentController));
  app.use('/films', createFilmRouter(avisController));
  app.use('/avis', createAvisRouter(avisController));
  app.use('/reservations', createReservationRouter(reservationController));
  app.use('/seances', createSeanceRouter(seanceController));

  app.use(errorMiddleware);

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🎬 API CinéClub démarrée sur http://localhost:${port}`);
  });

  // --- 4. Shutdown gracieux ---
  // SIGINT = Ctrl+C en dev, SIGTERM = signal envoyé par Docker/k8s.
  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\n[${signal}] Arrêt en cours...`);
    server.close();
    await closePool();
    await closeMongo();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

// Lancement + gestion d'erreur globale non attrapée.
bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[bootstrap] Erreur fatale :', err);
  process.exit(1);
});
