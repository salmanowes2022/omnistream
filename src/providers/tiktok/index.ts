/**
 * TikTok streaming provider stub
 * TikTok uses RTMP streaming only - no OAuth support
 * Users manually provide RTMP server URL and stream key from TikTok Live app
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
import { logger } from '../../utils/logger.js';

export class TikTokProvider implements StreamProvider {
  readonly platform = Platform.TIKTOK;

  getAuthUrl(_communityId: string, _redirectUri: string): string {
    // TikTok does not support OAuth - users manually enter RTMP credentials
    logger.warn('TikTok does not support OAuth. Users must manually enter RTMP credentials.');
    throw new UnsupportedFeatureError(
      'TikTok',
      'OAuth is not supported. TikTok uses manual RTMP credentials only.'
    );
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
