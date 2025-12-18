/**
 * Twitter platform adapter
 * Handles Twitter/X platform connection and disconnection
 */

import axios from 'axios';
import {
  exchangeTwitterCode,
  getTwitterAuthUrl,
  getTwitterUserInfo,
  refreshTwitterToken,
  revokeTwitterToken,
  TwitterTokenResponse,
  TwitterUserInfo,
} from './oauth.js';
import { logger } from '../../utils/logger.js';
import { PlatformError } from '../../core/errors.js';

export interface TwitterConnectionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  username: string;
}

export class TwitterAdapter {
  /**
   * Get OAuth authorization URL for Twitter
   */
  getAuthorizationUrl(userId: string): string {
    const { authUrl } = getTwitterAuthUrl(userId);
    return authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<TwitterConnectionData> {
    try {
      // Exchange code for tokens
      const tokens: TwitterTokenResponse = await exchangeTwitterCode(code, state);

      // Get user information
      const userInfo: TwitterUserInfo = await getTwitterUserInfo(tokens.accessToken);

      logger.info('Twitter connection successful', {
        userId: state,
        username: userInfo.username,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        username: userInfo.username,
      };
    } catch (error) {
      logger.error('Twitter callback handling failed', error);
      throw error;
    }
  }

  /**
   * Refresh expired tokens
   */
  async refreshTokens(refreshToken: string): Promise<TwitterConnectionData> {
    try {
      const tokens: TwitterTokenResponse = await refreshTwitterToken(refreshToken);

      // Get updated user info with new access token
      const userInfo: TwitterUserInfo = await getTwitterUserInfo(tokens.accessToken);

      logger.info('Twitter tokens refreshed successfully');

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        username: userInfo.username,
      };
    } catch (error) {
      logger.error('Twitter token refresh failed', error);
      throw new PlatformError('Twitter', 'Failed to refresh tokens', 500, error);
    }
  }

  /**
   * Disconnect Twitter account and revoke tokens
   */
  async disconnect(accessToken: string): Promise<void> {
    try {
      await revokeTwitterToken(accessToken);
      logger.info('Twitter account disconnected successfully');
    } catch (error) {
      logger.error('Twitter disconnect failed', error);
      // Don't throw - deletion should succeed even if revocation fails
    }
  }

  /**
   * Validate that a Twitter connection is still active
   */
  async validateConnection(accessToken: string): Promise<boolean> {
    try {
      await getTwitterUserInfo(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Post a tweet with optional media
   */
  async post(params: {
    content: string;
    mediaUrl?: string;
    credentials: { accessToken: string; refreshToken?: string; extra?: unknown };
  }): Promise<{ status: string; postUrl?: string; postId?: string; error?: string }> {
    try {
      const { content, mediaUrl, credentials } = params;

      // Twitter API v2 endpoint for creating tweets
      const TWITTER_POST_URL = 'https://api.twitter.com/2/tweets';

      const tweetData: { text: string; media?: { media_ids: string[] } } = {
        text: content,
      };

      // If media is provided, we'd need to upload it first to get media_id
      // For now, we'll support text-only tweets
      // TODO: Implement media upload in future enhancement
      if (mediaUrl) {
        logger.warn('Twitter media upload not yet implemented', { mediaUrl });
      }

      const response = await axios.post<{ data: { id: string } }>(TWITTER_POST_URL, tweetData, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const tweetId = response.data.data.id;
      const username = (credentials.extra as { username?: string } | undefined)?.username || 'user';
      const postUrl = `https://twitter.com/${username}/status/${tweetId}`;

      logger.info('Tweet posted successfully', { tweetId, postUrl });

      return {
        status: 'posted',
        postUrl,
        postId: tweetId,
      };
    } catch (error) {
      logger.error('Twitter post failed', error);
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { detail?: string } | undefined)?.detail || error.message;
        return {
          status: 'failed',
          error: `Failed to post tweet: ${message}`,
        };
      }
      return {
        status: 'failed',
        error: 'Failed to post tweet',
      };
    }
  }

  /**
   * Schedule a tweet
   * Note: Twitter API v2 does not support scheduled tweets for standard API access
   * This feature requires Twitter API v1.1 Premium or Business tier
   */
  scheduleEvent(_params: {
    title: string;
    description?: string;
    scheduledAt: Date;
    credentials: { accessToken: string; refreshToken?: string };
  }): Promise<{ status: string; postId?: string; error?: string }> {
    logger.warn('Twitter scheduled tweets require Premium/Business API tier');

    return Promise.resolve({
      status: 'unsupported',
      error:
        'Twitter scheduled tweets are not supported with standard API access. Requires Premium or Business tier.',
    });
  }

  /**
   * Fetch chat messages (not supported for Twitter)
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
    return Promise.resolve([]);
  }

  /**
   * Send chat message (not supported for Twitter)
   */
  sendChatMessage(): Promise<{ status: 'unsupported' }> {
    return Promise.resolve({ status: 'unsupported' });
  }
}

export const twitterAdapter = new TwitterAdapter();
