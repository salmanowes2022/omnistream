/**
 * Twitter streaming provider stub
 * Twitter/X does not have an official live streaming API for developers
 */

import {
  ChatMessage,
  OAuthToken,
  Platform,
  PlatformStream,
  StreamConfig,
  StreamProvider,
} from '../../core/interfaces.js';
import { UnsupportedFeatureError } from '../../core/errors.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

export class TwitterProvider implements StreamProvider {
  readonly platform = Platform.TWITTER;

  private readonly TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

  getAuthUrl(communityId: string, redirectUri: string): string {
    // Generate auth URL but note that Twitter doesn't support live streaming via API
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.twitter.clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: communityId,
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    });

    logger.warn('Twitter does not support live streaming via API', { communityId });
    return `${this.TWITTER_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'Twitter',
      'OAuth token exchange - Twitter does not provide a live streaming API. ' +
        'Live streaming on Twitter/X must be done through the mobile app or web interface.'
    );
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'Twitter',
      'Token refresh - Twitter does not provide a live streaming API'
    );
  }

  async createStream(
    _communityId: string,
    _config: StreamConfig,
    _tokens: OAuthToken
  ): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Twitter',
      'Stream creation - Twitter does not provide a live streaming API. ' +
        'Live streaming on Twitter/X must be initiated from the mobile app or web interface.'
    );
  }

  async startStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Twitter',
      'Stream control - Twitter does not support programmatic stream start'
    );
  }

  async stopStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Twitter',
      'Stream control - Twitter does not support programmatic stream stop'
    );
  }

  async getStreamStatus(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Twitter',
      'Stream status - Twitter does not provide a live streaming API'
    );
  }

  async getChatMessages(
    _platformStreamId: string,
    _tokens: OAuthToken,
    _since?: Date
  ): Promise<ChatMessage[]> {
    // Return empty array instead of throwing error for unsupported chat
    return [];
  }

  async highlightMessage(
    _platformStreamId: string,
    _messageId: string,
    _tokens: OAuthToken
  ): Promise<boolean> {
    throw new UnsupportedFeatureError('Twitter', 'message highlighting');
  }
}

export const twitterProvider = new TwitterProvider();
