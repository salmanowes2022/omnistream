/**
 * User authentication routes (register, login, me, logout)
 */

import express, { NextFunction, Request, Response } from 'express';
import { userService } from '../../core/services/user-service.js';
import { ValidationError } from '../../core/errors.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { Platform } from '../../core/interfaces.js';

const router = express.Router();

/**
 * POST /api/v1/user-auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const result = await userService.register({ email, password });

    logger.info('User registration successful', { userId: result.user.id });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/user-auth/login
 * Login a user
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const result = await userService.login({ email, password });

    logger.info('User login successful', { userId: result.user.id });

    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/user-auth/me
 * Get current user information (requires authentication)
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      throw new ValidationError('User not found');
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/user-auth/logout
 * Logout (client-side token deletion, server just acknowledges)
 */
router.post('/logout', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    logger.info('User logout', { userId });

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/user-auth/platforms
 * Get all connected platforms for current user
 */
router.get('/platforms', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const platforms = await userService.getConnectedPlatforms(userId);

    res.json({
      success: true,
      data: {
        platforms,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/user-auth/platforms/connect
 * Connect a social platform (generic endpoint)
 */
router.post(
  '/platforms/connect',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      const { platform, accessToken, refreshToken, expiresAt, extra } = req.body;

      if (!platform || !accessToken) {
        throw new ValidationError('Platform and accessToken are required');
      }

      const socialAccount = await userService.connectPlatform({
        userId,
        platform,
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        extra,
      });

      res.json({
        success: true,
        data: {
          socialAccount: {
            id: socialAccount.id,
            platform: socialAccount.platform,
            expiresAt: socialAccount.expiresAt,
            createdAt: socialAccount.createdAt,
            updatedAt: socialAccount.updatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/user-auth/platforms/:platform
 * Disconnect a platform
 */
router.delete(
  '/platforms/:platform',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      const { platform } = req.params;

      if (!platform) {
        throw new ValidationError('Platform parameter is required');
      }

      await userService.disconnectPlatform(userId, platform as Platform);

      res.json({
        success: true,
        data: {
          message: `${platform} disconnected successfully`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
