import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

type UserRole = 'admin' | 'user';

interface AuthenticatedUser {
  id: number;
  role: UserRole;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function getBearerToken(req: Request): string | null {
  const authorization = req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
}

function toAuthenticatedUser(payload: string | JwtPayload): AuthenticatedUser | null {
  if (typeof payload === 'string') {
    return null;
  }

  const id = Number(payload.id);
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  return {
    id,
    role: payload.role === 'admin' ? 'admin' : 'user',
  };
}

export function authenticateToken(jwtSecret = process.env.JWT_SECRET ?? 'test-secret'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ message: 'Token manquant.' });
      return;
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      const user = toAuthenticatedUser(payload);
      if (!user) {
        res.status(401).json({ message: 'Token invalide.' });
        return;
      }

      (req as AuthenticatedRequest).user = user;
      next();
    } catch (_error) {
      res.status(401).json({ message: 'Token invalide ou expire.' });
    }
  };
}

export function requireRole(role: UserRole): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== role) {
      res.status(403).json({ message: 'Acces refuse.' });
      return;
    }

    next();
  };
}
