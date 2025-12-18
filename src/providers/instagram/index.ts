/**
 * Instagram streaming provider stub
 * Instagram does NOT have an official live streaming API
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

export class InstagramProvider implements StreamProvider {
  readonly platform = Platform.INSTAGRAM;

  getAuthUrl(_communityId: string, _redirectUri: string): string {
    throw new UnsupportedFeatureError(
      'Instagram',
      'OAuth - Instagram does not provide an official live streaming API. ' +
        'Live streaming on Instagram must be done through the mobile app.'
    );
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'Instagram',
      'OAuth - Instagram does not provide an official live streaming API'
    );
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'Instagram',
      'Token refresh - Instagram does not provide an official live streaming API'
    );
  }

  async createStream(
    _communityId: string,
    _config: StreamConfig,
    _tokens: OAuthToken
  ): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Instagram',
      'Stream creation - Instagram does not provide an official live streaming API. ' +
        'Live streaming must be initiated from the Instagram mobile app.'
    );
  }

  async startStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Instagram',
      'Stream control - Instagram does not provide an official live streaming API'
    );
  }

  async stopStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Instagram',
      'Stream control - Instagram does not provide an official live streaming API'
    );
  }

  async getStreamStatus(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Instagram',
      'Stream status - Instagram does not provide an official live streaming API'
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
    throw new UnsupportedFeatureError('Instagram', 'message highlighting');
  }

  async sendChatMessage(): Promise<{
    status: 'success' | 'error' | 'unsupported';
    error?: string;
  }> {
    return { status: 'unsupported', error: 'Instagram chat messages are not supported.' };
  }
}

export const instagramProvider = new InstagramProvider();
