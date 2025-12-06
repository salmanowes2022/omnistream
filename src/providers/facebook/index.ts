/**
 * Facebook streaming provider implementation
 * Uses Facebook Graph API for Live Video
 *
 * IMPORTANT: Facebook Live API requires Meta App Review and Business Verification
 * - Personal/development apps cannot request publish_video and pages_manage_metadata permissions
 * - Attempting to add these permissions may result in Meta blocking the developer account
 * - The Live API will return permissions errors until the app undergoes Meta's business verification
 * - This is standard Meta policy for production apps - see: https://developers.facebook.com/docs/app-review
 *
 * The code below is production-ready but can only be tested with an approved business app.
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

export class FacebookProvider implements StreamProvider {
  readonly platform = Platform.FACEBOOK;

  private readonly FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
  private readonly FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private readonly FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0';

  getAuthUrl(communityId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: config.facebook.appId,
      redirect_uri: redirectUri,
      scope: [
        'pages_manage_posts',
        'pages_read_engagement',
        'pages_manage_engagement',
        'pages_show_list',
        'publish_video',
        'pages_manage_metadata', // Required for page metadata
        'pages_read_user_content', // Required to read page content
      ].join(','),
      state: communityId,
    });

    return `${this.FACEBOOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthToken> {
    try {
      const response = await axios.get(this.FACEBOOK_TOKEN_URL, {
        params: {
          client_id: config.facebook.appId,
          client_secret: config.facebook.appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      const { access_token }: { access_token: string } = response.data;

      // Exchange short-lived token for long-lived token
      const longLivedResponse = await axios.get<{ access_token: string; expires_in?: number }>(
        `${this.FACEBOOK_GRAPH_URL}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: config.facebook.appId,
            client_secret: config.facebook.appSecret,
            fb_exchange_token: access_token,
          },
        }
      );

      return {
        accessToken: longLivedResponse.data.access_token,
        expiresAt: new Date(Date.now() + (longLivedResponse.data.expires_in || 5184000) * 1000),
        scope: [
          'pages_manage_posts',
          'pages_read_engagement',
          'pages_manage_engagement',
          'pages_show_list',
          'publish_video',
        ],
      };
    } catch (error) {
      logger.error('Facebook token exchange failed', error);
      throw new PlatformError(
        'Facebook',
        'Failed to exchange authorization code for tokens',
        500,
        error
      );
    }
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthToken> {
    // Facebook long-lived tokens don't use refresh tokens
    // They need to be re-exchanged before expiry
    throw new PlatformError('Facebook', 'Facebook tokens must be re-authorized before expiry', 501);
  }

  async createStream(
    communityId: string,
    config: StreamConfig,
    tokens: OAuthToken
  ): Promise<PlatformStream> {
    try {
      // NOTE: If you get permissions errors, ensure your Meta app has:
      // 1. publish_video permission (requires App Review)
      // 2. pages_manage_metadata permission (requires App Review)
      // 3. Business Verification completed
      // Personal developer accounts will receive permissions errors until approved.

      // First, get the user's pages
      const pagesResponse = await axios.get(`${this.FACEBOOK_GRAPH_URL}/me/accounts`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        throw new PlatformError(
          'Facebook',
          'No Facebook pages found. You need a Facebook Page to go live.',
          400
        );
      }

      // Use the first page (in production, this should be configurable)
      const page = pagesResponse.data.data[0];
      const pageAccessToken = page.access_token;

      // Create a live video with RTMP stream
      // Note: Facebook deprecated SCHEDULED_LIVE and SCHEDULED_UNPUBLISHED statuses
      // Now we just create the stream without a status, which defaults to unpublished
      const liveVideoResponse = await axios.post<{
        id: string;
        stream_url: string;
        secure_stream_url: string;
        stream_key?: string;
      }>(
        `${this.FACEBOOK_GRAPH_URL}/${page.id}/live_videos`,
        {
          title: config.title,
          description: config.description || '',
          // Don't set status - let it default to unpublished
        },
        {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
          params: {
            fields: 'id,stream_url,secure_stream_url',
          },
        }
      );

      const { id, stream_url, secure_stream_url } = liveVideoResponse.data;

      // Facebook returns the full RTMP URL in stream_url
      // Format: rtmps://live-api-s.facebook.com:443/rtmp/{stream_key}
      const rtmpUrl = secure_stream_url || stream_url;

      logger.info('Facebook live video created', {
        communityId,
        videoId: id,
        pageId: page.id,
        rtmpUrl,
      });

      return {
        platform: Platform.FACEBOOK,
        platformStreamId: id,
        streamUrl: `https://www.facebook.com/${id}`,
        status: StreamStatus.SCHEDULED,
        rtmpUrl,
        metadata: {
          pageId: page.id,
          pageName: page.name,
        },
      };
    } catch (error) {
      logger.error('Facebook stream creation failed', error);
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.error?.message || error.response?.data?.error || error.message;
        const errorCode = error.response?.data?.error?.code;
        logger.error('Facebook API error details', {
          message: errorMessage,
          code: errorCode,
          status: error.response?.status,
        });
        throw new PlatformError(
          'Facebook',
          `Failed to create stream: ${errorMessage}`,
          error.response?.status || 500,
          error
        );
      }
      throw new PlatformError('Facebook', 'Failed to create stream', 500, error);
    }
  }

  async startStream(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream> {
    try {
      // Update the live video status to LIVE
      await axios.post(
        `${this.FACEBOOK_GRAPH_URL}/${platformStreamId}`,
        {
          status: 'LIVE_NOW',
        },
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }
      );

      logger.info('Facebook stream started', { platformStreamId });

      return {
        platform: Platform.FACEBOOK,
        platformStreamId,
        streamUrl: `https://www.facebook.com/${platformStreamId}`,
        status: StreamStatus.LIVE,
      };
    } catch (error) {
      logger.error('Facebook stream start failed', error);
      throw new PlatformError('Facebook', 'Failed to start stream', 500, error);
    }
  }

  async stopStream(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream> {
    try {
      // End the live video
      await axios.post(
        `${this.FACEBOOK_GRAPH_URL}/${platformStreamId}`,
        {
          end_live_video: true,
        },
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }
      );

      logger.info('Facebook stream stopped', { platformStreamId });

      return {
        platform: Platform.FACEBOOK,
        platformStreamId,
        status: StreamStatus.ENDED,
      };
    } catch (error) {
      logger.error('Facebook stream stop failed', error);
      throw new PlatformError('Facebook', 'Failed to stop stream', 500, error);
    }
  }

  async getStreamStatus(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream> {
    try {
      const response = await axios.get(`${this.FACEBOOK_GRAPH_URL}/${platformStreamId}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          fields: 'status,live_views,permalink_url',
        },
      });

      const { status, live_views, permalink_url } = response.data;

      let streamStatus: StreamStatus;
      switch (status) {
        case 'LIVE':
        case 'LIVE_NOW':
          streamStatus = StreamStatus.LIVE;
          break;
        case 'SCHEDULED_UNPUBLISHED': // Deprecated but may still exist
        case 'SCHEDULED_LIVE': // Deprecated but may still exist
          streamStatus = StreamStatus.SCHEDULED;
          break;
        case 'UNPUBLISHED':
          streamStatus = StreamStatus.IDLE;
          break;
        case 'PROCESSING':
        case 'VOD':
          streamStatus = StreamStatus.ENDED;
          break;
        default:
          streamStatus = StreamStatus.IDLE;
      }

      return {
        platform: Platform.FACEBOOK,
        platformStreamId,
        streamUrl: permalink_url,
        status: streamStatus,
        viewerCount: live_views,
      };
    } catch (error) {
      logger.error('Facebook stream status check failed', error);
      throw new PlatformError('Facebook', 'Failed to get stream status', 500, error);
    }
  }

  async getChatMessages(
    platformStreamId: string,
    tokens: OAuthToken,
    since?: Date
  ): Promise<ChatMessage[]> {
    try {
      const response = await axios.get(`${this.FACEBOOK_GRAPH_URL}/${platformStreamId}/comments`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        params: {
          fields: 'id,from,message,created_time',
          order: 'chronological',
          limit: 100,
        },
      });

      const messages: ChatMessage[] = [];
      for (const comment of response.data.data || []) {
        const createdTime = new Date(comment.created_time);
        if (since && createdTime <= since) {
          continue;
        }

        messages.push({
          id: comment.id,
          streamId: platformStreamId,
          platform: Platform.FACEBOOK,
          authorId: comment.from.id,
          authorName: comment.from.name,
          message: comment.message,
          timestamp: createdTime,
        });
      }

      return messages;
    } catch (error) {
      logger.error('Facebook chat messages fetch failed', error);
      throw new PlatformError('Facebook', 'Failed to get chat messages', 500, error);
    }
  }

  async highlightMessage(
    _platformStreamId: string,
    _messageId: string,
    _tokens: OAuthToken
  ): Promise<boolean> {
    // Facebook doesn't have a native comment highlight feature via API
    throw new UnsupportedFeatureError('Facebook', 'message highlighting');
  }
}

export const facebookProvider = new FacebookProvider();
