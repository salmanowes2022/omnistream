/**
 * Unified Scheduling Routes
 * Handles event scheduling across platforms
 */

import express, { NextFunction, Request, Response } from 'express';
import { prisma } from '../../database/prisma-client.js';
import { ValidationError } from '../../core/errors.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { Platform } from '../../core/interfaces.js';
import type { ScheduleRequest, ScheduleResponse } from '../../types/schedule.js';
import {
  filterPlatformsByCapability,
  getUnsupportedPlatforms,
} from '../../utils/platform-capabilities.js';

const router = express.Router();

/**
 * POST /api/v1/schedule
 * Create a scheduled job
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const { platforms, type, title, description, scheduledAt, content, mediaUrl } =
      req.body as ScheduleRequest;

    // Validate input
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      throw new ValidationError('At least one platform must be specified');
    }

    if (!type || !['stream', 'post'].includes(type)) {
      throw new ValidationError('Type must be either "stream" or "post"');
    }

    if (!scheduledAt) {
      throw new ValidationError('scheduledAt is required');
    }

    // For posts, require content
    if (type === 'post' && !content && !description) {
      throw new ValidationError('Content or description is required for posts');
    }

    // Parse and validate scheduledAt date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new ValidationError('Invalid scheduledAt date format');
    }

    // Check if date is in the future
    if (scheduledDate <= new Date()) {
      throw new ValidationError('scheduledAt must be a future date');
    }

    // Validate platforms
    const validPlatforms = Object.values(Platform);
    const invalidPlatforms = platforms.filter((p) => !validPlatforms.includes(p));

    if (invalidPlatforms.length > 0) {
      throw new ValidationError(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
    }

    // Check platform capabilities and filter unsupported
    const capability = type === 'post' ? 'posting' : 'scheduling';
    const supportedPlatforms = filterPlatformsByCapability(platforms, capability);
    const unsupported = getUnsupportedPlatforms(platforms, capability);

    if (unsupported.length > 0) {
      throw new ValidationError(
        `The following platforms don't support ${type === 'post' ? 'posting' : 'scheduled events'}: ${unsupported.join(', ')}`
      );
    }

    // Create scheduled job
    const job = await prisma.scheduledJob.create({
      data: {
        userId,
        platforms: JSON.stringify(supportedPlatforms),
        type,
        title: title || null,
        description: description || null,
        scheduledAt: scheduledDate,
        payload: JSON.stringify({
          title,
          description,
          content: content || description, // Use content if provided, otherwise use description
          mediaUrl: mediaUrl || undefined,
          results: {},
        }),
        status: 'pending',
      },
    });

    const response: ScheduleResponse = {
      success: true,
      jobId: job.id,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/schedule
 * Get user's scheduled jobs
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    // Fetch jobs for current user, sorted by scheduledAt
    const jobs = await prisma.scheduledJob.findMany({
      where: {
        userId,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Transform jobs to include parsed platforms and payload
    const transformedJobs = jobs.map((job) => ({
      id: job.id,
      platforms: JSON.parse(job.platforms) as Platform[],
      type: job.type,
      title: job.title,
      description: job.description,
      scheduledAt: job.scheduledAt,
      status: job.status,
      payload: JSON.parse(job.payload) as Record<string, unknown>,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    res.json({
      success: true,
      jobs: transformedJobs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
