/**
 * Stream service - Business logic for managing streams across platforms
 */

import { Platform, PlatformStream, StreamConfig, StreamStatus } from '../interfaces.js';
import { db } from '../../database/index.js';
import { providerRegistry } from '../../providers/index.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../errors.js';

type HttpErrorItem = { message?: string };
type HttpErrorData = { error?: HttpErrorItem | HttpErrorItem[] | string; message?: string };
type HttpErrorLike = { response?: { data?: HttpErrorData; status?: number }; message?: string };

const isHttpErrorLike = (err: unknown): err is HttpErrorLike => {
  if (!err || typeof err !== 'object') return false;
  const maybeResponse = (err as { response?: unknown }).response;
  return !!maybeResponse && typeof maybeResponse === 'object';
};

const isHttpErrorData = (data: unknown): data is HttpErrorData =>
  !!data &&
  typeof data === 'object' &&
  ('error' in data || 'message' in data);

const extractApiMessage = (data?: HttpErrorData): string | undefined => {
  if (!data) return undefined;
  if (typeof data.error === 'string') {
    return data.error;
  }
  if (Array.isArray(data.error)) {
    return data.error.find((e) => e?.message)?.message;
  }
  if (data.error?.message) {
    return data.error.message;
  }
  return data.message;
};

const toErrorMessage = (err: unknown): string => {
  if (isHttpErrorLike(err)) {
    const apiData = isHttpErrorData(err.response?.data) ? err.response?.data : undefined;
    const apiMsg = extractApiMessage(apiData);
    if (apiMsg) {
      return apiMsg;
    }
    if (err.response?.status) {
      return `HTTP ${err.response.status}`;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Unknown error';
};

export class StreamService {
  private mergePlatformStream(
    existing: PlatformStream,
    updated: PlatformStream
  ): PlatformStream {
    return {
      ...existing,
      ...updated,
      streamUrl: updated.streamUrl ?? existing.streamUrl,
      rtmpUrl: updated.rtmpUrl ?? existing.rtmpUrl,
      streamKey: updated.streamKey ?? existing.streamKey,
      liveUrl: updated.liveUrl ?? updated.streamUrl ?? existing.liveUrl,
      metadata: updated.metadata ?? existing.metadata,
    };
  }

  /**
   * Create a new multi-platform stream
   */
  async createStream(
    communityId: string,
    streamData: {
      title: string;
      description?: string;
      scheduledStartTime?: Date;
      rtmpUrl: string;
      rtmpKey: string;
      platforms: Platform[];
    }
  ): Promise<{ stream: StreamConfig; platformStreams: PlatformStream[] }> {
    // Validate community exists
    await db.getCommunityById(communityId);

    // Validate platforms
    if (!streamData.platforms || streamData.platforms.length === 0) {
      throw new ValidationError('At least one platform must be specified');
    }

    // Create stream record
    const stream = await db.createStream({
      communityId,
      title: streamData.title,
      description: streamData.description,
      scheduledStartTime: streamData.scheduledStartTime,
      rtmpUrl: streamData.rtmpUrl,
      rtmpKey: streamData.rtmpKey,
      platforms: streamData.platforms,
    });

    // Create stream on each platform
    const platformStreams: PlatformStream[] = [];
    for (const platform of streamData.platforms) {
      try {
        const provider = providerRegistry.getProvider(platform);
        const tokens = await db.getOAuthTokens(communityId, platform);

        const platformStream = await provider.createStream(communityId, stream, tokens.tokens);
        await db.savePlatformStream(stream.id, platformStream);
        platformStreams.push(platformStream);

        logger.info('Platform stream created', {
          streamId: stream.id,
          platform,
          platformStreamId: platformStream.platformStreamId,
        });
      } catch (error) {
        logger.error(`Failed to create stream on ${platform}`, error);
        // Persist the failure so UI can surface it
        const errorMessage = toErrorMessage(error);
        const failed: PlatformStream = {
          platform,
          platformStreamId: '',
          status: StreamStatus.ERROR,
          error: errorMessage,
        };
        await db.savePlatformStream(stream.id, failed);
        platformStreams.push(failed);
      }
    }

    return { stream, platformStreams };
  }

  /**
   * Start a stream on all platforms
   */
  async startStream(
    streamId: string,
    communityId: string
  ): Promise<{ stream: StreamConfig; platformStreams: PlatformStream[] }> {
    const stream = await db.getStream(streamId);

    // Verify ownership
    if (stream.communityId !== communityId) {
      throw new NotFoundError('Stream not found');
    }

    const platformStreams = await db.getPlatformStreams(streamId);
    const results: PlatformStream[] = [];

    for (const platformStream of platformStreams) {
      try {
        if (!platformStream.platformStreamId) {
          const missingId = {
            ...platformStream,
            status: StreamStatus.ERROR,
            error:
              platformStream.error ||
              'Platform stream not created yet. Please recreate the stream.',
          };
          await db.savePlatformStream(streamId, missingId);
          results.push(missingId);
          continue;
        }

        // Mark as starting for UI feedback
        const startingState = this.mergePlatformStream(platformStream, {
          platform: platformStream.platform,
          platformStreamId: platformStream.platformStreamId,
          status: StreamStatus.STARTING,
        });
        await db.savePlatformStream(streamId, startingState);

        const provider = providerRegistry.getProvider(platformStream.platform);
        const tokens = await db.getOAuthTokens(communityId, platformStream.platform);

        const updated = await provider.startStream(platformStream.platformStreamId, tokens.tokens);
        const merged = this.mergePlatformStream(startingState, updated);

        await db.savePlatformStream(streamId, merged);
        results.push(merged);

        logger.info('Platform stream started', {
          streamId,
          platform: platformStream.platform,
        });
      } catch (error) {
        logger.error(`Failed to start stream on ${platformStream.platform}`, error);
        const errorMessage = toErrorMessage(error);
        const errored = {
          ...platformStream,
          status: StreamStatus.ERROR,
          error: errorMessage,
        };
        await db.savePlatformStream(streamId, errored);
        results.push(errored);
      }
    }

    return { stream, platformStreams: results };
  }

  /**
   * Stop a stream on all platforms
   */
  async stopStream(
    streamId: string,
    communityId: string
  ): Promise<{ stream: StreamConfig; platformStreams: PlatformStream[] }> {
    const stream = await db.getStream(streamId);

    if (stream.communityId !== communityId) {
      throw new NotFoundError('Stream not found');
    }

    const platformStreams = await db.getPlatformStreams(streamId);
    const results: PlatformStream[] = [];

    for (const platformStream of platformStreams) {
      try {
        const provider = providerRegistry.getProvider(platformStream.platform);
        const tokens = await db.getOAuthTokens(communityId, platformStream.platform);

        if (!platformStream.platformStreamId) {
          const missingId = {
            ...platformStream,
            status: StreamStatus.ERROR,
            error:
              platformStream.error ||
              'Platform stream not created yet. Please recreate the stream.',
          };
          await db.savePlatformStream(streamId, missingId);
          results.push(missingId);
          continue;
        }

        const updated = await provider.stopStream(platformStream.platformStreamId, tokens.tokens);
        const merged = this.mergePlatformStream(platformStream, updated);
        await db.savePlatformStream(streamId, merged);
        results.push(merged);

        logger.info('Platform stream stopped', {
          streamId,
          platform: platformStream.platform,
        });
      } catch (error) {
        logger.error(`Failed to stop stream on ${platformStream.platform}`, error);
        const errorMessage = toErrorMessage(error);
        const errored = {
          ...platformStream,
          status: StreamStatus.ERROR,
          error: errorMessage,
        };
        await db.savePlatformStream(streamId, errored);
        results.push(errored);
      }
    }

    return { stream, platformStreams: results };
  }

  /**
   * Get stream status from all platforms
   */
  async getStreamStatus(
    streamId: string,
    communityId: string
  ): Promise<{ stream: StreamConfig; platformStreams: PlatformStream[] }> {
    const stream = await db.getStream(streamId);

    if (stream.communityId !== communityId) {
      throw new NotFoundError('Stream not found');
    }

    const platformStreams = await db.getPlatformStreams(streamId);
    const results: PlatformStream[] = [];

    for (const platformStream of platformStreams) {
      try {
        const provider = providerRegistry.getProvider(platformStream.platform);
        const tokens = await db.getOAuthTokens(communityId, platformStream.platform);

        if (!platformStream.platformStreamId) {
          const missingId = {
            ...platformStream,
            status: StreamStatus.ERROR,
            error:
              platformStream.error ||
              'Platform stream not created yet. Please recreate the stream.',
          };
          await db.savePlatformStream(streamId, missingId);
          results.push(missingId);
          continue;
        }

        const updated = await provider.getStreamStatus(
          platformStream.platformStreamId,
          tokens.tokens
        );
        const merged = this.mergePlatformStream(platformStream, updated);
        await db.savePlatformStream(streamId, merged);
        results.push(merged);
      } catch (error) {
        logger.error(`Failed to get stream status on ${platformStream.platform}`, error);
        const errorMessage = toErrorMessage(error);
        const errored = {
          ...platformStream,
          status: StreamStatus.ERROR,
          error: errorMessage,
        };
        await db.savePlatformStream(streamId, errored);
        results.push(errored);
      }
    }

    return { stream, platformStreams: results };
  }

  /**
   * List all streams for a community
   */
  async listStreams(communityId: string): Promise<StreamConfig[]> {
    await db.getCommunityById(communityId);
    return db.listStreamsByCommunity(communityId);
  }

  getStreamByRtmpKey(rtmpKey: string): Promise<StreamConfig | null> {
    return db.getStreamByRtmpKey(rtmpKey);
  }

  /**
   * Delete a stream
   */
  async deleteStream(streamId: string, communityId: string): Promise<void> {
    const stream = await db.getStream(streamId);

    if (stream.communityId !== communityId) {
      throw new NotFoundError('Stream not found');
    }

    await db.deleteStream(streamId);
    logger.info('Stream deleted', { streamId, communityId });
  }
}

export const streamService = new StreamService();
