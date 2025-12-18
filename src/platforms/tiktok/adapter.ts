/**
 * TikTok platform adapter
 * Handles TikTok Live RTMP streaming via manual credentials
 * TikTok does NOT use OAuth - users manually enter RTMP server and stream key
 * Supports ONLY streaming, no posting/scheduling/chat
 */

import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../core/errors.js';

export interface TikTokConnectionData {
  rtmpServer: string;
  streamKey: string;
}

export interface TikTokStreamConfig {
  rtmpUrl: string;
  streamKey: string;
}

export class TikTokAdapter {
  /**
   * Connect TikTok by validating and saving RTMP credentials
   * TikTok requires manual RTMP server URL and stream key from user
   */
  connect(rtmpServer: string, streamKey: string): Promise<TikTokConnectionData> {
    try {
      // Validate RTMP server format
      if (!rtmpServer || !rtmpServer.startsWith('rtmp://')) {
        throw new ValidationError(
          'Invalid RTMP server URL. Must start with rtmp:// (e.g., rtmp://push.tiktok.com/live)'
        );
      }

      // Validate stream key
      if (!streamKey || streamKey.trim().length === 0) {
        throw new ValidationError('Stream key cannot be empty');
      }

      logger.info('TikTok RTMP connection successful', {
        rtmpServer,
        streamKeyPreview: `${streamKey.substring(0, 8)}...`,
      });

      return Promise.resolve({
        rtmpServer: rtmpServer.trim(),
        streamKey: streamKey.trim(),
      });
    } catch (error) {
      logger.error('TikTok connection failed', error);
      throw error;
    }
  }

  /**
   * Disconnect TikTok - No server-side action needed
   */
  disconnect(): Promise<void> {
    // TikTok doesn't require token revocation for RTMP
    logger.info('TikTok RTMP connection disconnected');
    return Promise.resolve();
  }

  /**
   * Validate TikTok connection
   * Since TikTok uses manual RTMP credentials, we can only validate format
   * Actual connection validation happens during streaming
   */
  validateConnection(rtmpServer: string, streamKey: string): Promise<boolean> {
    try {
      if (!rtmpServer || !rtmpServer.startsWith('rtmp://')) {
        return Promise.resolve(false);
      }
      if (!streamKey || streamKey.trim().length === 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  /**
   * Get stream configuration for TikTok RTMP streaming
   * Returns the RTMP URL and stream key for FFmpeg relay
   */
  getStreamConfig(rtmpServer: string, streamKey: string): TikTokStreamConfig {
    return {
      rtmpUrl: rtmpServer,
      streamKey,
    };
  }

  /**
   * Post to TikTok - NOT SUPPORTED
   * TikTok Live is streaming-only, no posting API available
   */
  async post(_params: {
    content: string;
    mediaUrl?: string;
    credentials: { accessToken: string; refreshToken?: string; extra?: unknown };
  }): Promise<{ status: string; postId?: string; postUrl?: string; error?: string }> {
    logger.warn('TikTok posting is not supported - streaming only');

    return Promise.resolve({
      status: 'unsupported',
      error:
        'TikTok Live supports only RTMP streaming. Posting content is not available through the TikTok Live API.',
    });
  }

  /**
   * Schedule TikTok event - NOT SUPPORTED
   * TikTok Live does not provide scheduling API
   */
  scheduleEvent(_params: {
    title: string;
    description?: string;
    scheduledAt: Date;
    credentials: { accessToken: string; refreshToken?: string; extra?: unknown };
  }): Promise<{ status: string; broadcastId?: string; error?: string }> {
    logger.warn('TikTok event scheduling is not supported');

    return Promise.resolve({
      status: 'unsupported',
      error:
        'TikTok Live does not support event scheduling. You can start streaming directly using RTMP.',
    });
  }

  /**
   * Fetch chat messages - NOT SUPPORTED
   * TikTok Live API does not provide chat access for third-party apps
   */
  fetchChatMessages(): Promise<
    Array<{
      id: string;
      streamId: string;
      platform: string;
      authorId: string;
      authorName: string;
      authorImageUrl?: string;
      message: string;
      timestamp: Date;
    }>
  > {
    logger.debug('TikTok chat fetching is not supported');
    return Promise.resolve([]);
  }

  /**
   * Send chat message - NOT SUPPORTED
   * TikTok Live API does not provide chat access for third-party apps
   */
  sendChatMessage(): Promise<{ status: 'unsupported' }> {
    return Promise.resolve({ status: 'unsupported' });
  }
}

export const tiktokAdapter = new TikTokAdapter();
