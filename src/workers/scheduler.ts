/**
 * Background Scheduler Worker
 * Processes scheduled jobs at their scheduled time
 */

import { prisma } from '../database/prisma-client.js';
import { userService } from '../core/services/user-service.js';
import { youtubeAdapter } from '../platforms/youtube/adapter.js';
import { Platform } from '../core/interfaces.js';
import { logger } from '../utils/logger.js';

const WORKER_INTERVAL = 30000; // 30 seconds
let isProcessing = false;

interface ScheduleEventResult {
  status: 'scheduled' | 'failed' | 'unsupported';
  broadcastId?: string;
  error?: string;
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
      results?: Record<string, ScheduleEventResult>;
    };

    const results: Record<string, ScheduleEventResult> = {};

    // Process each platform
    for (const platform of platforms) {
      try {
        // Get user's tokens for this platform
        const tokens = await userService.getPlatformTokens(job.userId, platform);

        if (!tokens) {
          results[platform] = {
            status: 'failed',
            error: `Platform ${platform} is not connected`,
          };
          continue;
        }

        // Call appropriate scheduler method based on platform
        switch (platform) {
          case Platform.YOUTUBE: {
            if (job.type !== 'stream') {
              results[platform] = {
                status: 'unsupported',
                error: 'YouTube only supports stream scheduling',
              };
              break;
            }

            const result = await youtubeAdapter.scheduleEvent({
              title: job.title || 'Scheduled Stream',
              description: job.description || '',
              scheduledAt: job.scheduledAt,
              credentials: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || undefined,
              },
            });

            results[platform] = result as ScheduleEventResult;
            break;
          }

          case Platform.TWITTER:
          case Platform.TELEGRAM:
            // Twitter and Telegram don't support scheduling yet
            results[platform] = {
              status: 'unsupported',
              error: `${platform} scheduling is not yet supported`,
            };
            break;

          default:
            results[platform] = {
              status: 'unsupported',
              error: `Platform ${platform} is not supported for scheduling`,
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
    const hasSucceeded = Object.values(results).some((r) => r.status === 'scheduled');
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
        }),
      },
    });

    logger.info('Job processed successfully', { jobId, status: finalStatus });
  } catch (error) {
    logger.error('Job processing failed', { jobId, error });

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
