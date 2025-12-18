/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Twitter OAuth 2.0 PKCE implementation
 * Uses OAuth 2.0 with PKCE for secure authentication
 */

import crypto from 'crypto';
import axios from 'axios';
import { config } from '../../utils/config.js';
import { PlatformError } from '../../core/errors.js';
import { logger } from '../../utils/logger.js';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_REVOKE_URL = 'https://api.twitter.com/2/oauth2/revoke';
const TWITTER_USER_URL = 'https://api.twitter.com/2/users/me';

export interface TwitterTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
}

/**
 * Generate code verifier for PKCE
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate code challenge from verifier
 */
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Store for PKCE code verifiers (in production, use Redis or database)
 */
const pkceStore = new Map<string, string>();

/**
 * Get Twitter OAuth authorization URL with PKCE
 */
export function getTwitterAuthUrl(state: string): { authUrl: string; codeVerifier: string } {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store code verifier with state as key
  pkceStore.set(state, codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.twitter.clientId,
    redirect_uri: config.twitter.redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${TWITTER_AUTH_URL}?${params.toString()}`;

  return { authUrl, codeVerifier };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeTwitterCode(
  code: string,
  state: string
): Promise<TwitterTokenResponse> {
  try {
    // Retrieve code verifier from store
    const codeVerifier = pkceStore.get(state);
    if (!codeVerifier) {
      throw new Error('Code verifier not found. PKCE flow may have expired.');
    }

    // Clean up the verifier
    pkceStore.delete(state);

    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: config.twitter.clientId,
      redirect_uri: config.twitter.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await axios.post(TWITTER_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in, scope } = response.data;

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      scope: scope ? scope.split(' ') : [],
    };
  } catch (error) {
    logger.error('Twitter token exchange failed', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error_description || error.message;
      throw new PlatformError('Twitter', `Token exchange failed: ${message}`, 500, error);
    }
    throw new PlatformError('Twitter', 'Token exchange failed', 500, error);
  }
}

/**
 * Refresh Twitter access token
 */
export async function refreshTwitterToken(refreshToken: string): Promise<TwitterTokenResponse> {
  try {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: config.twitter.clientId,
    });

    const response = await axios.post(TWITTER_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in, scope } = response.data;

    return {
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresAt: new Date(Date.now() + expires_in * 1000),
      scope: scope ? scope.split(' ') : [],
    };
  } catch (error) {
    logger.error('Twitter token refresh failed', error);
    throw new PlatformError('Twitter', 'Token refresh failed', 500, error);
  }
}

/**
 * Get Twitter user information
 */
export async function getTwitterUserInfo(accessToken: string): Promise<TwitterUserInfo> {
  try {
    const response = await axios.get(TWITTER_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        'user.fields': 'id,username,name',
      },
    });

    const userData = response.data.data;

    return {
      id: userData.id,
      username: userData.username,
      name: userData.name,
    };
  } catch (error) {
    logger.error('Twitter user info fetch failed', error);
    throw new PlatformError('Twitter', 'Failed to fetch user info', 500, error);
  }
}

/**
 * Revoke Twitter access token
 */
export async function revokeTwitterToken(accessToken: string): Promise<void> {
  try {
    const params = new URLSearchParams({
      token: accessToken,
      client_id: config.twitter.clientId,
      token_type_hint: 'access_token',
    });

    await axios.post(TWITTER_REVOKE_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    logger.info('Twitter token revoked successfully');
  } catch (error) {
    logger.error('Twitter token revocation failed', error);
    // Don't throw error on revocation failure - just log it
  }
}
