/**
 * Unified Posting Routes
 * Handles posting content to multiple platforms
 */

import express, { NextFunction, Request, Response } from 'express';
import { platformService } from '../../core/services/platform-service.js';
import { ValidationError } from '../../core/errors.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { Platform } from '../../core/interfaces.js';
import type { PostRequest, PostResponse } from '../../types/post.js';

const router = express.Router();

/**
 * POST /api/v1/posts
 * Create a unified post across multiple platforms
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const { content, mediaUrl, platforms } = req.body as PostRequest;

    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new ValidationError('Content is required and must be a non-empty string');
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      throw new ValidationError('At least one platform must be specified');
    }

    // Validate platform values
    const validPlatforms = Object.values(Platform);
    const invalidPlatforms = platforms.filter((p) => !validPlatforms.includes(p));

    if (invalidPlatforms.length > 0) {
      throw new ValidationError(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
    }

    // Validate mediaUrl if provided
    if (mediaUrl && typeof mediaUrl !== 'string') {
      throw new ValidationError('Media URL must be a string');
    }

    // Post to all requested platforms
    const results = await platformService.postToMultiplePlatforms(
      userId,
      platforms,
      content,
      mediaUrl
    );

    // Determine overall success
    const hasPosted = Object.values(results).some((r) => r.status === 'posted');
    const hasFailed = Object.values(results).some((r) => r.status === 'failed');

    const response: PostResponse = {
      success: hasPosted,
      results,
    };

    // Return 207 Multi-Status if some succeeded and some failed
    // Return 200 OK if all succeeded
    // Return 500 if all failed
    const statusCode = hasFailed ? (hasPosted ? 207 : 500) : 200;

    res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
