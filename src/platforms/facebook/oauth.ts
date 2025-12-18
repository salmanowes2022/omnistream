/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Facebook OAuth utilities
 */

import axios from 'axios';
import { config } from '../../utils/config.js';
import { PlatformError } from '../../core/errors.js';

export interface FacebookTokenResponse {
  accessToken: string;
  expiresAt: Date;
}

export interface FacebookUserInfo {
  id: string;
  name: string;
}

/**
 * Get Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(userId: string): { authUrl: string; state: string } {
  const state = userId;
  const params = new URLSearchParams({
    client_id: config.facebook.appId,
    redirect_uri: config.facebook.redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement,publish_video',
    state,
  });

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

  return { authUrl, state };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(
  code: string,
  _state: string
): Promise<FacebookTokenResponse> {
  try {
    // Exchange code for short-lived token
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: config.facebook.appId,
        client_secret: config.facebook.appSecret,
        redirect_uri: config.facebook.redirectUri,
        code,
      },
    });

    const { access_token } = response.data;

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await axios.get<{ access_token: string; expires_in?: number }>(
      'https://graph.facebook.com/v18.0/oauth/access_token',
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
      expiresAt: new Date(Date.now() + (longLivedResponse.data.expires_in || 5184000) * 1000), // Default 60 days
    };
  } catch (error) {
    throw new PlatformError('Facebook', 'Failed to exchange authorization code', 500, error);
  }
}

/**
 * Get Facebook user information
 */
export async function getFacebookUserInfo(accessToken: string): Promise<FacebookUserInfo> {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        fields: 'id,name',
        access_token: accessToken,
      },
    });

    return {
      id: response.data.id,
      name: response.data.name,
    };
  } catch (error) {
    throw new PlatformError('Facebook', 'Failed to get user info', 500, error);
  }
}

/**
 * Revoke Facebook access token
 */
export async function revokeFacebookToken(accessToken: string): Promise<void> {
  try {
    await axios.delete(`https://graph.facebook.com/v18.0/me/permissions`, {
      params: {
        access_token: accessToken,
      },
    });
  } catch (error) {
    throw new PlatformError('Facebook', 'Failed to revoke token', 500, error);
  }
}
