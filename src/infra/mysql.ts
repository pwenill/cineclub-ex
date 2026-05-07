/**
 * src/infra/mysql.ts
 * ------------------------------------------------------------------
 * Module d'infrastructure : connexion MySQL via un pool mysql2/promise.
 *
 * Principes :
 *  - Un pool (et non une connexion unique) pour supporter les requêtes
 *    concurrentes d'une API HTTP. Le pool réutilise les sockets TCP
 *    ouverts, ce qui évite le coût du handshake à chaque requête.
 *  - Les identifiants ne sont JAMAIS écrits en dur : ils viennent du .env
 *    (variables chargées par dotenv dans src/index.ts).
 *  - Le compte applicatif cineclub_app ne dispose que des privilèges
 *    SELECT / INSERT / UPDATE / DELETE (principe du moindre privilège,
 *    cf. OWASP A01 - Broken Access Control).
 * ------------------------------------------------------------------
 */

import mysql, { Pool, PoolOptions } from 'mysql2/promise';

/**
 * Récupère une variable d'environnement obligatoire.
 * Lève une erreur explicite si absente, pour éviter un démarrage silencieux
 * avec une config incomplète.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[config] Variable d'environnement manquante : ${name}`);
  }
  return value;
}

/**
 * Construit les options du pool à partir du .env.
 * On isole cette logique pour la rendre testable.
 */
function buildPoolOptions(): PoolOptions {
  return {
    host: requireEnv('MYSQL_HOST'),
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: requireEnv('MYSQL_USER'),
    password: requireEnv('MYSQL_PASSWORD'),
    database: requireEnv('MYSQL_DATABASE'),
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
    queueLimit: 0,
    // Sécurité : on désactive les multi-statements pour limiter les
    // injections SQL qui exploiteraient la concaténation de requêtes.
    multipleStatements: false,
    // Timezone UTC pour éviter les bugs de fuseau horaire (La Réunion = UTC+4).
    timezone: 'Z',
    // dateStrings évite les conversions implicites Date/JS qui causent
    // souvent des écarts de fuseau. On parse côté applicatif si besoin.
    dateStrings: false,
  };
}

/**
 * Pool exporté : singleton utilisé par les repositories.
 * Créé de façon paresseuse pour faciliter les tests unitaires.
 */
let poolInstance: Pool | null = null;

export function getPool(): Pool {
  if (poolInstance === null) {
    poolInstance = mysql.createPool(buildPoolOptions());
  }
  return poolInstance;
}

/**
 * Teste la connexion au démarrage de l'application.
 * Retourne une promesse qui se résout si la connexion fonctionne,
 * ou rejette avec un message explicite en cas d'échec.
 *
 * La requête `SELECT 1` est la convention pour un healthcheck :
 *  - elle est triviale (pas de table requise),
 *  - elle échoue si les credentials sont faux,
 *  - elle échoue si la DB cineclub n'existe pas / n'est pas accessible.
 */
export async function testConnection(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT 1 AS ok');
    // eslint-disable-next-line no-console
    console.log('[mysql] ✅ Connexion OK', rows);
  } finally {
    // Toujours relâcher la connexion dans le pool, même si query() a échoué.
    connection.release();
  }
}

/**
 * Ferme proprement le pool (utile pour les tests et le shutdown gracieux
 * via SIGTERM / SIGINT).
 */
export async function closePool(): Promise<void> {
  if (poolInstance !== null) {
    await poolInstance.end();
    poolInstance = null;
    // eslint-disable-next-line no-console
    console.log('[mysql] Pool fermé.');
  }
}
