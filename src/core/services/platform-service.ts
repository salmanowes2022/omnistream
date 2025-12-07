/**
 * Unified Platform Service
 * Handles platform connections for Twitter, Telegram, YouTube, and Facebook
 */

import { Platform } from '../interfaces.js';
import { PlatformError, ValidationError } from '../errors.js';
import { userService } from './user-service.js';
import { twitterAdapter } from '../../platforms/twitter/adapter.js';
import { telegramAdapter } from '../../platforms/telegram/adapter.js';
import { youtubeAdapter } from '../../platforms/youtube/adapter.js';
import { facebookAdapter } from '../../platforms/facebook/adapter.js';
import { instagramAdapter } from '../../platforms/instagram/adapter.js';
import { tiktokAdapter } from '../../platforms/tiktok/adapter.js';
import { logger } from '../../utils/logger.js';
import type { PlatformPostResult, PostData } from '../../types/post.js';

export interface ConnectTwitterRequest {
  userId: string;
  code: string;
  state: string;
}

export interface ConnectTelegramRequest {
  userId: string;
  botToken: string;
  channelId: string;
}

export interface ConnectYouTubeRequest {
  userId: string;
  code: string;
  redirectUri: string;
}

export interface ConnectFacebookRequest {
  userId: string;
  code: string;
  state: string;
}

export interface ConnectInstagramRequest {
  userId: string;
  code: string;
  state: string;
}

export interface ConnectTikTokRequest {
  userId: string;
  rtmpServer: string;
  streamKey: string;
}

export interface PlatformConnectionInfo {
  id: string;
  platform: Platform;
  connected: boolean;
  expiresAt: Date | null;
  extra: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PlatformService {
  /**
   * Get authorization URL for Twitter
   */
  getTwitterAuthUrl(userId: string): string {
    return twitterAdapter.getAuthorizationUrl(userId);
  }

  /**
   * Get authorization URL for YouTube
   */
  getYouTubeAuthUrl(userId: string, redirectUri: string): string {
    return youtubeAdapter.getAuthorizationUrl(userId, redirectUri);
  }

  /**
   * Get authorization URL for Facebook
   */
  getFacebookAuthUrl(userId: string): string {
    return facebookAdapter.getAuthorizationUrl(userId);
  }

  /**
   * Get authorization URL for Instagram
   */
  getInstagramAuthUrl(userId: string): string {
    return instagramAdapter.getAuthorizationUrl(userId);
  }

  /**
   * Connect Twitter account
   */
  async connectTwitter(request: ConnectTwitterRequest): Promise<void> {
    try {
      const { userId, code, state } = request;

      // Verify state matches userId for security
      if (state !== userId) {
        throw new ValidationError('Invalid state parameter');
      }

      // Handle Twitter OAuth callback
      const connectionData = await twitterAdapter.handleCallback(code, state);

      // Save to database via userService
      await userService.connectPlatform({
        userId,
        platform: Platform.TWITTER,
        accessToken: connectionData.accessToken,
        refreshToken: connectionData.refreshToken,
        expiresAt: connectionData.expiresAt,
        extra: {
          username: connectionData.username,
        },
      });

      logger.info('Twitter connected successfully', { userId, username: connectionData.username });
    } catch (error) {
      logger.error('Twitter connection failed', error);
      throw error;
    }
  }

  /**
   * Connect Telegram bot
   */
  async connectTelegram(request: ConnectTelegramRequest): Promise<void> {
    try {
      const { userId, botToken, channelId } = request;

      // Validate and connect Telegram
      const connectionData = await telegramAdapter.connect(botToken, channelId);

      // Save to database via userService
      // Store botToken as accessToken (encrypted), no refresh token for Telegram
      await userService.connectPlatform({
        userId,
        platform: Platform.TELEGRAM,
        accessToken: connectionData.botToken,
        refreshToken: undefined,
        expiresAt: undefined, // Telegram tokens don't expire
        extra: {
          botUsername: connectionData.botUsername,
          botId: connectionData.botId,
          channelId: connectionData.channelId,
        },
      });

      logger.info('Telegram connected successfully', {
        userId,
        botUsername: connectionData.botUsername,
        channelId,
      });
    } catch (error) {
      logger.error('Telegram connection failed', error);
      throw error;
    }
  }

  /**
   * Connect YouTube account
   */
  async connectYouTube(request: ConnectYouTubeRequest): Promise<void> {
    try {
      const { userId, code, redirectUri } = request;

      // Handle YouTube OAuth callback
      const connectionData = await youtubeAdapter.handleCallback(code, redirectUri);

      // Save to database via userService
      await userService.connectPlatform({
        userId,
        platform: Platform.YOUTUBE,
        accessToken: connectionData.accessToken,
        refreshToken: connectionData.refreshToken,
        expiresAt: connectionData.expiresAt,
        extra: {
          channelId: connectionData.channelId,
          channelTitle: connectionData.channelTitle,
        },
      });

      logger.info('YouTube connected successfully', {
        userId,
        channelId: connectionData.channelId,
        channelTitle: connectionData.channelTitle,
      });
    } catch (error) {
      logger.error('YouTube connection failed', error);
      throw error;
    }
  }

  /**
   * Connect Facebook account
   */
  async connectFacebook(request: ConnectFacebookRequest): Promise<void> {
    try {
      const { userId, code, state } = request;

      // Verify state matches userId for security
      if (state !== userId) {
        throw new ValidationError('Invalid state parameter');
      }

      // Handle Facebook OAuth callback
      const connectionData = await facebookAdapter.handleCallback(code, state);

      // Save to database via userService
      await userService.connectPlatform({
        userId,
        platform: Platform.FACEBOOK,
        accessToken: connectionData.accessToken,
        refreshToken: undefined,
        expiresAt: connectionData.expiresAt,
        extra: {
          name: connectionData.name,
        },
      });

      logger.info('Facebook connected successfully', { userId, name: connectionData.name });
    } catch (error) {
      logger.error('Facebook connection failed', error);
      throw error;
    }
  }

  /**
   * Connect Instagram account
   */
  async connectInstagram(request: ConnectInstagramRequest): Promise<void> {
    try {
      const { userId, code, state } = request;

      // Verify state matches userId for security
      if (state !== userId) {
        throw new ValidationError('Invalid state parameter');
      }

      // Handle Instagram OAuth callback
      const connectionData = await instagramAdapter.handleCallback(code, state);

      // Save to database via userService
      await userService.connectPlatform({
        userId,
        platform: Platform.INSTAGRAM,
        accessToken: connectionData.accessToken,
        refreshToken: undefined,
        expiresAt: connectionData.expiresAt,
        extra: {
          username: connectionData.username,
          igBusinessId: connectionData.igBusinessId,
        },
      });

      logger.info('Instagram connected successfully', {
        userId,
        username: connectionData.username,
        igBusinessId: connectionData.igBusinessId,
      });
    } catch (error) {
      logger.error('Instagram connection failed', error);
      throw error;
    }
  }

  /**
   * Connect TikTok with manual RTMP credentials
   */
  async connectTikTok(request: ConnectTikTokRequest): Promise<void> {
    try {
      const { userId, rtmpServer, streamKey } = request;

      // Validate and connect TikTok
      const connectionData = await tiktokAdapter.connect(rtmpServer, streamKey);

      // Save to database via userService
      // Store streamKey as accessToken (encrypted), no refresh token for TikTok
      await userService.connectPlatform({
        userId,
        platform: Platform.TIKTOK,
        accessToken: connectionData.streamKey, // Encrypted in database
        refreshToken: undefined,
        expiresAt: undefined, // RTMP credentials don't expire
        extra: {
          rtmpServer: connectionData.rtmpServer,
        },
      });

      logger.info('TikTok connected successfully', {
        userId,
        rtmpServer: connectionData.rtmpServer,
      });
    } catch (error) {
      logger.error('TikTok connection failed', error);
      throw error;
    }
  }

  /**
   * Disconnect a platform
   */
  async disconnectPlatform(userId: string, platform: Platform): Promise<void> {
    try {
      // Get tokens before deleting (for revocation)
      const tokens = await userService.getPlatformTokens(userId, platform);

      if (tokens) {
        // Revoke tokens based on platform
        switch (platform) {
          case Platform.TWITTER:
            await twitterAdapter.disconnect(tokens.accessToken);
            break;
          case Platform.YOUTUBE:
            await youtubeAdapter.disconnect(tokens.accessToken);
            break;
          case Platform.TELEGRAM:
            await telegramAdapter.disconnect();
            break;
          case Platform.FACEBOOK:
            await facebookAdapter.disconnect(tokens.accessToken);
            break;
          case Platform.INSTAGRAM:
            await instagramAdapter.disconnect(tokens.accessToken);
            break;
          case Platform.TIKTOK:
            await tiktokAdapter.disconnect();
            break;
          default: {
            const exhaustiveCheck: never = platform;
            logger.warn(`Disconnect not implemented for platform: ${String(exhaustiveCheck)}`);
            break;
          }
        }
      }

      // Delete from database
      await userService.disconnectPlatform(userId, platform);

      logger.info('Platform disconnected successfully', { userId, platform });
    } catch (error) {
      logger.error('Platform disconnect failed', error);
      throw error;
    }
  }

  /**
   * List all connected platforms for a user
   */
  async listPlatforms(userId: string): Promise<PlatformConnectionInfo[]> {
    try {
      const platforms = await userService.getConnectedPlatforms(userId);

      return platforms.map((p) => ({
        id: p.id,
        platform: p.platform as Platform,
        connected: true,
        expiresAt: p.expiresAt,
        extra: p.extra,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    } catch (error) {
      logger.error('Failed to list platforms', error);
      throw error;
    }
  }

  /**
   * Check if a specific platform is connected
   */
  async isPlatformConnected(userId: string, platform: Platform): Promise<boolean> {
    try {
      const tokens = await userService.getPlatformTokens(userId, platform);
      return tokens !== null;
    } catch (error) {
      logger.error('Failed to check platform connection', error);
      return false;
    }
  }

  /**
   * Refresh tokens for a platform if needed
   */
  async refreshPlatformTokens(userId: string, platform: Platform): Promise<void> {
    try {
      const tokens = await userService.getPlatformTokens(userId, platform);

      if (!tokens) {
        throw new ValidationError(`Platform ${platform} is not connected`);
      }

      // Check if token is expired or about to expire (within 5 minutes)
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (!tokens.expiresAt || tokens.expiresAt > fiveMinutesFromNow) {
        // Token is still valid
        return;
      }

      if (!tokens.refreshToken) {
        throw new PlatformError(platform, 'No refresh token available', 401);
      }

      // Refresh based on platform
      switch (platform) {
        case Platform.TWITTER: {
          const newTokens = await twitterAdapter.refreshTokens(tokens.refreshToken);
          await userService.connectPlatform({
            userId,
            platform: Platform.TWITTER,
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresAt: newTokens.expiresAt,
            extra: {
              username: newTokens.username,
            },
          });
          break;
        }
        case Platform.YOUTUBE: {
          const newTokens = await youtubeAdapter.refreshTokens(tokens.refreshToken);
          await userService.connectPlatform({
            userId,
            platform: Platform.YOUTUBE,
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresAt: newTokens.expiresAt,
            extra: {
              channelId: newTokens.channelId,
              channelTitle: newTokens.channelTitle,
            },
          });
          break;
        }
        case Platform.TELEGRAM:
          // Telegram tokens don't expire
          break;
        default:
          throw new PlatformError(platform, 'Token refresh not supported', 400);
      }

      logger.info('Platform tokens refreshed successfully', { userId, platform });
    } catch (error) {
      logger.error('Failed to refresh platform tokens', error);
      throw error;
    }
  }

  /**
   * Validate platform connection
   */
  async validatePlatformConnection(userId: string, platform: Platform): Promise<boolean> {
    try {
      const tokens = await userService.getPlatformTokens(userId, platform);

      if (!tokens) {
        return false;
      }

      switch (platform) {
        case Platform.TWITTER:
          return await twitterAdapter.validateConnection(tokens.accessToken);
        case Platform.YOUTUBE:
          return await youtubeAdapter.validateConnection(tokens.accessToken);
        case Platform.TELEGRAM:
          return await telegramAdapter.validateConnection(tokens.accessToken);
        case Platform.INSTAGRAM: {
          // Get extra data for Instagram Business ID
          const socialAccounts = await userService.getConnectedPlatforms(userId);
          const igAccount = socialAccounts.find((acc) => (acc.platform as Platform) === platform);
          const igBusinessId = (igAccount?.extra as { igBusinessId?: string })?.igBusinessId || '';
          return await instagramAdapter.validateConnection(tokens.accessToken, igBusinessId);
        }
        case Platform.TIKTOK: {
          // Get extra data for RTMP server
          const socialAccounts = await userService.getConnectedPlatforms(userId);
          const tiktokAccount = socialAccounts.find(
            (acc) => (acc.platform as Platform) === platform
          );
          const rtmpServer = (tiktokAccount?.extra as { rtmpServer?: string })?.rtmpServer || '';
          return await tiktokAdapter.validateConnection(rtmpServer, tokens.accessToken);
        }
        default:
          return false;
      }
    } catch (error) {
      logger.error('Platform validation failed', error);
      return false;
    }
  }

  /**
   * Post content to a specific platform
   */
  async postToPlatform(
    userId: string,
    platform: Platform,
    postData: PostData
  ): Promise<PlatformPostResult> {
    try {
      // Get user's tokens for this platform
      const tokens = await userService.getPlatformTokens(userId, platform);

      if (!tokens) {
        return {
          status: 'failed',
          error: `Platform ${platform} is not connected`,
        };
      }

      // Get extra data (username, channelId, etc.)
      const socialAccounts = await userService.getConnectedPlatforms(userId);
      const platformAccount = socialAccounts.find((acc) => (acc.platform as Platform) === platform);
      const extra = platformAccount?.extra || {};

      // Prepare credentials
      const credentials = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        extra,
      };

      // Post to the appropriate platform
      switch (platform) {
        case Platform.TWITTER: {
          const result = await twitterAdapter.post({
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            credentials,
          });
          return {
            status: result.status as 'posted' | 'failed' | 'unsupported',
            postUrl: result.postUrl,
            postId: result.postId,
            error: result.error,
          };
        }

        case Platform.TELEGRAM: {
          const result = await telegramAdapter.post({
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            credentials,
          });
          return {
            status: result.status as 'posted' | 'failed' | 'unsupported',
            postId: result.postId,
            error: result.error,
          };
        }

        case Platform.FACEBOOK: {
          const result = await facebookAdapter.post({
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            credentials,
          });
          return {
            status: result.status,
            postUrl: result.postUrl,
            postId: result.postId,
            error: result.error,
          };
        }

        case Platform.YOUTUBE: {
          const result = await youtubeAdapter.post({
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            credentials,
          });
          return {
            status: result.status as 'posted' | 'failed' | 'unsupported',
            error: result.error,
          };
        }

        case Platform.INSTAGRAM: {
          const result = await instagramAdapter.post({
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            credentials,
          });
          return {
            status: result.status,
            postUrl: result.postUrl,
            postId: result.postId,
            error: result.error,
          };
        }

        case Platform.TIKTOK: {
          const result = await tiktokAdapter.post({
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            credentials,
          });
          return {
            status: result.status as 'posted' | 'failed' | 'unsupported',
            postUrl: result.postUrl,
            postId: result.postId,
            error: result.error,
          };
        }

        default: {
          const exhaustiveCheck: never = platform;
          return {
            status: 'unsupported',
            error: `Platform ${String(exhaustiveCheck)} is not supported for posting`,
          };
        }
      }
    } catch (error) {
      logger.error('Failed to post to platform', { platform, error });
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Post content to multiple platforms
   */
  async postToMultiplePlatforms(
    userId: string,
    platforms: Platform[],
    content: string,
    mediaUrl?: string
  ): Promise<Record<Platform, PlatformPostResult>> {
    const results: Partial<Record<Platform, PlatformPostResult>> = {};

    // Post to each platform in parallel
    const postPromises = platforms.map(async (platform) => {
      const result = await this.postToPlatform(userId, platform, {
        content,
        mediaUrl,
        credentials: { accessToken: '' }, // Will be fetched inside postToPlatform
      });
      results[platform] = result;
    });

    await Promise.all(postPromises);

    return results as Record<Platform, PlatformPostResult>;
  }
}

export const platformService = new PlatformService();
