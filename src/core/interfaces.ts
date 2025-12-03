/**
 * Core interfaces for omnistream multi-platform streaming
 */

/**
 * Supported streaming platforms
 */
export enum Platform {
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  TELEGRAM = 'telegram',
}

/**
 * Stream status
 */
export enum StreamStatus {
  IDLE = 'idle',
  SCHEDULED = 'scheduled',
  STARTING = 'starting',
  LIVE = 'live',
  ENDED = 'ended',
  ERROR = 'error',
}

/**
 * OAuth token data
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string[];
}

/**
 * Community configuration
 */
export interface Community {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Platform-specific OAuth tokens for a community
 */
export interface CommunityOAuthTokens {
  communityId: string;
  platform: Platform;
  tokens: OAuthToken;
  updatedAt: Date;
}

/**
 * Stream configuration
 */
export interface StreamConfig {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  scheduledStartTime?: Date;
  rtmpUrl: string;
  rtmpKey: string;
  platforms: Platform[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Platform-specific stream information
 */
export interface PlatformStream {
  platform: Platform;
  platformStreamId: string;
  streamUrl?: string;
  status: StreamStatus;
  viewerCount?: number;
  error?: string;
  rtmpUrl?: string; // Platform's RTMP ingest URL (e.g., YouTube's rtmps://...)
  streamKey?: string; // Platform's stream key for RTMP ingestion
  liveUrl?: string; // Public watch URL when stream is live
  metadata?: Record<string, unknown>; // Platform-specific metadata
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  streamId: string;
  platform: Platform;
  authorId: string;
  authorName: string;
  authorImageUrl?: string;
  message: string;
  timestamp: Date;
  highlighted?: boolean;
}

/**
 * Stream statistics
 */
export interface StreamStats {
  streamId: string;
  platform: Platform;
  viewerCount: number;
  likeCount?: number;
  chatMessageCount: number;
  updatedAt: Date;
}

/**
 * Base provider interface that all platform providers must implement
 */
export interface StreamProvider {
  /**
   * Platform identifier
   */
  readonly platform: Platform;

  /**
   * Generate OAuth authorization URL
   * @param communityId - Community requesting authorization
   * @param redirectUri - OAuth callback URL
   * @returns Authorization URL
   */
  getAuthUrl(communityId: string, redirectUri: string): string;

  /**
   * Exchange authorization code for OAuth tokens
   * @param code - Authorization code from OAuth callback
   * @param redirectUri - OAuth callback URL (must match auth request)
   * @returns OAuth tokens
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthToken>;

  /**
   * Refresh expired OAuth tokens
   * @param refreshToken - Refresh token
   * @returns New OAuth tokens
   */
  refreshTokens(refreshToken: string): Promise<OAuthToken>;

  /**
   * Create a new live stream
   * @param communityId - Community creating the stream
   * @param config - Stream configuration
   * @param tokens - OAuth tokens for the platform
   * @returns Platform-specific stream information
   */
  createStream(
    communityId: string,
    config: StreamConfig,
    tokens: OAuthToken
  ): Promise<PlatformStream>;

  /**
   * Start a scheduled or created stream
   * @param platformStreamId - Platform-specific stream ID
   * @param tokens - OAuth tokens for the platform
   * @returns Updated platform stream information
   */
  startStream(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream>;

  /**
   * Stop/end a live stream
   * @param platformStreamId - Platform-specific stream ID
   * @param tokens - OAuth tokens for the platform
   * @returns Updated platform stream information
   */
  stopStream(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream>;

  /**
   * Get stream status and statistics
   * @param platformStreamId - Platform-specific stream ID
   * @param tokens - OAuth tokens for the platform
   * @returns Current stream information
   */
  getStreamStatus(platformStreamId: string, tokens: OAuthToken): Promise<PlatformStream>;

  /**
   * Get live chat messages
   * @param platformStreamId - Platform-specific stream ID
   * @param tokens - OAuth tokens for the platform
   * @param since - Only return messages after this timestamp
   * @returns Array of chat messages
   */
  getChatMessages(
    platformStreamId: string,
    tokens: OAuthToken,
    since?: Date
  ): Promise<ChatMessage[]>;

  /**
   * Highlight a chat message (if supported by platform)
   * @param platformStreamId - Platform-specific stream ID
   * @param messageId - Message to highlight
   * @param tokens - OAuth tokens for the platform
   * @returns Success status
   */
  highlightMessage(
    platformStreamId: string,
    messageId: string,
    tokens: OAuthToken
  ): Promise<boolean>;
}

/**
 * API Error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * API Success response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
