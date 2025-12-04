/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Facebook platform adapter
 * Handles Facebook platform connection and posting
 */

import axios from 'axios';
import {
  exchangeFacebookCode,
  getFacebookAuthUrl,
  getFacebookUserInfo,
  revokeFacebookToken,
  FacebookTokenResponse,
  FacebookUserInfo,
} from './oauth.js';
import { logger } from '../../utils/logger.js';
import type { PostData, PlatformPostResult } from '../../types/post.js';

export interface FacebookConnectionData {
  accessToken: string;
  expiresAt: Date;
  name: string;
}

export class FacebookAdapter {
  /**
   * Get OAuth authorization URL for Facebook
   */
  getAuthorizationUrl(userId: string): string {
    const { authUrl } = getFacebookAuthUrl(userId);
    return authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<FacebookConnectionData> {
    try {
      // Exchange code for tokens
      const tokens: FacebookTokenResponse = await exchangeFacebookCode(code, state);

      // Get user information
      const userInfo: FacebookUserInfo = await getFacebookUserInfo(tokens.accessToken);

      logger.info('Facebook connection successful', {
        userId: state,
        name: userInfo.name,
      });

      return {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        name: userInfo.name,
      };
    } catch (error) {
      logger.error('Facebook callback handling failed', error);
      throw error;
    }
  }

  /**
   * Disconnect Facebook account
   */
  async disconnect(accessToken: string): Promise<void> {
    try {
      await revokeFacebookToken(accessToken);
      logger.info('Facebook disconnected successfully');
    } catch (error) {
      logger.error('Facebook disconnect failed', error);
      throw error;
    }
  }

  /**
   * Post content to Facebook
   */
  async post(postData: PostData): Promise<PlatformPostResult> {
    try {
      const { content, mediaUrl, credentials } = postData;
      const { accessToken, extra } = credentials;

      // Get user's pages
      const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { access_token: accessToken },
      });

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        return {
          status: 'failed',
          error: 'No Facebook pages found. You need a Facebook Page to post.',
        };
      }

      // Use the first page (or page from extra if specified)
      const pageId = extra?.pageId || pagesResponse.data.data[0].id;
      const page = pagesResponse.data.data.find((p: any) => p.id === pageId) || pagesResponse.data.data[0];
      const pageAccessToken = page.access_token;

      let postResponse;

      if (mediaUrl) {
        // Post with photo
        postResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${page.id}/photos`,
          {
            url: mediaUrl,
            caption: content,
          },
          {
            params: { access_token: pageAccessToken },
          }
        );
      } else {
        // Post text only
        postResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${page.id}/feed`,
          {
            message: content,
          },
          {
            params: { access_token: pageAccessToken },
          }
        );
      }

      const postId = postResponse.data.id;

      logger.info('Facebook post created', { postId });

      return {
        status: 'posted',
        postId,
        postUrl: `https://facebook.com/${postId}`,
      };
    } catch (error: any) {
      logger.error('Facebook post failed', error);
      return {
        status: 'failed',
        error: error.response?.data?.error?.message || error.message || 'Failed to post to Facebook',
      };
    }
  }
}

export const facebookAdapter = new FacebookAdapter();
