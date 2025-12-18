/**
 * OAuth authentication routes
 */

import express, { NextFunction, Request, Response } from 'express';
import { db } from '../../database/index.js';
import { providerRegistry } from '../../providers/index.js';
import { Platform } from '../../core/interfaces.js';
import { ValidationError } from '../../core/errors.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/v1/auth/:platform/authorize
 * Get OAuth authorization URL
 */
router.get('/:platform/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as Platform;
    const communityId = req.query.communityId as string;

    if (!communityId) {
      throw new ValidationError('communityId query parameter is required');
    }

    // Verify community exists
    await db.getCommunityById(communityId);

    const provider = providerRegistry.getProvider(platform);

    let redirectUri: string;
    switch (platform) {
      case Platform.YOUTUBE:
        redirectUri = config.youtube.redirectUri;
        break;
      case Platform.FACEBOOK:
        redirectUri = config.facebook.redirectUri;
        break;
      case Platform.TIKTOK:
        throw new ValidationError(
          'TikTok does not support OAuth. Use manual RTMP credentials instead.'
        );
      default:
        throw new ValidationError(`Unsupported platform: ${platform}`);
    }

    const authUrl = provider.getAuthUrl(communityId, redirectUri);

    res.json({
      success: true,
      data: {
        authUrl,
        platform,
        communityId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/:platform/callback
 * OAuth callback endpoint
 */
router.get('/:platform/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as Platform;
    const code = req.query.code as string;
    const communityId = req.query.state as string;

    if (!code) {
      throw new ValidationError('Authorization code is required');
    }

    if (!communityId) {
      throw new ValidationError('Community ID is required');
    }

    // Verify community exists
    await db.getCommunityById(communityId);

    const provider = providerRegistry.getProvider(platform);

    let redirectUri: string;
    switch (platform) {
      case Platform.YOUTUBE:
        redirectUri = config.youtube.redirectUri;
        break;
      case Platform.FACEBOOK:
        redirectUri = config.facebook.redirectUri;
        break;
      case Platform.TIKTOK:
        throw new ValidationError(
          'TikTok does not support OAuth. Use manual RTMP credentials instead.'
        );
      default:
        throw new ValidationError(`Unsupported platform: ${platform}`);
    }

    const tokens = await provider.exchangeCodeForTokens(code, redirectUri);

    await db.saveOAuthTokens({
      communityId,
      platform,
      tokens,
      updatedAt: new Date(),
    });

    logger.info('OAuth tokens saved', { communityId, platform });

    // Send HTML with postMessage to notify parent window
    res.send(`
        <html>
          <head>
            <title>OAuth Success - Omnistream</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #4CAF50; }
            </style>
          </head>
          <body>
            <h1>✅ Authorization Successful!</h1>
            <p>You have successfully connected ${platform} to your community.</p>
            <p>This window will close automatically...</p>
            <script>
              // Notify the parent window if opened in popup
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'oauth-success',
                  platform: '${platform}',
                  code: '${code}',
                  state: '${communityId}'
                }, '*');

                // Auto-close after 2 seconds
                setTimeout(() => {
                  window.close();
                }, 2000);
              } else {
                document.body.innerHTML += '<p><button onclick="window.close()">Close Window</button></p>';
              }
            </script>
          </body>
        </html>
      `);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/:platform/status
 * Check if a platform is connected (has valid OAuth tokens)
 */
router.get('/:platform/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as Platform;
    const communityId = req.query.communityId as string;

    if (!communityId) {
      throw new ValidationError('communityId query parameter is required');
    }

    // Verify community exists
    await db.getCommunityById(communityId);

    // Check if OAuth token exists
    const token = await db.getOAuthToken(communityId, platform);
    const isConnected = token !== null;

    logger.info('OAuth status check', { platform, communityId, connected: isConnected });

    res.json({
      success: true,
      data: {
        platform,
        communityId,
        connected: isConnected,
        hasToken: isConnected,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/auth/:platform
 * Revoke OAuth tokens for a platform
 */
router.delete('/:platform', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as Platform;
    const communityId = req.query.communityId as string;

    if (!communityId) {
      throw new ValidationError('communityId query parameter is required');
    }

    // Verify community exists
    await db.getCommunityById(communityId);

    await db.deleteOAuthTokens(communityId, platform);

    logger.info('OAuth tokens deleted', { communityId, platform });

    res.json({
      success: true,
      data: {
        message: `${platform} authorization revoked`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
