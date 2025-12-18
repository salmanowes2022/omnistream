/**
 * OAuth configuration validator
 * Helps detect common OAuth configuration issues before they cause runtime errors
 */

import { config } from './config.js';
import { logger } from './logger.js';

export interface OAuthValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export class OAuthConfigValidator {
  /**
   * Validates OAuth configuration and returns validation results
   */
  static validate(): OAuthValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate YouTube configuration
    this.validateYouTubeConfig(warnings, errors);

    // Validate Facebook configuration
    this.validateFacebookConfig(warnings, errors);

    // Note: TikTok uses RTMP only, no OAuth validation needed

    // Check for environment-specific issues
    this.validateEnvironmentSpecificIssues(warnings, errors);

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Validates OAuth configuration and logs warnings/errors
   */
  static validateAndLog(): boolean {
    const result = this.validate();

    if (result.warnings.length > 0) {
      logger.warn('OAuth configuration warnings detected:');
      result.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
    }

    if (result.errors.length > 0) {
      logger.error('OAuth configuration errors detected:');
      result.errors.forEach((error) => logger.error(`  - ${error}`));
    }

    if (result.isValid && result.warnings.length === 0) {
      logger.info('OAuth configuration validated successfully');
    }

    return result.isValid;
  }

  private static validateYouTubeConfig(warnings: string[], errors: string[]): void {
    if (!config.youtube.clientId || config.youtube.clientId === '') {
      warnings.push('YOUTUBE_CLIENT_ID is not configured. YouTube OAuth will not work.');
    }

    if (!config.youtube.clientSecret || config.youtube.clientSecret === '') {
      warnings.push('YOUTUBE_CLIENT_SECRET is not configured. YouTube OAuth will not work.');
    }

    if (!config.youtube.redirectUri || config.youtube.redirectUri === '') {
      errors.push('YOUTUBE_REDIRECT_URI is not configured.');
    } else {
      this.validateRedirectUri('YouTube', config.youtube.redirectUri, warnings, errors);
    }
  }

  private static validateFacebookConfig(warnings: string[], errors: string[]): void {
    if (!config.facebook.appId || config.facebook.appId === '') {
      warnings.push('FACEBOOK_APP_ID is not configured. Facebook OAuth will not work.');
    }

    if (!config.facebook.appSecret || config.facebook.appSecret === '') {
      warnings.push('FACEBOOK_APP_SECRET is not configured. Facebook OAuth will not work.');
    }

    if (!config.facebook.redirectUri || config.facebook.redirectUri === '') {
      errors.push('FACEBOOK_REDIRECT_URI is not configured.');
    } else {
      this.validateRedirectUri('Facebook', config.facebook.redirectUri, warnings, errors);
    }
  }

  // TikTok validation removed - TikTok uses RTMP only, no OAuth

  private static validateRedirectUri(
    platform: string,
    redirectUri: string,
    warnings: string[],
    errors: string[]
  ): void {
    try {
      const url = new URL(redirectUri);

      // Check for HTTPS in production
      if (config.nodeEnv === 'production' && url.protocol !== 'https:') {
        errors.push(
          `${platform} redirect URI must use HTTPS in production. Current: ${url.protocol}`
        );
      }

      // Check for localhost in production
      if (
        config.nodeEnv === 'production' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        errors.push(
          `${platform} redirect URI uses localhost in production. This will not work for external users.`
        );
      }

      // Warn about GitHub Codespaces URLs
      if (url.hostname.includes('github.dev')) {
        warnings.push(
          `${platform} redirect URI contains GitHub Codespaces URL (${url.hostname}). ` +
            'This will only work within the Codespace. ' +
            'For local development, update your .env file with a localhost URL ' +
            'and add it to your OAuth provider configuration.'
        );
      }

      // Warn about ngrok or similar tunneling services
      if (url.hostname.includes('ngrok') || url.hostname.includes('localtunnel')) {
        warnings.push(
          `${platform} redirect URI uses a tunneling service (${url.hostname}). ` +
            'These URLs may change frequently and require OAuth provider updates.'
        );
      }

      // Validate path
      const expectedPaths: Record<string, string> = {
        YouTube: '/api/v1/auth/youtube/callback',
        Facebook: '/api/v1/auth/facebook/callback',
      };

      const expectedPath = expectedPaths[platform];
      if (expectedPath && !url.pathname.endsWith(expectedPath)) {
        errors.push(
          `${platform} redirect URI path should end with '${expectedPath}'. Current: ${url.pathname}`
        );
      }
    } catch {
      errors.push(`${platform} redirect URI is not a valid URL: ${redirectUri}`);
    }
  }

  private static validateEnvironmentSpecificIssues(warnings: string[], _errors: string[]): void {
    // Check for mismatched environments
    const youtubeUrl = this.parseUrl(config.youtube.redirectUri);
    const facebookUrl = this.parseUrl(config.facebook.redirectUri);

    const hosts = [youtubeUrl?.hostname, facebookUrl?.hostname].filter(Boolean);

    // Check if all hosts are different (might indicate configuration issue)
    const uniqueHosts = new Set(hosts);
    if (uniqueHosts.size > 1) {
      warnings.push(
        'OAuth redirect URIs use different hostnames. This is unusual and may indicate a configuration error. ' +
          `Hosts: ${Array.from(uniqueHosts).join(', ')}`
      );
    }

    // Check if NODE_ENV matches the redirect URI environment
    if (config.nodeEnv === 'development') {
      const hasNonLocalhost = hosts.some(
        (host) =>
          host &&
          host !== 'localhost' &&
          host !== '127.0.0.1' &&
          !host.includes('github.dev') &&
          !host.includes('.local')
      );

      if (hasNonLocalhost) {
        warnings.push(
          'NODE_ENV is set to "development" but redirect URIs use non-localhost domains. ' +
            'This may cause OAuth to fail if the server is not accessible at those domains.'
        );
      }
    }
  }

  private static parseUrl(urlString: string): URL | null {
    try {
      return new URL(urlString);
    } catch {
      return null;
    }
  }
}
