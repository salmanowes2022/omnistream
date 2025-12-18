/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Instagram OAuth utilities
 * Uses Facebook Graph API for Instagram Business accounts
 */

import axios from 'axios';
import { config } from '../../utils/config.js';
import { PlatformError } from '../../core/errors.js';

export interface InstagramTokenResponse {
  accessToken: string;
  expiresAt: Date;
  igBusinessId: string;
}

export interface InstagramUserInfo {
  id: string;
  username: string;
  name: string;
  igBusinessId: string;
}

/**
 * Get Instagram OAuth authorization URL
 * Uses Facebook OAuth with Instagram-specific scopes
 */
export function getInstagramAuthUrl(userId: string): { authUrl: string; state: string } {
  const state = userId;
  const params = new URLSearchParams({
    client_id: config.instagram.appId,
    redirect_uri: config.instagram.redirectUri,
    scope: 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list',
    state,
  });

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

  return { authUrl, state };
}

/**
 * Exchange authorization code for access token and get Instagram Business Account ID
 */
export async function exchangeInstagramCode(
  code: string,
  _state: string
): Promise<InstagramTokenResponse> {
  try {
    // Step 1: Exchange code for short-lived token
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: config.instagram.appId,
        client_secret: config.instagram.appSecret,
        redirect_uri: config.instagram.redirectUri,
        code,
      },
    });

    const { access_token } = response.data;

    // Step 2: Exchange short-lived token for long-lived token
    const longLivedResponse = await axios.get<{ access_token: string; expires_in?: number }>(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.instagram.appId,
          client_secret: config.instagram.appSecret,
          fb_exchange_token: access_token,
        },
      }
    );

    const longLivedToken = longLivedResponse.data.access_token;

    // Step 3: Get Instagram Business Account ID
    const igBusinessId = await getInstagramBusinessAccountId(longLivedToken);

    return {
      accessToken: longLivedToken,
      expiresAt: new Date(Date.now() + (longLivedResponse.data.expires_in || 5184000) * 1000), // Default 60 days
      igBusinessId,
    };
  } catch (error) {
    throw new PlatformError('Instagram', 'Failed to exchange authorization code', 500, error);
  }
}

/**
 * Get Instagram Business Account ID from Facebook pages
 */
async function getInstagramBusinessAccountId(accessToken: string): Promise<string> {
  try {
    // Get user's Facebook pages
    const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'instagram_business_account',
      },
    });

    const pages = pagesResponse.data.data;

    if (!pages || pages.length === 0) {
      throw new PlatformError(
        'Instagram',
        'No Facebook Pages found. You need a Facebook Page connected to an Instagram Business account.',
        404
      );
    }

    // Find the first page with an Instagram Business account
    const pageWithInstagram = pages.find(
      (page: { instagram_business_account?: { id: string } }) => page.instagram_business_account
    );

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      throw new PlatformError(
        'Instagram',
        'No Instagram Business account found. Please convert your Instagram account to a Business account and connect it to a Facebook Page.',
        404
      );
    }

    return pageWithInstagram.instagram_business_account.id;
  } catch (error) {
    if (error instanceof PlatformError) {
      throw error;
    }
    throw new PlatformError('Instagram', 'Failed to get Instagram Business Account ID', 500, error);
  }
}

/**
 * Get Instagram user information
 */
export async function getInstagramUserInfo(
  accessToken: string,
  igBusinessId: string
): Promise<InstagramUserInfo> {
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${igBusinessId}`, {
      params: {
        fields: 'id,username,name',
        access_token: accessToken,
      },
    });

    return {
      id: response.data.id,
      username: response.data.username,
      name: response.data.name,
      igBusinessId,
    };
  } catch (error) {
    throw new PlatformError('Instagram', 'Failed to get user info', 500, error);
  }
}

/**
 * Revoke Instagram access token (via Facebook)
 */
export async function revokeInstagramToken(accessToken: string): Promise<void> {
  try {
    await axios.delete(`https://graph.facebook.com/v18.0/me/permissions`, {
      params: {
        access_token: accessToken,
      },
    });
  } catch (error) {
    throw new PlatformError('Instagram', 'Failed to revoke token', 500, error);
  }
}
