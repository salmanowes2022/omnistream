/**
 * Types for unified posting system
 */

import { Platform } from '../core/interfaces.js';

/**
 * Credentials for posting to a platform
 */
export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  extra?: Record<string, unknown>;
}

/**
 * Request to post content to platforms
 */
export interface PostRequest {
  content: string;
  mediaUrl?: string;
  platforms: Platform[];
}

/**
 * Result of posting to a single platform
 */
export interface PlatformPostResult {
  status: 'posted' | 'failed' | 'unsupported';
  postUrl?: string;
  postId?: string;
  message?: string;
  error?: string;
}

/**
 * Response from unified post endpoint
 */
export interface PostResponse {
  success: boolean;
  results: Record<Platform, PlatformPostResult>;
}

/**
 * Data needed for platform posting
 */
export interface PostData {
  content: string;
  mediaUrl?: string;
  credentials: PlatformCredentials;
}
