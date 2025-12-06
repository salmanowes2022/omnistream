/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * YouTube platform adapter (Integration Wrapper)
 * Wraps existing YouTube OAuth to integrate with unified platform system
 * DOES NOT rebuild or modify existing YouTube streaming functionality
 */

import { youtubeProvider } from '../../providers/youtube/index.js';
import { logger } from '../../utils/logger.js';
import { PlatformError } from '../../core/errors.js';
import axios from 'axios';

export interface YouTubeConnectionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  channelId: string;
  channelTitle: string;
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
}

export class YouTubeAdapter {
  /**
   * Get OAuth authorization URL (uses existing provider)
   */
  getAuthorizationUrl(userId: string, redirectUri: string): string {
    return youtubeProvider.getAuthUrl(userId, redirectUri);
  }

  /**
   * Handle OAuth callback and exchange code for tokens (uses existing provider)
   */
  async handleCallback(code: string, redirectUri: string): Promise<YouTubeConnectionData> {
    try {
      // Use existing YouTube provider to exchange code
      const tokens = await youtubeProvider.exchangeCodeForTokens(code, redirectUri);

      // Get channel information
      const channelInfo = await this.getChannelInfo(tokens.accessToken);

      logger.info('YouTube connection successful', {
        channelId: channelInfo.id,
        channelTitle: channelInfo.title,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || '',
        expiresAt: tokens.expiresAt,
        channelId: channelInfo.id,
        channelTitle: channelInfo.title,
      };
    } catch (error) {
      logger.error('YouTube callback handling failed', error);
      throw error;
    }
  }

  /**
   * Get YouTube channel information
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: 'snippet,contentDetails',
          mine: true,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new PlatformError('YouTube', 'No channel found for this account', 404);
      }

      const channel = response.data.items[0];

      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
      };
    } catch (error) {
      logger.error('YouTube channel info fetch failed', error);
      throw new PlatformError('YouTube', 'Failed to fetch channel info', 500, error);
    }
  }

  /**
   * Refresh expired tokens (uses existing provider)
   */
  async refreshTokens(refreshToken: string): Promise<YouTubeConnectionData> {
    try {
      const tokens = await youtubeProvider.refreshTokens(refreshToken);

      // Get updated channel info
      const channelInfo = await this.getChannelInfo(tokens.accessToken);

      logger.info('YouTube tokens refreshed successfully');

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || refreshToken,
        expiresAt: tokens.expiresAt,
        channelId: channelInfo.id,
        channelTitle: channelInfo.title,
      };
    } catch (error) {
      logger.error('YouTube token refresh failed', error);
      throw new PlatformError('YouTube', 'Failed to refresh tokens', 500, error);
    }
  }

  /**
   * Disconnect YouTube account
   * Note: Google doesn't provide a token revocation endpoint via OAuth client
   */
  async disconnect(accessToken: string): Promise<void> {
    try {
      // Revoke token via Google's revocation endpoint
      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: {
          token: accessToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      logger.info('YouTube account disconnected successfully');
    } catch (error) {
      logger.error('YouTube disconnect failed', error);
      // Don't throw - deletion should succeed even if revocation fails
    }
  }

  /**
   * Validate that a YouTube connection is still active
   */
  async validateConnection(accessToken: string): Promise<boolean> {
    try {
      await this.getChannelInfo(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Post to YouTube (not supported yet - YouTube doesn't have a direct "post" API)
   * YouTube Community Posts require manual creation through YouTube Studio
   * This is a stub for future implementation
   */
  post(params: {
    content: string;
    mediaUrl?: string;
    credentials: { accessToken: string; refreshToken?: string; extra?: unknown };
  }): Promise<{ status: string; error?: string }> {
    logger.info('YouTube post attempted but not supported', { content: params.content });
    return Promise.resolve({
      status: 'unsupported',
      error: 'YouTube direct posting is not yet supported. Use YouTube Studio for Community Posts.',
    });
  }

  /**
   * Schedule a YouTube live stream event
   */
  async scheduleEvent(params: {
    title: string;
    description?: string;
    scheduledAt: Date;
    credentials: { accessToken: string; refreshToken?: string };
  }): Promise<{ status: string; broadcastId?: string; error?: string }> {
    try {
      const { title, description, scheduledAt, credentials } = params;

      // Create a scheduled broadcast using YouTube Live API
      const response = await axios.post<{ id: string }>(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts',
        {
          snippet: {
            title,
            description: description || '',
            scheduledStartTime: scheduledAt.toISOString(),
          },
          status: {
            privacyStatus: 'public',
          },
          contentDetails: {
            enableAutoStart: false,
            enableAutoStop: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            part: 'snippet,status,contentDetails',
          },
        }
      );

      const broadcastId = response.data.id;

      logger.info('YouTube event scheduled successfully', { broadcastId, title, scheduledAt });

      return {
        status: 'scheduled',
        broadcastId,
      };
    } catch (error) {
      logger.error('YouTube event scheduling failed', error);
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { error?: { message?: string } })?.error?.message ||
          error.message;
        return {
          status: 'failed',
          error: `Failed to schedule YouTube event: ${message}`,
        };
      }
      return {
        status: 'failed',
        error: 'Failed to schedule YouTube event',
      };
    }
  }

  /**
   * Fetch chat messages from YouTube live chat (read-only)
   */
  async fetchChatMessages(
    liveChatId: string,
    accessToken: string,
    lastMessageTime?: Date
  ): Promise<Array<{
    id: string;
    streamId: string;
    platform: string;
    authorId: string;
    authorName: string;
    authorImageUrl?: string;
    message: string;
    timestamp: Date;
  }>> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/liveChat/messages', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          liveChatId,
          part: 'snippet,authorDetails',
          maxResults: 200,
        },
      });

      const messages = [];
      for (const item of response.data.items || []) {
        const publishedAt = new Date(item.snippet.publishedAt);

        if (lastMessageTime && publishedAt <= lastMessageTime) {
          continue;
        }

        messages.push({
          id: item.id,
          streamId: liveChatId,
          platform: 'youtube',
          authorId: item.authorDetails.channelId,
          authorName: item.authorDetails.displayName,
          authorImageUrl: item.authorDetails.profileImageUrl,
          message: item.snippet.displayMessage,
          timestamp: publishedAt,
        });
      }

      return messages;
    } catch (error) {
      logger.error('YouTube fetchChatMessages failed', error);
      return [];
    }
  }

  /**
   * Send chat message (not supported for YouTube)
   */
  async sendChatMessage(): Promise<{ status: 'unsupported' }> {
    return { status: 'unsupported' };
  }
}

export const youtubeAdapter = new YouTubeAdapter();
