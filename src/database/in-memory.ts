/**
 * In-memory database for development
 * In production, this should be replaced with a real database (PostgreSQL, etc.)
 */

import {
  ChatMessage,
  Community,
  CommunityOAuthTokens,
  OAuthToken,
  Platform,
  PlatformStream,
  StreamConfig,
} from '../core/interfaces.js';
import { NotFoundError } from '../core/errors.js';
import crypto from 'crypto';

class Database {
  private communities: Map<string, Community> = new Map();
  private oauthTokens: Map<string, CommunityOAuthTokens> = new Map();
  private streams: Map<string, StreamConfig> = new Map();
  private platformStreams: Map<string, PlatformStream[]> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();

  // Community methods
  async createCommunity(name: string, _userId?: string): Promise<Community> {
    const id = crypto.randomUUID();
    const community: Community = {
      id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.communities.set(id, community);
    return community;
  }

  async getCommunityById(id: string): Promise<Community> {
    const community = this.communities.get(id);
    if (!community) {
      throw new NotFoundError(`Community not found: ${id}`);
    }
    return community;
  }

  async listCommunities(): Promise<Community[]> {
    return Array.from(this.communities.values());
  }

  async listCommunitiesByUser(_userId: string): Promise<Community[]> {
    // In-memory DB doesn't track userId, return all communities for compatibility
    return Array.from(this.communities.values());
  }

  // OAuth token methods
  async saveOAuthTokens(tokens: CommunityOAuthTokens): Promise<void> {
    const key = `${tokens.communityId}:${tokens.platform}`;
    this.oauthTokens.set(key, { ...tokens, updatedAt: new Date() });
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
    const key = `${communityId}:${platform}`;
    const tokens = this.oauthTokens.get(key);
    if (!tokens) {
      throw new NotFoundError(`No OAuth tokens found for community ${communityId} on ${platform}`);
    }
    return tokens;
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
    const key = `${communityId}:${platform}`;
    this.oauthTokens.delete(key);
  }

  // Stream methods
  async createStream(
    config: Omit<StreamConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StreamConfig> {
    const id = crypto.randomUUID();
    const stream: StreamConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.streams.set(id, stream);
    return stream;
  }

  async getStream(id: string): Promise<StreamConfig> {
    const stream = this.streams.get(id);
    if (!stream) {
      throw new NotFoundError(`Stream not found: ${id}`);
    }
    return stream;
  }

  async getStreamByRtmpKey(rtmpKey: string): Promise<StreamConfig | null> {
    const stream = Array.from(this.streams.values()).find((s) => s.rtmpKey === rtmpKey);
    return stream || null;
  }

  async updateStream(id: string, updates: Partial<StreamConfig>): Promise<StreamConfig> {
    const stream = await this.getStream(id);
    const updated = {
      ...stream,
      ...updates,
      updatedAt: new Date(),
    };
    this.streams.set(id, updated);
    return updated;
  }

  async listStreamsByCommunity(communityId: string): Promise<StreamConfig[]> {
    return Array.from(this.streams.values()).filter((s) => s.communityId === communityId);
  }

  async deleteStream(id: string): Promise<void> {
    this.streams.delete(id);
    this.platformStreams.delete(id);
    this.chatMessages.delete(id);
  }

  // Platform stream methods
  async savePlatformStream(streamId: string, platformStream: PlatformStream): Promise<void> {
    const existing = this.platformStreams.get(streamId) || [];
    const index = existing.findIndex((ps) => ps.platform === platformStream.platform);

    if (index >= 0) {
      existing[index] = platformStream;
    } else {
      existing.push(platformStream);
    }

    this.platformStreams.set(streamId, existing);
  }

  async getPlatformStreams(streamId: string): Promise<PlatformStream[]> {
    return this.platformStreams.get(streamId) || [];
  }

  async getPlatformStream(
    streamId: string,
    platform: Platform
  ): Promise<PlatformStream | undefined> {
    const streams = await this.getPlatformStreams(streamId);
    return streams.find((ps) => ps.platform === platform);
  }

  // Chat message methods
  async saveChatMessage(message: ChatMessage): Promise<void> {
    const messages = this.chatMessages.get(message.streamId) || [];
    messages.push(message);
    this.chatMessages.set(message.streamId, messages);
  }

  async addChatMessage(data: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const message: ChatMessage = {
      ...data,
      id: crypto.randomUUID(),
    };
    await this.saveChatMessage(message);
    return message;
  }

  async getChatMessages(streamId: string, since?: Date): Promise<ChatMessage[]> {
    const messages = this.chatMessages.get(streamId) || [];
    if (since) {
      return messages.filter((m) => m.timestamp > since);
    }
    return messages;
  }

  async updateChatMessage(
    streamId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<ChatMessage> {
    const messages = this.chatMessages.get(streamId) || [];
    const index = messages.findIndex((m) => m.id === messageId);

    if (index < 0) {
      throw new NotFoundError(`Message not found: ${messageId}`);
    }

    const updated = { ...messages[index], ...updates };
    messages[index] = updated;
    this.chatMessages.set(streamId, messages);
    return updated;
  }

  // Test utilities
  clearAll(): void {
    this.communities.clear();
    this.oauthTokens.clear();
    this.streams.clear();
    this.platformStreams.clear();
    this.chatMessages.clear();
  }
}

export class InMemoryDatabase extends Database {}

export const db = new Database();
