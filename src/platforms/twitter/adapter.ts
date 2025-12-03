/**
 * Twitter platform adapter
 * Handles Twitter/X platform connection and disconnection
 */

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
}

export const twitterAdapter = new TwitterAdapter();
