const dbName = process.env.MONGO_DB_NAME || 'cineclub';

db = db.getSiblingDB(dbName);

if (!db.getCollectionNames().includes('films')) {
  db.createCollection('films', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['_id', 'titre', 'annee'],
        properties: {
          _id: { bsonType: 'int', minimum: 1 },
          titre: { bsonType: 'string', maxLength: 255 },
          annee: { bsonType: 'int', minimum: 1888, maximum: 2100 },
        },
      },
    },
    validationLevel: 'strict',
    validationAction: 'error',
  });
}

db.films.updateOne(
  { _id: NumberInt(1) },
  { $set: { titre: 'Le Fabuleux Destin d\'Amélie Poulain', annee: NumberInt(2001) } },
  { upsert: true },
);
db.films.updateOne(
  { _id: NumberInt(2) },
  { $set: { titre: 'Parasite', annee: NumberInt(2019) } },
  { upsert: true },
);
db.films.updateOne(
  { _id: NumberInt(3) },
  { $set: { titre: 'Interstellar', annee: NumberInt(2014) } },
  { upsert: true },
);

db.films.createIndex({ titre: 1 });
db.avis.createIndex({ filmId: 1, statut: 1, createdAt: -1 });
db.avis.updateOne(
  { filmId: NumberInt(1), slug: { $exists: false } },
  { $set: { slug: 'le-fabuleux-destin-damelie-poulain' } },
);
db.avis.updateOne(
  { filmId: NumberInt(2), slug: { $exists: false } },
  { $set: { slug: 'parasite' } },
);

print('[migration sc4] films, index avis compose et slugs prets.');
