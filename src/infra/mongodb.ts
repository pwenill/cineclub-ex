/**
 * src/infra/mongodb.ts
 * ------------------------------------------------------------------
 * Module d'infrastructure : connexion MongoDB via Mongoose.
 *
 * Pourquoi Mongoose plutôt que le driver natif ?
 *  - Schémas + validation côté applicatif (defense-in-depth avec Zod).
 *  - Hooks (pre/post save), populate, middleware standardisés.
 *  - Gestion automatique de la reconnexion + pool interne.
 *
 * Le compte applicatif cineclub_app a le rôle `readWrite` sur la base
 * `cineclub` uniquement (pas de `dbAdmin`, pas de `userAdmin`) =>
 * principe du moindre privilège.
 * ------------------------------------------------------------------
 */

import mongoose, { Mongoose } from 'mongoose';

/**
 * Récupère une variable d'environnement obligatoire.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[config] Variable d'environnement manquante : ${name}`);
  }
  return value;
}

/**
 * Attache les listeners d'événements Mongoose une seule fois.
 * Utile pour observer le cycle de vie de la connexion (dev, debug, prod).
 */
let listenersAttached = false;

function attachListeners(): void {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  const connection = mongoose.connection;

  connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[mongo] ✅ Connecté à MongoDB');
  });

  connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('[mongo] ⚠️  Déconnecté de MongoDB');
  });

  connection.on('reconnected', () => {
    // eslint-disable-next-line no-console
    console.log('[mongo] 🔄 Reconnecté à MongoDB');
  });

  connection.on('error', (err: Error) => {
    // eslint-disable-next-line no-console
    console.error('[mongo] ❌ Erreur de connexion :', err.message);
  });
}

/**
 * Établit la connexion MongoDB.
 * À appeler UNE SEULE FOIS au bootstrap de l'application (src/index.ts).
 *
 * @throws si la connexion échoue (mauvais URI, credentials invalides,
 *         serveur injoignable) -> le bootstrap doit s'arrêter (fail-fast).
 */
export async function connectMongo(): Promise<Mongoose> {
  const uri = requireEnv('MONGO_URI');
  const dbName = process.env.MONGO_DB_NAME ?? 'cineclub';

  // On attache les listeners AVANT connect() pour ne rien rater.
  attachListeners();

  // Mongoose >= 6 : bufferCommands=false évite que les requêtes soient
  // silencieusement mises en file d'attente si la DB est down.
  const instance = await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 5_000, // 5 s pour détecter un serveur down
    bufferCommands: false,
  });

  return instance;
}

/**
 * Ferme proprement la connexion (shutdown gracieux).
 */
export async function closeMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0 /* disconnected */) {
    await mongoose.disconnect();
    // eslint-disable-next-line no-console
    console.log('[mongo] Connexion fermée.');
  }
}

/**
 * Fonction utilitaire pour un healthcheck rapide.
 * Utilise la commande `ping` supportée par tous les MongoDB.
 */
export async function pingMongo(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('[mongo] Aucune base active, appelle connectMongo() d\'abord.');
  }
  await db.admin().ping();
  // eslint-disable-next-line no-console
  console.log('[mongo] 🏓 Ping OK');
}
