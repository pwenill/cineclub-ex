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

import { createApp } from './app';
import { testConnection as testMySQL, closePool } from './infra/mysql';
import { connectMongo, closeMongo, pingMongo } from './infra/mongodb';
import { closeRedis } from './infra/redis';

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
  const app = createApp();

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
    await closeRedis();
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
