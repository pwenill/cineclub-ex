/**
 * docker/mongo/init/01-init-cineclub.js
 * -----------------------------------------------------------------------------
 * Script exécuté AUTOMATIQUEMENT par l'image officielle mongo:7
 * au PREMIER démarrage du conteneur (quand /data/db est vide).
 *
 * Contexte d'exécution :
 *   - le script s'exécute via `mongosh` connecté en ROOT
 *     (MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD)
 *   - il a donc le droit de créer des users sur n'importe quelle base
 *
 * Variables lues (exportées via docker-compose depuis .env) :
 *   - MONGO_APP_USER       : login applicatif (par défaut "cineclub_app")
 *   - MONGO_APP_PASSWORD   : mot de passe applicatif
 *   - MONGO_INITDB_DATABASE: nom de la base (par défaut "cineclub")
 *
 * Principe du moindre privilège :
 *   - rôle `readWrite` sur la base cineclub UNIQUEMENT
 *   - pas de `dbAdmin`, pas de `userAdmin`, pas de `clusterAdmin`
 * -----------------------------------------------------------------------------
 */

// Les variables d'environnement du conteneur sont accessibles via process.env
// dans mongosh >= 2.0
const dbName   = process.env.MONGO_INITDB_DATABASE || 'cineclub';
const appUser  = process.env.MONGO_APP_USER        || 'cineclub_app';
const appPwd   = process.env.MONGO_APP_PASSWORD    || 'Cin3club!App2026';

print(`\n🎬 [init] Création du compte applicatif Mongo sur la base "${dbName}"...`);

// Bascule sur la base cible (créée implicitement à la 1re écriture)
db = db.getSiblingDB(dbName);

// Création du user applicatif avec un rôle minimaliste
db.createUser({
  user:  appUser,
  pwd:   appPwd,
  roles: [
    { role: 'readWrite', db: dbName },
  ],
});

print(`✅ [init] User "${appUser}" créé avec role readWrite sur "${dbName}".`);

// -----------------------------------------------------------------------------
// Collections + index minimaux (démo / prêts pour CP8 SC2)
// -----------------------------------------------------------------------------

// Collection `films` : miroir minimal des films SQL pour populate() et $lookup.
db.createCollection('films', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'titre', 'annee'],
      properties: {
        _id:   { bsonType: 'int', minimum: 1, description: 'id du film dans MySQL' },
        titre: { bsonType: 'string', maxLength: 255 },
        annee: { bsonType: 'int', minimum: 1888, maximum: 2100 },
      },
    },
  },
  validationLevel: 'strict',
  validationAction: 'error',
});

db.films.createIndex({ titre: 1 });

// Collection `avis` : avis utilisateurs sur les films.
db.createCollection('avis', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['filmId', 'adherentId', 'note', 'statut', 'createdAt', 'updatedAt'],
      properties: {
        filmId:     { bsonType: 'int',    minimum: 1, description: 'id du film dans MySQL (référence logique)' },
        adherentId: { bsonType: 'int',    minimum: 1, description: 'id de l\'adhérent dans MySQL' },
        note:       { bsonType: 'int',    minimum: 0, maximum: 5 },
        commentaire:{ bsonType: 'string', maxLength: 2000 },
        tags: {
          bsonType: 'array',
          maxItems: 10,
          items: { bsonType: 'string', maxLength: 30 },
        },
        photos: {
          bsonType: 'array',
          maxItems: 5,
          items: {
            bsonType: 'object',
            required: ['url'],
            properties: {
              url:     { bsonType: 'string', maxLength: 500 },
              legende: { bsonType: 'string', maxLength: 120 },
            },
          },
        },
        slug:      { bsonType: 'string', maxLength: 255 },
        statut:    { enum: ['publie', 'modere', 'masque'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  validationLevel: 'strict',
  validationAction: 'error',
});

// Index utiles
db.avis.createIndex({ filmId: 1, statut: 1, createdAt: -1 });
db.avis.createIndex({ adherentId: 1 });

// Jeu de données de démo
const now = new Date();
db.films.insertMany([
  { _id: NumberInt(1), titre: 'Le Fabuleux Destin d\'Amélie Poulain', annee: NumberInt(2001) },
  { _id: NumberInt(2), titre: 'Parasite', annee: NumberInt(2019) },
  { _id: NumberInt(3), titre: 'Interstellar', annee: NumberInt(2014) },
]);

db.avis.insertMany([
  {
    filmId: NumberInt(1), adherentId: NumberInt(1), note: NumberInt(5),
    commentaire: 'Amélie est poétique et profondément humain.',
    tags: ['poetique', 'classique'],
    photos: [],
    slug: 'le-fabuleux-destin-damelie-poulain',
    statut: 'publie',
    createdAt: now,
    updatedAt: now,
  },
  {
    filmId: NumberInt(2), adherentId: NumberInt(2), note: NumberInt(5),
    commentaire: 'Parasite mélange genres et critique sociale avec brio.',
    tags: ['thriller', 'social'],
    photos: [],
    slug: 'parasite',
    statut: 'publie',
    createdAt: now,
    updatedAt: now,
  },
]);

print(`✅ [init] Collections "films" et "avis" créées avec validators + documents de démo.`);
print(`\n🎉 [init] Base "${dbName}" prête pour CinéClub Réunion !\n`);
