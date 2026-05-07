/**
 * src/index.ts
 * ------------------------------------------------------------------
 * Point d'entrée de l'application (bootstrap).
 *
 * Séquence de démarrage (fail-fast) :
 *   1. Chargement des variables d'environnement (.env)
 *   2. Connexion MySQL        -> testConnection()
 *   3. Connexion MongoDB      -> connectMongo()
 *   4. Démarrage du serveur Express uniquement si 2 + 3 réussissent
 *
 * Si une des deux connexions échoue, on log l'erreur et on quitte avec
 * process.exit(1) pour que l'orchestrateur (systemd / Docker / PM2)
 * redémarre le conteneur. On ne démarre JAMAIS Express avec une DAL HS.
 * ------------------------------------------------------------------
 */

import 'dotenv/config';
import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

import { toAdherentResponseDTO } from './dtos/adherent.dto';
import { toAvisResponseDTO } from './dtos/avis.dto';
import { testConnection as testMySQL, closePool } from './infra/mysql';
import { connectMongo, closeMongo, pingMongo } from './infra/mongodb';
import {
  DuplicateAdherentEmailError,
  MySQLAdherentRepository,
} from './repositories/AdherentRepository';
import { MongooseAvisRepository } from './repositories/AvisRepository';
import {
  AdherentIdParamSchema,
  CreateAdherentSchema,
  UpdateAdherentSchema,
} from './schemas/adherent.schema';
import {
  AvisIdParamSchema,
  CreateAvisBodySchema,
  FilmIdParamSchema,
  UpdateAvisSchema,
} from './schemas/avis.schema';

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

function sendZodError(res: Response, error: ZodError): void {
  res.status(400).json({
    message: 'Donnees invalides.',
    errors: error.flatten(),
  });
}

function containsUnsafeMongoKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsUnsafeMongoKey);
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, nestedValue]) => {
      return key.startsWith('$') || key.includes('.') || containsUnsafeMongoKey(nestedValue);
    });
  }

  return false;
}

function rejectMongoOperators(req: Request, res: Response, next: NextFunction): void {
  if (req.body !== undefined && containsUnsafeMongoKey(req.body)) {
    res.status(400).json({
      message: 'Donnees invalides : cle MongoDB interdite.',
    });
    return;
  }

  next();
}

interface HttpParseError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

function isHttpParseError(err: unknown): err is HttpParseError {
  return err instanceof Error && ('status' in err || 'statusCode' in err || 'type' in err);
}

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

  // Endpoint de santé : très utile pour un load balancer / Kubernetes.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      mysql: 'connected',
      mongodb: 'connected',
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    '/adherents',
    asyncRoute(async (_req, res) => {
      const adherents = await adherentRepository.findAll();
      res.json({
        data: adherents.map(toAdherentResponseDTO),
      });
    }),
  );

  app.get(
    '/adherents/:id',
    asyncRoute(async (req, res) => {
      const parsedParams = AdherentIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const adherent = await adherentRepository.findById(parsedParams.data.id);
      if (!adherent) {
        res.status(404).json({ message: 'Adherent introuvable.' });
        return;
      }

      res.json({ data: toAdherentResponseDTO(adherent) });
    }),
  );

  app.post(
    '/adherents',
    asyncRoute(async (req, res) => {
      console.log(req.body)
      const parsedBody = CreateAdherentSchema.safeParse(req.body);
      if (!parsedBody.success) {
        sendZodError(res, parsedBody.error);
        return;
      }

      const adherent = await adherentRepository.create(parsedBody.data);
      res.status(201).json({ data: toAdherentResponseDTO(adherent) });
    }),
  );

  app.put(
    '/adherents/:id',
    asyncRoute(async (req, res) => {
      const parsedParams = AdherentIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const parsedBody = UpdateAdherentSchema.safeParse(req.body);
      if (!parsedBody.success) {
        sendZodError(res, parsedBody.error);
        return;
      }

      const adherent = await adherentRepository.update(parsedParams.data.id, parsedBody.data);
      if (!adherent) {
        res.status(404).json({ message: 'Adherent introuvable.' });
        return;
      }

      res.json({ data: toAdherentResponseDTO(adherent) });
    }),
  );

  app.delete(
    '/adherents/:id',
    asyncRoute(async (req, res) => {
      const parsedParams = AdherentIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const deleted = await adherentRepository.delete(parsedParams.data.id);
      if (!deleted) {
        res.status(404).json({ message: 'Adherent introuvable.' });
        return;
      }

      res.status(204).send();
    }),
  );

  app.get(
    '/films/:id/avis',
    asyncRoute(async (req, res) => {
      const parsedParams = FilmIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const avis = await avisRepository.findAllByFilm(parsedParams.data.id);
      res.json({
        data: avis.map(toAvisResponseDTO),
      });
    }),
  );

  app.post(
    '/films/:id/avis',
    asyncRoute(async (req, res) => {
      const parsedParams = FilmIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const parsedBody = CreateAvisBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        sendZodError(res, parsedBody.error);
        return;
      }

      const avis = await avisRepository.create({
        ...parsedBody.data,
        filmId: parsedParams.data.id,
      });
      res.status(201).json({ data: toAvisResponseDTO(avis) });
    }),
  );

  app.get(
    '/avis/:id',
    asyncRoute(async (req, res) => {
      const parsedParams = AvisIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const avis = await avisRepository.findById(parsedParams.data.id);
      if (!avis) {
        res.status(404).json({ message: 'Avis introuvable.' });
        return;
      }

      res.json({ data: toAvisResponseDTO(avis) });
    }),
  );

  app.put(
    '/avis/:id',
    asyncRoute(async (req, res) => {
      const parsedParams = AvisIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const parsedBody = UpdateAvisSchema.safeParse(req.body);
      if (!parsedBody.success) {
        sendZodError(res, parsedBody.error);
        return;
      }

      const avis = await avisRepository.update(parsedParams.data.id, parsedBody.data);
      if (!avis) {
        res.status(404).json({ message: 'Avis introuvable.' });
        return;
      }

      res.json({ data: toAvisResponseDTO(avis) });
    }),
  );

  app.delete(
    '/avis/:id',
    asyncRoute(async (req, res) => {
      const parsedParams = AvisIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        sendZodError(res, parsedParams.error);
        return;
      }

      const avis = await avisRepository.remove(parsedParams.data.id);
      if (!avis) {
        res.status(404).json({ message: 'Avis introuvable.' });
        return;
      }

      res.status(204).send();
    }),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isHttpParseError(err) && (err.status === 400 || err.statusCode === 400)) {
      res.status(400).json({ message: 'JSON invalide.' });
      return;
    }

    if (err instanceof DuplicateAdherentEmailError) {
      res.status(409).json({ message: err.message });
      return;
    }

    if (err instanceof Error && err.name === 'ValidationError') {
      res.status(400).json({ message: err.message });
      return;
    }

    // eslint-disable-next-line no-console
    console.error('[api] Erreur non geree :', err);
    res.status(500).json({ message: 'Erreur interne serveur.' });
  });

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
