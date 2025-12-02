import type { NextFunction, Request, Response } from 'express';

import { verifyToken } from '../../core/auth/jwt.js';
import { UnauthorizedError } from '../../core/errors.js';
import type { JWTPayload } from '../../types/auth.js';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format. Expected: Bearer <token>');
    }

    const token = parts[1];
    const decoded = verifyToken(token);

    (req as AuthRequest).user = decoded;

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = verifyToken(token);
      (req as AuthRequest).user = decoded;
    }

    next();
  } catch {
    next();
  }
}
