import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | undefined;

export async function connectMongoMemory(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function disconnectMongoMemory(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer?.stop();
}

export async function clearMongoMemory(): Promise<void> {
  await mongoose.connection.dropDatabase();
}
