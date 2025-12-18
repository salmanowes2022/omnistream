/**
 * Platform Capabilities Configuration
 * Defines what features each platform supports
 */

import { Platform } from '../core/interfaces.js';

export interface PlatformCapabilities {
  posting: boolean;
  scheduling: boolean;
  streaming: boolean;
  chat: boolean;
}

export const PLATFORM_CAPABILITIES: Record<Platform, PlatformCapabilities> = {
  [Platform.YOUTUBE]: {
    posting: false, // YouTube doesn't support posting via API
    scheduling: true, // Can schedule broadcasts
    streaming: true, // RTMP streaming supported
    chat: true, // Can read chat
  },
  [Platform.FACEBOOK]: {
    posting: true, // Can post to pages
    scheduling: true, // Can schedule posts
    streaming: true, // RTMP streaming supported
    chat: true, // Can read comments
  },
  [Platform.INSTAGRAM]: {
    posting: true, // Can post images
    scheduling: false, // Only via Business Suite
    streaming: false, // Not supported
    chat: false, // Not supported
  },
  [Platform.TWITTER]: {
    posting: true, // Can tweet
    scheduling: false, // Requires Premium API
    streaming: false, // Not supported
    chat: false, // Not supported
  },
  [Platform.TELEGRAM]: {
    posting: true, // Can send messages
    scheduling: false, // External scheduling needed
    streaming: false, // Not supported
    chat: true, // Full bidirectional support
  },
  [Platform.TIKTOK]: {
    posting: false, // Not supported
    scheduling: false, // Not supported
    streaming: true, // RTMP only
    chat: false, // Not supported
  },
};

/**
 * Check if a platform supports a specific feature
 */
export function platformSupports(platform: Platform, feature: keyof PlatformCapabilities): boolean {
  return PLATFORM_CAPABILITIES[platform]?.[feature] ?? false;
}

/**
 * Filter platforms that support a specific feature
 */
export function filterPlatformsByCapability(
  platforms: Platform[],
  feature: keyof PlatformCapabilities
): Platform[] {
  return platforms.filter((platform) => platformSupports(platform, feature));
}

/**
 * Get platforms that don't support a feature from a list
 */
export function getUnsupportedPlatforms(
  platforms: Platform[],
  feature: keyof PlatformCapabilities
): Platform[] {
  return platforms.filter((platform) => !platformSupports(platform, feature));
}
