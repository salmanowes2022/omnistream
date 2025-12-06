/**
 * Telegram streaming provider implementation
 * Telegram uses bot-based streaming with limited API support
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

export class TelegramProvider implements StreamProvider {
  readonly platform = Platform.TELEGRAM;

  getAuthUrl(_communityId: string, _redirectUri: string): string {
    throw new UnsupportedFeatureError(
      'Telegram',
      'OAuth - Telegram uses bot tokens instead of OAuth. ' +
        'Create a bot via @BotFather on Telegram and use the bot token for authentication.'
    );
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'Telegram',
      'OAuth - Telegram uses bot tokens instead of OAuth'
    );
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthToken> {
    throw new UnsupportedFeatureError(
      'Telegram',
      'Token refresh - Telegram bot tokens do not expire'
    );
  }

  async createStream(
    _communityId: string,
    _config: StreamConfig,
    _tokens: OAuthToken
  ): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Telegram',
      'Stream creation - Telegram does not provide a live streaming API. ' +
        'Use Telegram for chat integration only.'
    );
  }

  async startStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Telegram',
      'Stream control - Telegram does not support live streaming'
    );
  }

  async stopStream(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Telegram',
      'Stream control - Telegram does not support live streaming'
    );
  }

  async getStreamStatus(_platformStreamId: string, _tokens: OAuthToken): Promise<PlatformStream> {
    throw new UnsupportedFeatureError(
      'Telegram',
      'Stream status - Telegram does not support live streaming'
    );
  }

  async getChatMessages(
    _platformStreamId: string,
    _tokens: OAuthToken,
    _since?: Date
  ): Promise<ChatMessage[]> {
    // Chat messages are handled by the adapter, not the provider
    // Return empty array as the adapter implements fetchChatMessages directly
    return [];
  }

  async highlightMessage(
    _platformStreamId: string,
    _messageId: string,
    _tokens: OAuthToken
  ): Promise<boolean> {
    throw new UnsupportedFeatureError('Telegram', 'message highlighting');
  }
}

export const telegramProvider = new TelegramProvider();
