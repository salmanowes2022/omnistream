/**
 * TikTok streaming provider stub
 * TikTok LIVE Access API requires special approval and is not generally available
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

export class TikTokProvider implements StreamProvider {
  readonly platform = Platform.TIKTOK;

  private readonly TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize';

  getAuthUrl(communityId: string, redirectUri: string): string {
    // Generate auth URL but note that LIVE Access API requires approval
    const params = new URLSearchParams({
      client_key: config.tiktok.clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,video.list,live.room.info',
      state: communityId,
    });

    logger.warn('TikTok LIVE Access API requires approval', { communityId });
    return `${this.TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'TikTok',
      'OAuth token exchange - TikTok LIVE Access API requires special approval from TikTok. ' +
        'Apply at https://developers.tiktok.com/apps/'
    );
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'TikTok',
      'Token refresh - TikTok LIVE Access API requires special approval'
    );
  }

  async createStream(
    _communityId: string,
    _config: StreamConfig,
    _tokens: OAuthToken
  ): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'TikTok',
      'Stream creation - TikTok LIVE Access API requires special approval. ' +
        'Live streaming on TikTok must be initiated from the mobile app.'
    );
  }

  async startStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'TikTok',
      'Stream control - TikTok does not support programmatic stream start'
    );
  }

  async stopStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'TikTok',
      'Stream control - TikTok does not support programmatic stream stop'
    );
  }

  async getStreamStatus(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'TikTok',
      'Stream status - TikTok LIVE Access API requires special approval'
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
    throw new UnsupportedFeatureError('TikTok', 'message highlighting');
  }

  async sendChatMessage(): Promise<{
    status: 'success' | 'error' | 'unsupported';
    error?: string;
  }> {
    return { status: 'unsupported', error: 'TikTok chat replies are not supported.' };
  }
}

export const tiktokProvider = new TikTokProvider();
