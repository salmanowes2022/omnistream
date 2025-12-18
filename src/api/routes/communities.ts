/**
 * Community management routes
 */

import express, { NextFunction, Request, Response } from 'express';
import { db } from '../../database/index.js';
import { ValidationError } from '../../core/errors.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/v1/communities
 * Create a new community (requires authentication)
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      throw new ValidationError('Community name is required');
    }

    const community = await db.createCommunity(name, userId);

    res.status(201).json({
      success: true,
      data: community,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/communities
 * List all communities for the authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const communities = await db.listCommunitiesByUser(userId);

    res.json({
      success: true,
      data: communities,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
