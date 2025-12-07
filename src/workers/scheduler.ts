/**
 * Background Scheduler Worker
 * Processes scheduled jobs at their scheduled time
 *
 * Supports:
 * - YouTube: Stream scheduling (native API support)
 * - Facebook: Post and stream scheduling (native API support)
 * - Instagram: Posts (via external scheduler)
 * - Twitter: Posts (via external scheduler)
 * - Telegram: Posts and messages (via external scheduler)
 */

import { prisma } from '../database/prisma-client.js';
import { userService } from '../core/services/user-service.js';
import { youtubeAdapter } from '../platforms/youtube/adapter.js';
import { facebookAdapter } from '../platforms/facebook/adapter.js';
import { instagramAdapter } from '../platforms/instagram/adapter.js';
import { twitterAdapter } from '../platforms/twitter/adapter.js';
import { telegramAdapter } from '../platforms/telegram/adapter.js';
import { Platform } from '../core/interfaces.js';
import { logger } from '../utils/logger.js';

const WORKER_INTERVAL = 30000; // 30 seconds
let isProcessing = false;

interface ScheduleEventResult {
  status: 'scheduled' | 'posted' | 'failed' | 'unsupported';
  broadcastId?: string;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Process a scheduled POST job
 */
async function processPostJob(
  platform: Platform,
  job: {
    userId: string;
    title: string | null;
    description: string | null;
    payload: string;
  }
): Promise<ScheduleEventResult> {
  try {
    // Get user's tokens for this platform
    const tokens = await userService.getPlatformTokens(job.userId, platform);

    if (!tokens) {
      return {
        status: 'failed',
        error: `Platform ${platform} is not connected`,
      };
    }

    const payload = JSON.parse(job.payload) as {
      content?: string;
      mediaUrl?: string;
    };

    const content = payload.content || job.description || job.title || 'Untitled Post';
    const mediaUrl = payload.mediaUrl;

    // Execute the post based on platform
    switch (platform) {
      case Platform.YOUTUBE: {
        // YouTube doesn't support community posts
        const result = await youtubeAdapter.post({
          content,
          mediaUrl,
          credentials: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || undefined,
            extra: tokens.extra || undefined,
          },
        });
        return result as ScheduleEventResult;
      }

      case Platform.FACEBOOK: {
        // Facebook supports native scheduling, but since we're already at the scheduled time,
        // we should post immediately
        const result = await facebookAdapter.post({
          content,
          mediaUrl,
          credentials: {
            accessToken: tokens.accessToken,
            extra: tokens.extra || undefined,
          },
        });
        return result as ScheduleEventResult;
      }

      case Platform.INSTAGRAM: {
        const result = await instagramAdapter.post({
          content,
          mediaUrl,
          credentials: {
            accessToken: tokens.accessToken,
            extra: tokens.extra || undefined,
          },
        });
        return result as ScheduleEventResult;
      }

      case Platform.TWITTER: {
        const result = await twitterAdapter.post({
          content,
          mediaUrl,
          credentials: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || undefined,
            extra: tokens.extra || undefined,
          },
        });
        return result as ScheduleEventResult;
      }

      case Platform.TELEGRAM: {
        const result = await telegramAdapter.post({
          content,
          mediaUrl,
          credentials: {
            accessToken: tokens.accessToken,
            extra: tokens.extra || undefined,
          },
        });
        return result as ScheduleEventResult;
      }

      default:
        return {
          status: 'unsupported',
          error: `Platform ${platform as string} is not supported for posting`,
        };
    }
  } catch (error) {
    logger.error('Error processing scheduled post', { platform, error });
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a scheduled STREAM job
 */
async function processStreamJob(
  platform: Platform,
  job: {
    userId: string;
    title: string;
    description: string | null;
    scheduledAt: Date;
    payload: string;
  }
): Promise<ScheduleEventResult> {
  try {
    // Get user's tokens for this platform
    const tokens = await userService.getPlatformTokens(job.userId, platform);

    if (!tokens) {
      return {
        status: 'failed',
        error: `Platform ${platform} is not connected`,
      };
    }

    const payload = JSON.parse(job.payload) as {
      streamId?: string;
    };

    // Execute stream scheduling based on platform
    switch (platform) {
      case Platform.YOUTUBE: {
        // YouTube supports native scheduled broadcasts
        const result = await youtubeAdapter.scheduleEvent({
          title: job.title,
          description: job.description || '',
          scheduledAt: job.scheduledAt,
          credentials: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || undefined,
          },
        });
        return result as ScheduleEventResult;
      }

      case Platform.FACEBOOK: {
        // Facebook supports scheduled live videos
        // However, we'll create the stream immediately and user will start it at scheduled time
        // This is because Facebook's scheduled_publish_time doesn't work for live videos

        // If there's a streamId in payload, we can update it
        // Otherwise, we need to create a new stream via streamService
        if (payload.streamId) {
          logger.info('Facebook scheduled stream - stream already created', {
            streamId: payload.streamId,
          });
          return {
            status: 'scheduled',
            broadcastId: payload.streamId,
          };
        } else {
          // Create stream immediately (user will start it at scheduled time)
          logger.warn('Facebook scheduled streams should be created via /streams endpoint first');
          return {
            status: 'failed',
            error:
              'Facebook scheduled streams require creating the stream first via /api/v1/streams',
          };
        }
      }

      case Platform.INSTAGRAM:
      case Platform.TWITTER:
      case Platform.TELEGRAM:
      case Platform.TIKTOK:
        return {
          status: 'unsupported',
          error: `${platform} does not support live streaming`,
        };

      default:
        return {
          status: 'unsupported',
          error: `Platform ${platform as string} is not supported for streaming`,
        };
    }
  } catch (error) {
    logger.error('Error processing scheduled stream', { platform, error });
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a single scheduled job
 */
async function processJob(jobId: string): Promise<void> {
  try {
    // Mark job as running
    await prisma.scheduledJob.update({
      where: { id: jobId },
      data: { status: 'running' },
    });

    // Get job details
    const job = await prisma.scheduledJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      logger.error('Job not found', { jobId });
      return;
    }

    const platforms = JSON.parse(job.platforms) as Platform[];
    const payload = JSON.parse(job.payload) as {
      title?: string;
      description?: string;
      content?: string;
      mediaUrl?: string;
      results?: Record<string, ScheduleEventResult>;
    };

    const results: Record<string, ScheduleEventResult> = {};

    logger.info('Processing scheduled job', {
      jobId,
      type: job.type,
      platforms,
      scheduledAt: job.scheduledAt,
    });

    // Process each platform
    for (const platform of platforms) {
      try {
        if (job.type === 'post') {
          // Process scheduled post
          results[platform] = await processPostJob(platform, job);
        } else if (job.type === 'stream') {
          // Process scheduled stream
          results[platform] = await processStreamJob(platform, {
            userId: job.userId,
            title: job.title || 'Untitled Stream',
            description: job.description,
            scheduledAt: job.scheduledAt,
            payload: job.payload,
          });
        } else {
          results[platform] = {
            status: 'failed',
            error: `Unknown job type: ${job.type}`,
          };
        }
      } catch (error) {
        logger.error('Error processing platform', { platform, error });
        results[platform] = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Determine overall status
    const hasSucceeded = Object.values(results).some(
      (r) => r.status === 'scheduled' || r.status === 'posted'
    );
    const hasFailed = Object.values(results).some((r) => r.status === 'failed');
    const finalStatus = hasSucceeded && !hasFailed ? 'done' : hasFailed ? 'failed' : 'done';

    // Update job with results
    await prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        payload: JSON.stringify({
          ...payload,
          results,
          executedAt: new Date().toISOString(),
        }),
      },
    });

    logger.info('Job processed successfully', { jobId, status: finalStatus, results });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Job processing failed', { jobId, error: errorMessage, stack: errorStack });

    // Mark job as failed
    try {
      await prisma.scheduledJob.update({
        where: { id: jobId },
        data: { status: 'failed' },
      });
    } catch (updateError) {
      logger.error('Failed to update job status', { jobId, updateError });
    }
  }
}

/**
 * Check for and process pending jobs
 */
async function processPendingJobs(): Promise<void> {
  if (isProcessing) {
    logger.debug('Already processing jobs, skipping this cycle');
    return;
  }

  isProcessing = true;

  try {
    const now = new Date();

    // Find jobs that are due
    const dueJobs = await prisma.scheduledJob.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lte: now,
        },
      },
      take: 10, // Process max 10 jobs per cycle
    });

    if (dueJobs.length === 0) {
      logger.debug('No pending jobs to process');
      return;
    }

    logger.info(`Processing ${dueJobs.length} pending jobs`);

    // Process jobs sequentially to avoid overwhelming APIs
    for (const job of dueJobs) {
      await processJob(job.id);
    }
  } catch (error) {
    logger.error('Error processing pending jobs', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the scheduler worker
 */
export function startScheduler(): void {
  logger.info('Starting scheduler worker', {
    interval: WORKER_INTERVAL,
    intervalSeconds: WORKER_INTERVAL / 1000,
  });

  // Run immediately on start
  void processPendingJobs();

  // Then run on interval
  setInterval(() => {
    void processPendingJobs();
  }, WORKER_INTERVAL);
}

/**
 * Stop the scheduler worker (for graceful shutdown)
 */
export function stopScheduler(): void {
  logger.info('Stopping scheduler worker');
  // Note: In production, you'd want to track the interval ID and clear it
}
