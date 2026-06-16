import express, { Express } from 'express';

import { AdherentController } from './controllers/AdherentController';
import { AvisController } from './controllers/AvisController';
import { FilmController } from './controllers/FilmController';
import { HealthController } from './controllers/HealthController';
import { ReservationController } from './controllers/ReservationController';
import { SeanceController } from './controllers/SeanceController';
import { errorMiddleware } from './middlewares/error.middleware';
import { rejectMongoOperators } from './middlewares/rejectMongoOperators.middleware';
import { AdherentRepository, MySQLAdherentRepository } from './repositories/AdherentRepository';
import { AvisRepository, MongooseAvisRepository } from './repositories/AvisRepository';
import { CachedFilmRepository } from './repositories/CachedFilmRepository';
import { FilmRepository, MySQLFilmRepository } from './repositories/FilmRepository';
import { createAdminRouter } from './routes/admin.routes';
import { createAdherentRouter } from './routes/adherent.routes';
import { createAvisRouter } from './routes/avis.routes';
import { createFilmRouter } from './routes/film.routes';
import { createHealthRouter } from './routes/health.routes';
import { createReservationRouter } from './routes/reservation.routes';
import { createSeanceRouter } from './routes/seance.routes';
import { ReservationService } from './services/ReservationService';
import { SeanceArchiveService } from './services/SeanceArchiveService';

export interface CreateAppOptions {
  adherentRepository?: AdherentRepository;
  filmRepository?: FilmRepository;
  avisRepository?: AvisRepository;
  cachedFilmRepository?: CachedFilmRepository;
  reservationService?: ReservationService;
  seanceArchiveService?: SeanceArchiveService;
  jwtSecret?: string;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(rejectMongoOperators);

  const adherentRepository = options.adherentRepository ?? new MySQLAdherentRepository();
  const filmRepository = options.filmRepository ?? new MySQLFilmRepository();
  const avisRepository = options.avisRepository ?? new MongooseAvisRepository();
  const cachedFilmRepository =
    options.cachedFilmRepository ?? new CachedFilmRepository(avisRepository);
  const reservationService = options.reservationService ?? new ReservationService();
  const seanceArchiveService = options.seanceArchiveService ?? new SeanceArchiveService();

  const healthController = new HealthController();
  const adherentController = new AdherentController(adherentRepository);
  const filmController = new FilmController(filmRepository);
  const avisController = new AvisController(avisRepository, cachedFilmRepository);
  const reservationController = new ReservationController(reservationService);
  const seanceController = new SeanceController(seanceArchiveService);

  app.use('/health', createHealthRouter(healthController));
  app.use('/adherents', createAdherentRouter(adherentController));
  app.use('/films', createFilmRouter(filmController, avisController));
  app.use('/avis', createAvisRouter(avisController));
  app.use('/reservations', createReservationRouter(reservationController));
  app.use('/seances', createSeanceRouter(seanceController));
  app.use('/admin', createAdminRouter(options.jwtSecret));

  app.use(errorMiddleware);

  return app;
}
