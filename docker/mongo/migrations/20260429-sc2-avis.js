const dbName = process.env.MONGO_INITDB_DATABASE || 'cineclub';
const targetDb = db.getSiblingDB(dbName);

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['filmId', 'adherentId', 'note', 'statut', 'createdAt', 'updatedAt'],
    properties: {
      filmId: { bsonType: 'int', minimum: 1 },
      adherentId: { bsonType: 'int', minimum: 1 },
      note: { bsonType: 'int', minimum: 0, maximum: 5 },
      commentaire: { bsonType: 'string', maxLength: 2000 },
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
            url: { bsonType: 'string', maxLength: 500 },
            legende: { bsonType: 'string', maxLength: 120 },
          },
        },
      },
      statut: { enum: ['publie', 'modere', 'masque'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

if (!targetDb.getCollectionNames().includes('avis')) {
  targetDb.createCollection('avis', {
    validator,
    validationLevel: 'strict',
    validationAction: 'error',
  });
} else {
  targetDb.runCommand({
    collMod: 'avis',
    validator,
    validationLevel: 'strict',
    validationAction: 'error',
  });
}

targetDb.avis.createIndex({ filmId: 1, createdAt: -1 });
targetDb.avis.createIndex({ adherentId: 1 });
