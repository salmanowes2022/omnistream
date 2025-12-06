/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Telegram platform adapter
 * Handles Telegram bot connection via bot token validation
 */

import axios from 'axios';
import { logger } from '../../utils/logger.js';
import { PlatformError, ValidationError } from '../../core/errors.js';

export interface TelegramBotInfo {
  id: number;
  isBot: boolean;
  firstName: string;
  username: string;
  canJoinGroups: boolean;
  canReadAllGroupMessages: boolean;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  date: number;
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
}

export interface TelegramConnectionData {
  botToken: string;
  botUsername: string;
  botId: string;
  channelId: string;
}

export class TelegramAdapter {
  /**
   * Validate Telegram bot token by calling getMe endpoint
   */
  async validateBotToken(botToken: string): Promise<TelegramBotInfo> {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);

      if (!response.data.ok) {
        throw new ValidationError('Invalid Telegram bot token');
      }

      const bot = response.data.result;

      if (!bot.is_bot) {
        throw new ValidationError('Token does not belong to a bot');
      }

      return {
        id: bot.id,
        isBot: bot.is_bot,
        firstName: bot.first_name,
        username: bot.username,
        canJoinGroups: bot.can_join_groups,
        canReadAllGroupMessages: bot.can_read_all_group_messages,
      };
    } catch (error) {
      logger.error('Telegram bot token validation failed', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 404) {
          throw new ValidationError('Invalid Telegram bot token');
        }
        const message = error.response?.data?.description || error.message;
        throw new PlatformError('Telegram', `Token validation failed: ${message}`, 500, error);
      }

      throw error;
    }
  }

  /**
   * Validate channel/chat ID by attempting to get chat info
   */
  async validateChannelId(botToken: string, channelId: string): Promise<boolean> {
    try {
      // Channel IDs should start with -100 for supergroups/channels
      if (!channelId.startsWith('-')) {
        throw new ValidationError(
          'Invalid channel ID format. Channel IDs should start with a minus sign (e.g., -1001234567890)'
        );
      }

      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getChat`, {
        params: {
          chat_id: channelId,
        },
      });

      if (!response.data.ok) {
        throw new ValidationError('Unable to access the specified channel');
      }

      const chat = response.data.result;

      // Verify it's a channel or supergroup
      if (chat.type !== 'channel' && chat.type !== 'supergroup') {
        throw new ValidationError(
          `Invalid chat type: ${chat.type}. Only channels and supergroups are supported.`
        );
      }

      logger.info('Telegram channel validated', {
        channelId,
        channelTitle: chat.title,
        type: chat.type,
      });

      return true;
    } catch (error) {
      logger.error('Telegram channel validation failed', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new ValidationError(
            'Bot does not have access to this channel. Make sure the bot is added as an administrator.'
          );
        }
        const message = error.response?.data?.description || error.message;
        throw new PlatformError('Telegram', `Channel validation failed: ${message}`, 500, error);
      }

      throw error;
    }
  }

  /**
   * Connect Telegram bot and validate both token and channel
   */
  async connect(botToken: string, channelId: string): Promise<TelegramConnectionData> {
    try {
      // Step 1: Validate bot token
      const botInfo = await this.validateBotToken(botToken);

      // Step 2: Validate channel access
      await this.validateChannelId(botToken, channelId);

      logger.info('Telegram connection successful', {
        botUsername: botInfo.username,
        channelId,
      });

      return {
        botToken,
        botUsername: botInfo.username,
        botId: botInfo.id.toString(),
        channelId,
      };
    } catch (error) {
      logger.error('Telegram connection failed', error);
      throw error;
    }
  }

  /**
   * Send a test message to verify connection
   */
  async sendTestMessage(botToken: string, channelId: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: channelId,
        text: message,
        parse_mode: 'Markdown',
      });

      return response.data.ok;
    } catch (error) {
      logger.error('Telegram test message failed', error);
      throw new PlatformError('Telegram', 'Failed to send test message', 500, error);
    }
  }

  /**
   * Disconnect - No server-side action needed for Telegram
   */
  async disconnect(): Promise<void> {
    // Telegram doesn't require token revocation
    // Just log the disconnection
    logger.info('Telegram account disconnected');
  }

  /**
   * Validate that a Telegram connection is still active
   */
  async validateConnection(botToken: string): Promise<boolean> {
    try {
      await this.validateBotToken(botToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Post a message to Telegram channel with optional media
   */
  async post(params: {
    content: string;
    mediaUrl?: string;
    credentials: { accessToken: string; refreshToken?: string; extra?: unknown };
  }): Promise<{ status: string; postId?: string; error?: string }> {
    try {
      const { content, mediaUrl, credentials } = params;

      // Extract bot token and channel ID from credentials
      const botToken = credentials.accessToken;
      const channelId = (credentials.extra as { channelId?: string })?.channelId;

      if (!channelId) {
        return {
          status: 'failed',
          error: 'Channel ID not found in credentials',
        };
      }

      let messageId: number;

      // Send with or without media
      if (mediaUrl) {
        // Check if it's an image or video based on URL extension
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl);
        const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(mediaUrl);

        if (isImage) {
          // Send photo with caption
          const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            chat_id: channelId,
            photo: mediaUrl,
            caption: content,
            parse_mode: 'Markdown',
          });
          messageId = response.data.result.message_id;
        } else if (isVideo) {
          // Send video with caption
          const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendVideo`, {
            chat_id: channelId,
            video: mediaUrl,
            caption: content,
            parse_mode: 'Markdown',
          });
          messageId = response.data.result.message_id;
        } else {
          // Send as document if unknown type
          const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendDocument`,
            {
              chat_id: channelId,
              document: mediaUrl,
              caption: content,
              parse_mode: 'Markdown',
            }
          );
          messageId = response.data.result.message_id;
        }
      } else {
        // Send text-only message
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: channelId,
          text: content,
          parse_mode: 'Markdown',
        });
        messageId = response.data.result.message_id;
      }

      logger.info('Telegram message posted successfully', { channelId, messageId });

      return {
        status: 'posted',
        postId: messageId.toString(),
      };
    } catch (error) {
      logger.error('Telegram post failed', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.description || error.message;
        return {
          status: 'failed',
          error: `Failed to post to Telegram: ${message}`,
        };
      }
      return {
        status: 'failed',
        error: 'Failed to post to Telegram',
      };
    }
  }

  /**
   * Fetch chat messages from a Telegram channel
   * Uses getUpdates API to retrieve new messages
   */
  async fetchChatMessages(
    channelId: string,
    botToken: string,
    lastMessageTime?: Date
  ): Promise<
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
    try {
      // Use getUpdates to fetch new messages
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
        params: {
          allowed_updates: ['message', 'channel_post'],
          timeout: 0,
        },
      });

      if (!response.data.ok) {
        logger.error('Telegram getUpdates failed', { error: response.data.description });
        return [];
      }

      const updates = (response.data.result || []) as TelegramUpdate[];
      const messages = [];

      for (const update of updates) {
        const msg = update.message || update.channel_post;

        if (!msg || msg.chat.id.toString() !== channelId) {
          continue;
        }

        const messageTime = new Date(msg.date * 1000);

        // Filter by time if provided
        if (lastMessageTime && messageTime <= lastMessageTime) {
          continue;
        }

        // Only process text messages
        if (!msg.text) {
          continue;
        }

        messages.push({
          id: msg.message_id.toString(),
          streamId: channelId,
          platform: 'telegram',
          authorId: msg.from?.id?.toString() || 'unknown',
          authorName: msg.from?.username || msg.from?.first_name || 'Unknown',
          authorImageUrl: undefined, // Telegram doesn't provide profile pictures via getUpdates
          message: msg.text,
          timestamp: messageTime,
        });
      }

      return messages;
    } catch (error) {
      logger.error('Telegram fetchChatMessages failed', error);
      return [];
    }
  }

  /**
   * Send a chat message to a Telegram channel
   */
  async sendChatMessage(
    channelId: string,
    text: string,
    botToken: string
  ): Promise<{ status: 'success' | 'error'; error?: string }> {
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: channelId,
        text,
      });

      if (response.data.ok) {
        return { status: 'success' };
      } else {
        return {
          status: 'error',
          error: response.data.description || 'Failed to send message',
        };
      }
    } catch (error) {
      logger.error('Telegram sendChatMessage failed', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.description || error.message;
        return {
          status: 'error',
          error: `Failed to send message: ${message}`,
        };
      }
      return {
        status: 'error',
        error: 'Failed to send message',
      };
    }
  }

  /**
   * Schedule a Telegram post
   * Note: Telegram Bot API does not support native post scheduling
   * Posts would need to be scheduled using an external scheduler and stored in database
   */
  scheduleEvent(_params: {
    title: string;
    description?: string;
    scheduledAt: Date;
    credentials: { accessToken: string; extra?: { botToken?: string; channelId?: string } };
  }): Promise<{ status: string; postId?: string; error?: string }> {
    logger.warn('Telegram does not support native scheduled posts via Bot API');

    return Promise.resolve({
      status: 'unsupported',
      error:
        'Telegram Bot API does not support scheduled posts. Use an external scheduler to delay message sending.',
    });
  }
}

export const telegramAdapter = new TelegramAdapter();
