/**
 * SQLite database implementation using Prisma
 */

import { PrismaClient } from '@prisma/client';
import {
  ChatMessage,
  Community,
  CommunityOAuthTokens,
  OAuthToken,
  Platform,
  PlatformStream,
  StreamConfig,
  StreamStatus,
} from '../core/interfaces.js';
import { NotFoundError } from '../core/errors.js';

export class PrismaDatabase {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Community methods
  async createCommunity(name: string): Promise<Community> {
    const community = await this.prisma.community.create({
      data: {
        name,
      },
    });

    return {
      id: community.id,
      name: community.name,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt,
    };
  }

  async getCommunityById(id: string): Promise<Community> {
    const community = await this.prisma.community.findUnique({
      where: { id },
    });

    if (!community) {
      throw new NotFoundError(`Community not found: ${id}`);
    }

    return {
      id: community.id,
      name: community.name,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt,
    };
  }

  async listCommunities(): Promise<Community[]> {
    const communities = await this.prisma.community.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return communities.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  // OAuth token methods
  async saveOAuthTokens(tokens: CommunityOAuthTokens): Promise<void> {
    const tokenString = JSON.stringify({
      ...tokens.tokens,
      expiresAt: tokens.tokens.expiresAt.toISOString(),
    });

    await this.prisma.oAuthToken.upsert({
      where: {
        communityId_platform: {
          communityId: tokens.communityId,
          platform: tokens.platform,
        },
      },
      create: {
        communityId: tokens.communityId,
        platform: tokens.platform,
        tokens: tokenString, // SQLite: store as JSON string
        updatedAt: new Date(),
      },
      update: {
        tokens: tokenString, // SQLite: store as JSON string
        updatedAt: new Date(),
      },
    });
  }

  async saveOAuthToken(
    communityId: string,
    platform: Platform,
    tokens: OAuthToken
  ): Promise<void> {
    await this.saveOAuthTokens({
      communityId,
      platform,
      tokens,
      updatedAt: new Date(),
    });
  }

  async getOAuthTokens(communityId: string, platform: Platform): Promise<CommunityOAuthTokens> {
    const tokenRecord = await this.prisma.oAuthToken.findUnique({
      where: {
        communityId_platform: {
          communityId,
          platform,
        },
      },
    });

    if (!tokenRecord) {
      throw new NotFoundError(`No OAuth tokens found for community ${communityId} on ${platform}`);
    }

    const tokens = JSON.parse(tokenRecord.tokens) as {
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      scope: string[];
    }; // SQLite: parse JSON string

    return {
      communityId: tokenRecord.communityId,
      platform: platform as Platform,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(tokens.expiresAt),
        scope: Array.isArray(tokens.scope) ? tokens.scope : [],
      },
      updatedAt: tokenRecord.updatedAt,
    };
  }

  async getOAuthToken(communityId: string, platform: Platform): Promise<OAuthToken | null> {
    try {
      const tokenData = await this.getOAuthTokens(communityId, platform);
      return tokenData.tokens;
    } catch {
      return null;
    }
  }

  async deleteOAuthTokens(communityId: string, platform: Platform): Promise<void> {
    await this.prisma.oAuthToken.deleteMany({
      where: {
        communityId,
        platform,
      },
    });
  }

  // Stream methods
  async createStream(
    config: Omit<StreamConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StreamConfig> {
    const stream = await this.prisma.streamConfig.create({
      data: {
        communityId: config.communityId,
        title: config.title,
        description: config.description,
        rtmpUrl: config.rtmpUrl,
        rtmpKey: config.rtmpKey,
        platforms: JSON.stringify(config.platforms), // SQLite: store as JSON string
        scheduledStartTime: config.scheduledStartTime,
      },
    });

    return {
      id: stream.id,
      communityId: stream.communityId,
      title: stream.title,
      description: stream.description || undefined,
      rtmpUrl: stream.rtmpUrl,
      rtmpKey: stream.rtmpKey,
      platforms: JSON.parse(stream.platforms) as Platform[], // SQLite: parse JSON string
      scheduledStartTime: stream.scheduledStartTime || undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }

  async getStream(id: string): Promise<StreamConfig> {
    const stream = await this.prisma.streamConfig.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError(`Stream not found: ${id}`);
    }

    return {
      id: stream.id,
      communityId: stream.communityId,
      title: stream.title,
      description: stream.description || undefined,
      rtmpUrl: stream.rtmpUrl,
      rtmpKey: stream.rtmpKey,
      platforms: JSON.parse(stream.platforms) as Platform[], // SQLite: parse JSON string
      scheduledStartTime: stream.scheduledStartTime || undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }

  async getStreamByRtmpKey(rtmpKey: string): Promise<StreamConfig | null> {
    const stream = await this.prisma.streamConfig.findFirst({
      where: { rtmpKey },
    });

    if (!stream) {
      return null;
    }

    return {
      id: stream.id,
      communityId: stream.communityId,
      title: stream.title,
      description: stream.description || undefined,
      rtmpUrl: stream.rtmpUrl,
      rtmpKey: stream.rtmpKey,
      platforms: JSON.parse(stream.platforms) as Platform[], // SQLite: parse JSON string
      scheduledStartTime: stream.scheduledStartTime || undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }

  async updateStream(id: string, updates: Partial<StreamConfig>): Promise<StreamConfig> {
    const updateData: any = {
      title: updates.title,
      description: updates.description,
      rtmpUrl: updates.rtmpUrl,
      rtmpKey: updates.rtmpKey,
      scheduledStartTime: updates.scheduledStartTime,
      updatedAt: new Date(),
    };

    if (updates.platforms) {
      updateData.platforms = JSON.stringify(updates.platforms);
    }

    const stream = await this.prisma.streamConfig.update({
      where: { id },
      data: updateData,
    });

    return {
      id: stream.id,
      communityId: stream.communityId,
      title: stream.title,
      description: stream.description || undefined,
      rtmpUrl: stream.rtmpUrl,
      rtmpKey: stream.rtmpKey,
      platforms: JSON.parse(stream.platforms) as Platform[], // SQLite: parse JSON string
      scheduledStartTime: stream.scheduledStartTime || undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }

  async listStreamsByCommunity(communityId: string): Promise<StreamConfig[]> {
    const streams = await this.prisma.streamConfig.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
    });

    return streams.map((stream) => ({
      id: stream.id,
      communityId: stream.communityId,
      title: stream.title,
      description: stream.description || undefined,
      rtmpUrl: stream.rtmpUrl,
      rtmpKey: stream.rtmpKey,
      platforms: JSON.parse(stream.platforms) as Platform[], // SQLite: parse JSON string
      scheduledStartTime: stream.scheduledStartTime || undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    }));
  }

  async deleteStream(id: string): Promise<void> {
    await this.prisma.streamConfig.delete({
      where: { id },
    });
  }

  // Platform stream methods
  async savePlatformStream(streamId: string, platformStream: PlatformStream): Promise<void> {
    await this.prisma.platformStream.upsert({
      where: {
        streamId_platform: {
          streamId,
          platform: platformStream.platform,
        },
      },
      create: {
        streamId,
        platform: platformStream.platform,
        platformStreamId: platformStream.platformStreamId,
        status: platformStream.status,
        viewerCount: platformStream.viewerCount,
        platformUrl: platformStream.streamUrl,
        rtmpUrl: platformStream.rtmpUrl,
        streamKey: platformStream.streamKey,
        liveUrl: platformStream.liveUrl,
        metadata: platformStream.metadata ? JSON.stringify(platformStream.metadata) : undefined,
        error: platformStream.error,
        updatedAt: new Date(),
      },
      update: {
        platformStreamId: platformStream.platformStreamId,
        status: platformStream.status,
        viewerCount: platformStream.viewerCount,
        platformUrl: platformStream.streamUrl,
        rtmpUrl: platformStream.rtmpUrl,
        streamKey: platformStream.streamKey,
        liveUrl: platformStream.liveUrl,
        metadata: platformStream.metadata ? JSON.stringify(platformStream.metadata) : undefined,
        error: platformStream.error,
        updatedAt: new Date(),
      },
    });
  }

  async getPlatformStreams(streamId: string): Promise<PlatformStream[]> {
    const platformStreams = await this.prisma.platformStream.findMany({
      where: { streamId },
    });

    return platformStreams.map((ps) => ({
      platform: ps.platform as Platform,
      platformStreamId: ps.platformStreamId || '',
      streamUrl: ps.platformUrl || undefined,
      rtmpUrl: ps.rtmpUrl || undefined,
      streamKey: ps.streamKey || undefined,
      liveUrl: ps.liveUrl || undefined,
      status: ps.status as StreamStatus,
      viewerCount: ps.viewerCount || undefined,
      error: ps.error || undefined,
      metadata: ps.metadata ? (JSON.parse(ps.metadata) as Record<string, unknown>) : undefined,
    }));
  }

  async getPlatformStream(
    streamId: string,
    platform: Platform
  ): Promise<PlatformStream | undefined> {
    const platformStream = await this.prisma.platformStream.findUnique({
      where: {
        streamId_platform: {
          streamId,
          platform,
        },
      },
    });

    if (!platformStream) {
      return undefined;
    }

    return {
      platform: platformStream.platform as Platform,
      platformStreamId: platformStream.platformStreamId || '',
      streamUrl: platformStream.platformUrl || undefined,
      rtmpUrl: platformStream.rtmpUrl || undefined,
      streamKey: platformStream.streamKey || undefined,
      liveUrl: platformStream.liveUrl || undefined,
      status: platformStream.status as StreamStatus,
      viewerCount: platformStream.viewerCount || undefined,
      error: platformStream.error || undefined,
      metadata: platformStream.metadata
        ? (JSON.parse(platformStream.metadata) as Record<string, unknown>)
        : undefined,
    };
  }

  // Chat message methods
  async saveChatMessage(message: ChatMessage): Promise<void> {
    await this.prisma.chatMessage.create({
      data: {
        id: message.id,
        streamId: message.streamId,
        platform: message.platform,
        platformMessageId: message.id,
        authorId: message.authorId,
        authorName: message.authorName,
        authorImageUrl: message.authorImageUrl,
        message: message.message,
        timestamp: message.timestamp,
        metadata: message.highlighted ? JSON.stringify({ highlighted: true }) : undefined, // SQLite: JSON string
      },
    });
  }

  async addChatMessage(data: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        streamId: data.streamId,
        platform: data.platform,
        platformMessageId: undefined,
        authorId: data.authorId,
        authorName: data.authorName,
        authorImageUrl: data.authorImageUrl,
        message: data.message,
        timestamp: data.timestamp,
        metadata: data.highlighted ? JSON.stringify({ highlighted: true }) : undefined, // SQLite: JSON string
      },
    });

    const metadata = chatMessage.metadata ? (JSON.parse(chatMessage.metadata) as { highlighted?: boolean }) : null; // SQLite: parse JSON string

    return {
      id: chatMessage.id,
      streamId: chatMessage.streamId,
      platform: chatMessage.platform as Platform,
      authorId: chatMessage.authorId,
      authorName: chatMessage.authorName,
      authorImageUrl: chatMessage.authorImageUrl || undefined,
      message: chatMessage.message,
      timestamp: chatMessage.timestamp,
      highlighted: metadata?.highlighted || false,
    };
  }

  async getChatMessages(streamId: string, since?: Date): Promise<ChatMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        streamId,
        ...(since && { timestamp: { gt: since } }),
      },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((msg) => {
      const metadata = msg.metadata ? (JSON.parse(msg.metadata) as { highlighted?: boolean }) : null; // SQLite: parse JSON string
      return {
        id: msg.id,
        streamId: msg.streamId,
        platform: msg.platform as Platform,
        authorId: msg.authorId,
        authorName: msg.authorName,
        authorImageUrl: msg.authorImageUrl || undefined,
        message: msg.message,
        timestamp: msg.timestamp,
        highlighted: metadata?.highlighted || false,
      };
    });
  }

  async updateChatMessage(
    _streamId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<ChatMessage> {
    const message = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        message: updates.message,
        metadata: updates.highlighted ? JSON.stringify({ highlighted: true }) : undefined, // SQLite: JSON string
      },
    });

    const metadata = message.metadata ? (JSON.parse(message.metadata) as { highlighted?: boolean }) : null; // SQLite: parse JSON string

    return {
      id: message.id,
      streamId: message.streamId,
      platform: message.platform as Platform,
      authorId: message.authorId,
      authorName: message.authorName,
      authorImageUrl: message.authorImageUrl || undefined,
      message: message.message,
      timestamp: message.timestamp,
      highlighted: metadata?.highlighted || false,
    };
  }

  // Test utilities
  clearAll(): void {
    // For testing purposes - not recommended for production
    // Use with caution
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const prisma = new PrismaClient();
