/**
 * WebSocket server for real-time chat
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { db } from '../database/index.js';
import { providerRegistry } from '../providers/index.js';
import { logger } from '../utils/logger.js';
import { Platform, ChatMessage } from '../core/interfaces.js';

interface ChatClient {
  ws: WebSocket;
  streamId: string;
  communityId: string;
  lastMessageTime: Date;
}

interface WebSocketMessage {
  type: string;
  streamId?: string;
  communityId?: string;
  messageId?: string;
  platform?: string;
  [key: string]: unknown;
}

export class ChatServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ChatClient> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private enablePolling: boolean;

  constructor(server: Server, options?: { enablePolling?: boolean }) {
    this.enablePolling = options?.enablePolling ?? true;
    this.wss = new WebSocketServer({ server, path: '/ws/chat' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected');

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'Connected to Omnistream chat server',
        })
      );

      ws.on('message', (data: string) => {
        void (async () => {
          try {
            const message = JSON.parse(data.toString());
            await this.handleMessage(ws, message);
          } catch (error) {
            logger.error('WebSocket message error', error as Error);
            ws.send(
              JSON.stringify({
                type: 'error',
                error: 'Invalid message format',
              })
            );
          }
        })();
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', error);
        this.handleDisconnect(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws);
        break;
      case 'highlight':
        await this.handleHighlight(ws, message);
        break;
      case 'sendMessage':
        await this.handleSendMessage(ws, message);
        break;
      default:
        ws.send(
          JSON.stringify({
            type: 'error',
            error: 'Unknown message type',
          })
        );
    }
  }

  private async handleSubscribe(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const { streamId, communityId } = message;

    if (!streamId || !communityId) {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'streamId and communityId are required',
        })
      );
      return;
    }

    try {
      // Verify community exists
      const community = await db.getCommunityById(communityId);

      // Verify stream exists and belongs to community
      const stream = await db.getStream(streamId);
      if (stream.communityId !== community.id) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: 'Stream not found',
          })
        );
        return;
      }

      // Unsubscribe from previous stream if any
      this.handleUnsubscribe(ws);

      // Subscribe to stream
      this.clients.set(ws, {
        ws,
        streamId,
        communityId: community.id,
        lastMessageTime: new Date(),
      });

      // Start polling for this stream if not already polling
      if (this.enablePolling && !this.pollIntervals.has(streamId)) {
        this.startPolling(streamId, community.id);
      }

      ws.send(
        JSON.stringify({
          type: 'subscribed',
          streamId,
        })
      );

      logger.info('Client subscribed to stream', { streamId, communityId: community.id });
    } catch (error) {
      logger.error('Subscribe error', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Authentication failed',
        })
      );
    }
  }

  private handleUnsubscribe(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      this.clients.delete(ws);

      // Stop polling if no more clients for this stream
      const hasOtherClients = Array.from(this.clients.values()).some(
        (c) => c.streamId === client.streamId
      );

      if (!hasOtherClients) {
        this.stopPolling(client.streamId);
      }

      ws.send(
        JSON.stringify({
          type: 'unsubscribed',
        })
      );

      logger.info('Client unsubscribed from stream', { streamId: client.streamId });
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    this.handleUnsubscribe(ws);
    logger.info('WebSocket client disconnected');
  }

  private async handleHighlight(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Not subscribed to any stream',
        })
      );
      return;
    }

    const { messageId, platform } = message;

    if (!messageId || !platform) {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'messageId and platform are required',
        })
      );
      return;
    }

    try {
      // Update message in database
      await db.updateChatMessage(client.streamId, messageId, { highlighted: true });

      // Try to highlight on platform
      const platformType = platform as Platform;
      const provider = providerRegistry.getProvider(platformType);
      const tokens = await db.getOAuthTokens(client.communityId, platformType);
      const platformStreams = await db.getPlatformStreams(client.streamId);
      const platformStream = platformStreams.find((ps) => ps.platform === platformType);

      if (platformStream) {
        try {
          await provider.highlightMessage(
            platformStream.platformStreamId,
            messageId,
            tokens.tokens
          );
        } catch (error) {
          // Platform may not support highlighting
          logger.warn('Message highlight not supported', { platform, error });
        }
      }

      // Broadcast highlight to all connected clients
      this.broadcastToStream(client.streamId, {
        type: 'messageHighlighted',
        messageId,
        platform,
      });

      ws.send(
        JSON.stringify({
          type: 'highlighted',
          messageId,
        })
      );
    } catch (error) {
      logger.error('Highlight error', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Failed to highlight message',
        })
      );
    }
  }

  private async handleSendMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Not subscribed to any stream',
        })
      );
      return;
    }

    const { text } = message;

    if (!text || typeof text !== 'string') {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Message text is required',
        })
      );
      return;
    }

    try {
      // Create a chat message object to save and broadcast
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        streamId: client.streamId,
        platform: Platform.TELEGRAM, // Assume Telegram for now
        authorId: 'system',
        authorName: 'You',
        message: text,
        timestamp: new Date(),
      };

      // Save message to database
      await db.saveChatMessage(chatMessage);

      // Broadcast to all connected clients
      this.broadcastToStream(client.streamId, {
        type: 'message',
        message: chatMessage,
      });

      // Send success response
      ws.send(
        JSON.stringify({
          type: 'messageSent',
          success: true,
          message: chatMessage,
        })
      );

      logger.info('Message sent', { streamId: client.streamId, text });
    } catch (error) {
      logger.error('Send message error', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Failed to send message',
        })
      );
    }
  }

  private startPolling(streamId: string, communityId: string): void {
    const interval = setInterval(() => {
      void this.pollChatMessages(streamId, communityId);
    }, 3000); // Poll every 3 seconds

    this.pollIntervals.set(streamId, interval);
    logger.info('Started polling for stream', { streamId });
  }

  private stopPolling(streamId: string): void {
    const interval = this.pollIntervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(streamId);
      logger.info('Stopped polling for stream', { streamId });
    }
  }

  private async pollChatMessages(streamId: string, communityId: string): Promise<void> {
    try {
      const platformStreams = await db.getPlatformStreams(streamId);

      for (const platformStream of platformStreams) {
        try {
          const provider = providerRegistry.getProvider(platformStream.platform);
          const tokens = await db.getOAuthTokens(communityId, platformStream.platform);

          // Get client's last message time
          const clients = Array.from(this.clients.values()).filter((c) => c.streamId === streamId);
          if (clients.length === 0) {
            continue;
          }

          const lastMessageTime = clients[0].lastMessageTime;

          const messages = await provider.getChatMessages(
            platformStream.platformStreamId,
            tokens.tokens,
            lastMessageTime
          );

          // Save messages to database and broadcast
          for (const message of messages) {
            // Override streamId with our internal streamId (provider uses platformStreamId)
            const chatMessage = { ...message, streamId };

            await db.saveChatMessage(chatMessage);

            this.broadcastToStream(streamId, {
              type: 'message',
              message: chatMessage,
            });
          }

          // Update last message time
          if (messages.length > 0) {
            const latestTime = messages[messages.length - 1].timestamp;
            clients.forEach((client) => {
              client.lastMessageTime = latestTime;
            });
          }
        } catch (error) {
          // Platform may not support chat or may have errors
          logger.warn(`Failed to fetch chat from ${platformStream.platform}`, error);
        }
      }
    } catch (error) {
      logger.error('Poll chat messages error', error);
    }
  }

  private broadcastToStream(streamId: string, data: Record<string, unknown>): void {
    const message = JSON.stringify(data);

    for (const client of this.clients.values()) {
      if (client.streamId === streamId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      // Stop all polling
      for (const interval of this.pollIntervals.values()) {
        clearInterval(interval);
      }
      this.pollIntervals.clear();

      // Forcefully terminate all client connections
      for (const client of this.clients.values()) {
        try {
          client.ws.terminate();
        } catch {
          // Ignore termination errors
        }
      }
      this.clients.clear();

      // Close WebSocket server with timeout
      const timeout = setTimeout(() => {
        logger.info('Chat server close timeout, forcing closure');
        resolve();
      }, 1000);

      this.wss.close((err) => {
        clearTimeout(timeout);
        if (err) {
          logger.error('Chat server close error', err);
        } else {
          logger.info('Chat server closed');
        }
        resolve();
      });
    });
  }
}
