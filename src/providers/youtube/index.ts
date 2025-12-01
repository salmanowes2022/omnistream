/**
 * YouTube streaming provider implementation
 * Uses YouTube Data API v3 and YouTube Live Streaming API
 */

import axios from 'axios';
import {
  ChatMessage,
  OAuthToken,
  Platform,
  PlatformStream,
  StreamConfig,
  StreamProvider,
  StreamStatus,
} from '../../core/interfaces.js';
import { PlatformError, UnsupportedFeatureError } from '../../core/errors.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

interface AxiosLikeError {
  response?: {
    data?: {
      error?: { message?: string; errors?: Array<{ message?: string }> } | string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

const parseYouTubeError = (error: unknown): string => {
  const err = error as AxiosLikeError;
  const apiErrorObj = (err.response?.data as { error?: any; message?: string } | undefined)?.error;
  const apiMessage =
    typeof apiErrorObj === 'string'
      ? apiErrorObj
      : apiErrorObj?.message ||
        (Array.isArray(apiErrorObj?.errors) ? apiErrorObj.errors[0]?.message : undefined);
  const message =
    apiMessage || (err.response?.data as { message?: string } | undefined)?.message || err.message;
  if (message) {
    return message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (err.response?.status) {
    return `HTTP ${err.response.status}`;
  }
  return 'Unknown YouTube error';
};

export class YouTubeProvider implements StreamProvider {
  readonly platform = Platform.YOUTUBE;

  private readonly YOUTUBE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

  getAuthUrl(communityId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: config.youtube.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope:
        'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl',
      access_type: 'offline',
      prompt: 'consent',
      state: communityId,
    });

    return `${this.YOUTUBE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthToken> {
    try {
      const response = await axios.post(this.YOUTUBE_TOKEN_URL, {
        code,
        client_id: config.youtube.clientId,
        client_secret: config.youtube.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in, scope } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scope: scope.split(' '),
      };
    } catch (error) {
      logger.error('YouTube token exchange failed', error);
      throw new PlatformError(
        'YouTube',
        'Failed to exchange authorization code for tokens',
        500,
        error
      );
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthToken> {
    try {
      const response = await axios.post(this.YOUTUBE_TOKEN_URL, {
        refresh_token: refreshToken,
        client_id: config.youtube.clientId,
        client_secret: config.youtube.clientSecret,
        grant_type: 'refresh_token',
      });

      const { access_token, expires_in, scope } = response.data;

      return {
        accessToken: access_token,
        refreshToken,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scope: scope ? scope.split(' ') : [],
      };
    } catch (error) {
      logger.error('YouTube token refresh failed', error);
      throw new PlatformError('YouTube', 'Failed to refresh tokens', 500, error);
    }
  }

  async createStream(
    communityId: string,
    config: StreamConfig,
    tokens: OAuthToken
  ): Promise<PlatformStream> {
    try {
      // Create a live broadcast
      const broadcastResponse = await axios.post(
        `${this.YOUTUBE_API_BASE}/liveBroadcasts`,
        {
          snippet: {
            title: config.title,
            description: config.description || '',
            scheduledStartTime: config.scheduledStartTime
              ? config.scheduledStartTime.toISOString()
              : new Date().toISOString(),
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: false,
            enableAutoStop: true,
          },
        },
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
          params: { part: 'snippet,status,contentDetails' },
        }
      );

      // Create a live stream
      const streamResponse = await axios.post(
        `${this.YOUTUBE_API_BASE}/liveStreams`,
        {
          snippet: {
            title: `${config.title} - Stream`,
          },
          cdn: {
            frameRate: 'variable',
            ingestionType: 'rtmp',
            resolution: 'variable',
          },
        },
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
          params: { part: 'snippet,cdn' },
        }
      );

      // Bind the broadcast to the stream
      const broadcastId = broadcastResponse.data.id;
      const streamId = streamResponse.data.id;

      await axios.post(`${this.YOUTUBE_API_BASE}/liveBroadcasts/bind`, null, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          id: broadcastId,
          streamId,
          part: 'id,snippet,status',
        },
      });

      // Extract RTMP ingestion info from the stream response
      const ingestionInfo = streamResponse.data.cdn?.ingestionInfo;
      const rtmpUrl = ingestionInfo?.ingestionAddress;
      const streamKey = ingestionInfo?.streamName;

      logger.info('YouTube stream created', {
        communityId,
        broadcastId,
        streamId,
        rtmpUrl,
      });

      return {
        platform: Platform.YOUTUBE,
        platformStreamId: broadcastId,
        streamUrl: `https://www.youtube.com/watch?v=${broadcastId}`,
        status: StreamStatus.SCHEDULED,
        rtmpUrl,
        streamKey,
        metadata: {
          youtubeStreamId: streamId,
          broadcastId,
        },
      };
    } catch (error) {
      const reason = parseYouTubeError(error);
      logger.error('YouTube stream creation failed', { error: reason });
      throw new PlatformError('YouTube', `Failed to create stream: ${reason}`, 500, error);
    }
  }

  async startStream(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream> {
    try {
      await axios.post(`${this.YOUTUBE_API_BASE}/liveBroadcasts/transition`, null, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          broadcastStatus: 'live',
          id: platformStreamId,
          part: 'status',
        },
      });

      logger.info('YouTube stream started', { platformStreamId });

      const liveUrl = `https://www.youtube.com/watch?v=${platformStreamId}`;

      return {
        platform: Platform.YOUTUBE,
        platformStreamId,
        streamUrl: liveUrl,
        liveUrl,
        status: StreamStatus.LIVE,
      };
    } catch (error) {
      const reason = parseYouTubeError(error);
      logger.error('YouTube stream start failed', { error: reason });
      throw new PlatformError('YouTube', `Failed to start stream: ${reason}`, 500, error);
    }
  }

  async stopStream(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream> {
    try {
      await axios.post(`${this.YOUTUBE_API_BASE}/liveBroadcasts/transition`, null, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          broadcastStatus: 'complete',
          id: platformStreamId,
          part: 'status',
        },
      });

      logger.info('YouTube stream stopped', { platformStreamId });

      return {
        platform: Platform.YOUTUBE,
        platformStreamId,
        status: StreamStatus.ENDED,
      };
    } catch (error) {
      const reason = parseYouTubeError(error);
      logger.error('YouTube stream stop failed', { error: reason });
      throw new PlatformError('YouTube', `Failed to stop stream: ${reason}`, 500, error);
    }
  }

  async getStreamStatus(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream> {
    try {
      const response = await axios.get(`${this.YOUTUBE_API_BASE}/liveBroadcasts`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          part: 'snippet,status,statistics',
          id: platformStreamId,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new PlatformError('YouTube', 'Stream not found', 404);
      }

      const broadcast = response.data.items[0];
      const lifeCycleStatus = broadcast.status.lifeCycleStatus;

      let status: StreamStatus;
      switch (lifeCycleStatus) {
        case 'created':
        case 'ready':
        case 'testing':
          status = StreamStatus.SCHEDULED;
          break;
        case 'live':
          status = StreamStatus.LIVE;
          break;
        case 'complete':
          status = StreamStatus.ENDED;
          break;
        default:
          status = StreamStatus.IDLE;
      }

      const watchUrl = `https://www.youtube.com/watch?v=${platformStreamId}`;

      return {
        platform: Platform.YOUTUBE,
        platformStreamId,
        streamUrl: watchUrl,
        liveUrl: status === StreamStatus.LIVE ? watchUrl : undefined,
        status,
        viewerCount: broadcast.statistics?.concurrentViewers
          ? parseInt(broadcast.statistics.concurrentViewers, 10)
          : undefined,
      };
    } catch (error) {
      const reason = parseYouTubeError(error);
      logger.error('YouTube stream status check failed', { error: reason });
      throw new PlatformError('YouTube', `Failed to get stream status: ${reason}`, 500, error);
    }
  }

  async getChatMessages(
    platformStreamId: string,
    tokens: OAuthToken,
    since?: Date
  ): Promise<ChatMessage[]> {
    try {
      // First get the live chat ID from the broadcast
      const broadcastResponse = await axios.get(`${this.YOUTUBE_API_BASE}/liveBroadcasts`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          part: 'snippet',
          id: platformStreamId,
        },
      });

      if (!broadcastResponse.data.items || broadcastResponse.data.items.length === 0) {
        return [];
      }

      const liveChatId = broadcastResponse.data.items[0].snippet.liveChatId;
      if (!liveChatId) {
        return [];
      }

      // Get chat messages
      const chatResponse = await axios.get(`${this.YOUTUBE_API_BASE}/liveChat/messages`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          liveChatId,
          part: 'snippet,authorDetails',
          maxResults: 200,
        },
      });

      const messages: ChatMessage[] = [];
      for (const item of chatResponse.data.items || []) {
        const publishedAt = new Date(item.snippet.publishedAt);
        if (since && publishedAt <= since) {
          continue;
        }

        messages.push({
          id: item.id,
          streamId: platformStreamId,
          platform: Platform.YOUTUBE,
          authorId: item.authorDetails.channelId,
          authorName: item.authorDetails.displayName,
          authorImageUrl: item.authorDetails.profileImageUrl,
          message: item.snippet.displayMessage,
          timestamp: publishedAt,
        });
      }

      return messages;
    } catch (error) {
      logger.error('YouTube chat messages fetch failed', error);
      throw new PlatformError('YouTube', 'Failed to get chat messages', 500, error);
    }
  }

  async highlightMessage(
    _platformStreamId: string,
    _messageId: string,
    _tokens: OAuthToken
  ): Promise<boolean> {
    // YouTube doesn't have a native "pin" or "highlight" feature via API
    // This would need to be implemented through Super Chat or other mechanisms
    throw new UnsupportedFeatureError('YouTube', 'message highlighting');
  }
}

export const youtubeProvider = new YouTubeProvider();
