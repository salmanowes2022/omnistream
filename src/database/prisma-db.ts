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

const parseJsonField = <T>(value: unknown): T | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    return value as T;
  }
  return undefined;
};

export class PrismaDatabase {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Community methods
  async createCommunity(name: string, userId?: string): Promise<Community> {
    const community = await this.prisma.community.create({
      data: {
        name,
        userId: userId || '00000000-0000-0000-0000-000000000000', // Default to system user
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

  async listCommunitiesByUser(userId: string): Promise<Community[]> {
    const communities = await this.prisma.community.findMany({
      where: { userId },
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

  async saveOAuthToken(communityId: string, platform: Platform, tokens: OAuthToken): Promise<void> {
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

    const tokens = parseJsonField<{
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      scope: string[];
    }>(tokenRecord.tokens);

    if (!tokens) {
      throw new NotFoundError(`Invalid token data for community ${communityId} on ${platform}`);
    }

    return {
      communityId: tokenRecord.communityId,
      platform,
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
        platforms: JSON.stringify(config.platforms) as any,
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
      platforms: parseJsonField<Platform[]>(stream.platforms) || [],
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
      platforms: parseJsonField<Platform[]>(stream.platforms) || [],
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
      platforms: parseJsonField<Platform[]>(stream.platforms) || [],
      scheduledStartTime: stream.scheduledStartTime || undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }

  async updateStream(id: string, updates: Partial<StreamConfig>): Promise<StreamConfig> {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.rtmpUrl !== undefined) updateData.rtmpUrl = updates.rtmpUrl;
    if (updates.rtmpKey !== undefined) updateData.rtmpKey = updates.rtmpKey;
    if (updates.scheduledStartTime !== undefined)
      updateData.scheduledStartTime = updates.scheduledStartTime;
    if (updates.platforms !== undefined) updateData.platforms = JSON.stringify(updates.platforms);

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
      platforms: parseJsonField<Platform[]>(stream.platforms) || [],
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
      platforms: parseJsonField<Platform[]>(stream.platforms) || [],
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
        platformStreamId: platformStream.platformStreamId || '',
        status: platformStream.status,
        viewerCount: platformStream.viewerCount ?? null,
        platformUrl: platformStream.streamUrl ?? null,
        rtmpUrl: platformStream.rtmpUrl ?? null,
        streamKey: platformStream.streamKey ?? null,
        liveUrl: platformStream.liveUrl ?? null,
        metadata: platformStream.metadata ? JSON.stringify(platformStream.metadata) : null,
        error: platformStream.error ?? null,
        updatedAt: new Date(),
      },
      update: {
        platformStreamId: platformStream.platformStreamId || '',
        status: platformStream.status,
        viewerCount: platformStream.viewerCount ?? null,
        platformUrl: platformStream.streamUrl ?? null,
        rtmpUrl: platformStream.rtmpUrl ?? null,
        streamKey: platformStream.streamKey ?? null,
        liveUrl: platformStream.liveUrl ?? null,
        metadata: platformStream.metadata ? JSON.stringify(platformStream.metadata) : null,
        error: platformStream.error ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async getPlatformStreams(streamId: string): Promise<PlatformStream[]> {
    const platformStreams = await this.prisma.platformStream.findMany({
      where: { streamId },
    });

    return platformStreams.map((ps): PlatformStream => {
      const record = ps as any;
      return {
        platform: record.platform as Platform,
        platformStreamId: record.platformStreamId || '',
        streamUrl: record.platformUrl || undefined,
        rtmpUrl: record.rtmpUrl || undefined,
        streamKey: record.streamKey || undefined,
        liveUrl: record.liveUrl || undefined,
        status: record.status as StreamStatus,
        viewerCount: record.viewerCount || undefined,
        error: record.error || undefined,
        metadata: parseJsonField<Record<string, unknown>>(record.metadata),
      };
    });
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

    const record = platformStream as any;
    return {
      platform: record.platform as Platform,
      platformStreamId: record.platformStreamId || '',
      streamUrl: record.platformUrl || undefined,
      rtmpUrl: record.rtmpUrl || undefined,
      streamKey: record.streamKey || undefined,
      liveUrl: record.liveUrl || undefined,
      status: record.status as StreamStatus,
      viewerCount: record.viewerCount || undefined,
      error: record.error || undefined,
      metadata: parseJsonField<Record<string, unknown>>(record.metadata),
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

    const metadata = parseJsonField<{ highlighted?: boolean }>(chatMessage.metadata) || null; // SQLite/JSON: parse JSON value

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
      const metadata = parseJsonField<{ highlighted?: boolean }>(msg.metadata) || null; // SQLite/JSON: parse JSON value
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

    const metadata = parseJsonField<{ highlighted?: boolean }>(message.metadata) || null; // SQLite/JSON: parse JSON value

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
