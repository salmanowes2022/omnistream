/**
 * Provider registry
 * Central registry for all streaming platform providers
 */

import { Platform, StreamProvider } from '../core/interfaces.js';
import { youtubeProvider } from './youtube/index.js';
import { facebookProvider } from './facebook/index.js';
import { tiktokProvider } from './tiktok/index.js';
import { instagramProvider } from './instagram/index.js';
import { twitterProvider } from './twitter/index.js';
import { telegramProvider } from './telegram/index.js';
import { NotFoundError } from '../core/errors.js';

class ProviderRegistry {
  private providers: Map<Platform, StreamProvider> = new Map();

  constructor() {
    this.registerProvider(youtubeProvider);
    this.registerProvider(facebookProvider);
    this.registerProvider(tiktokProvider);
    this.registerProvider(instagramProvider);
    this.registerProvider(twitterProvider);
    this.registerProvider(telegramProvider);
  }

  private registerProvider(provider: StreamProvider): void {
    this.providers.set(provider.platform, provider);
  }

  getProvider(platform: Platform): StreamProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new NotFoundError(`Provider not found for platform: ${platform}`);
    }
    return provider;
  }

  getAllProviders(): StreamProvider[] {
    return Array.from(this.providers.values());
  }

  getSupportedPlatforms(): Platform[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
