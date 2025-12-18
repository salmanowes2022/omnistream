/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Instagram platform adapter
 * Handles Instagram platform connection and image posting via Instagram Graph API
 */

import axios from 'axios';
import {
  exchangeInstagramCode,
  getInstagramAuthUrl,
  getInstagramUserInfo,
  InstagramTokenResponse,
  InstagramUserInfo,
  revokeInstagramToken,
} from './oauth.js';
import { logger } from '../../utils/logger.js';
import type { PlatformPostResult, PostData } from '../../types/post.js';

export interface InstagramConnectionData {
  accessToken: string;
  expiresAt: Date;
  username: string;
  igBusinessId: string;
}

export class InstagramAdapter {
  /**
   * Get OAuth authorization URL for Instagram
   */
  getAuthorizationUrl(userId: string): string {
    const { authUrl } = getInstagramAuthUrl(userId);
    return authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<InstagramConnectionData> {
    try {
      // Exchange code for tokens and get IG Business ID
      const tokens: InstagramTokenResponse = await exchangeInstagramCode(code, state);

      // Get user information
      const userInfo: InstagramUserInfo = await getInstagramUserInfo(
        tokens.accessToken,
        tokens.igBusinessId
      );

      logger.info('Instagram connection successful', {
        userId: state,
        username: userInfo.username,
        igBusinessId: tokens.igBusinessId,
      });

      return {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        username: userInfo.username,
        igBusinessId: tokens.igBusinessId,
      };
    } catch (error) {
      logger.error('Instagram callback handling failed', error);
      throw error;
    }
  }

  /**
   * Disconnect Instagram account and revoke tokens
   */
  async disconnect(accessToken: string): Promise<void> {
    try {
      await revokeInstagramToken(accessToken);
      logger.info('Instagram account disconnected successfully');
    } catch (error) {
      logger.error('Instagram disconnect failed', error);
      // Don't throw - deletion should succeed even if revocation fails
    }
  }

  /**
   * Validate that an Instagram connection is still active
   */
  async validateConnection(accessToken: string, igBusinessId: string): Promise<boolean> {
    try {
      await getInstagramUserInfo(accessToken, igBusinessId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Post an image with caption to Instagram
   * Instagram Graph API requires a two-step process:
   * 1. Create media container
   * 2. Publish the container
   */
  async post(postData: PostData): Promise<PlatformPostResult> {
    try {
      const { content, mediaUrl, credentials } = postData;
      const { accessToken, extra } = credentials;

      // Extract IG Business ID from extra data
      const igBusinessId = (extra as { igBusinessId?: string })?.igBusinessId;

      if (!igBusinessId) {
        return {
          status: 'failed',
          error: 'Instagram Business ID not found in credentials',
        };
      }

      // Validate that media URL is provided (Instagram requires image for posts)
      if (!mediaUrl) {
        return {
          status: 'failed',
          error:
            'Media URL is required for Instagram posts. Instagram does not support text-only posts.',
        };
      }

      // Step 1: Create media container
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igBusinessId}/media`,
        {
          image_url: mediaUrl,
          caption: content,
        },
        {
          params: {
            access_token: accessToken,
          },
        }
      );

      const containerId = containerResponse.data.id;

      logger.info('Instagram media container created', { containerId });

      // Step 2: Publish the media container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igBusinessId}/media_publish`,
        {
          creation_id: containerId,
        },
        {
          params: {
            access_token: accessToken,
          },
        }
      );

      const postId = publishResponse.data.id;

      // Instagram post URL (note: postId from API is not the shortcode used in URLs)
      const postUrl = `https://www.instagram.com/${postId}`;

      logger.info('Instagram post published successfully', { postId, postUrl });

      return {
        status: 'posted',
        postUrl,
        postId,
      };
    } catch (error) {
      logger.error('Instagram post failed', error);
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as { error?: { message?: string } };
        const message = errorData?.error?.message || error.message;
        return {
          status: 'failed',
          error: `Failed to post to Instagram: ${message}`,
        };
      }
      return {
        status: 'failed',
        error: 'Failed to post to Instagram',
      };
    }
  }

  /**
   * Schedule an Instagram post
   * Note: Instagram Graph API does not support native post scheduling
   * Scheduled posts must be managed via Facebook Business Suite or external schedulers
   */
  scheduleEvent(_params: {
    title: string;
    description?: string;
    scheduledAt: Date;
    credentials: { accessToken: string; extra?: { igBusinessId?: string } };
  }): Promise<{ status: string; postId?: string; error?: string }> {
    logger.warn('Instagram does not support native scheduled posts via Graph API');

    return Promise.resolve({
      status: 'unsupported',
      error:
        'Instagram Graph API does not support scheduled posts. Use Facebook Business Suite for scheduling.',
    });
  }

  /**
   * Fetch chat messages (not supported for Instagram)
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
   * Send chat message (not supported for Instagram)
   */
  sendChatMessage(): Promise<{ status: 'unsupported' }> {
    return Promise.resolve({ status: 'unsupported' });
  }
}

export const instagramAdapter = new InstagramAdapter();
