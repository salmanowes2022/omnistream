/* eslint-disable prefer-const */
/**
 * Unified Platform Connection Routes
 * Handles Twitter, Telegram, and YouTube platform connections
 */

import express, { NextFunction, Request, Response } from 'express';
import { platformService } from '../../core/services/platform-service.js';
import { ValidationError } from '../../core/errors.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { Platform } from '../../core/interfaces.js';
import { config } from '../../utils/config.js';

const router = express.Router();

/**
 * POST /api/v1/platforms/twitter/connect
 * Initiate Twitter OAuth flow
 */
router.post(
  '/twitter/connect',
  requireAuth,
  // eslint-disable-next-line @typescript-eslint/require-await
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      // Get Twitter OAuth URL
      const authUrl = platformService.getTwitterAuthUrl(userId);

      res.json({
        success: true,
        data: {
          authUrl,
          platform: Platform.TWITTER,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/platforms/twitter/callback
 * Twitter OAuth callback endpoint
 */
router.get('/twitter/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      throw new ValidationError('Code and state are required');
    }

    // Connect Twitter account
    await platformService.connectTwitter({
      userId: state,
      code,
      state,
    });

    // Send success HTML page
    res.send(`
      <html>
        <head>
          <title>Twitter Connected - OmniStream</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 12px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #1DA1F2; margin-bottom: 20px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            button {
              background: #1DA1F2;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 25px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { background: #1a8cd8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Twitter Connected!</h1>
            <p>You have successfully connected your Twitter/X account to OmniStream.</p>
            <p>This window will close automatically...</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'platform-connected',
                platform: 'twitter'
              }, '*');
              setTimeout(() => window.close(), 2000);
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
 * POST /api/v1/platforms/telegram/connect
 * Connect Telegram bot
 */
router.post(
  '/telegram/connect',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      let { botToken, channelId } = req.body;

      // If no bot token provided, use the one from .env
      if (!botToken) {
        botToken = config.telegram?.botToken;
      }

      if (!botToken || !channelId) {
        throw new ValidationError('Bot token and channel ID are required');
      }

      // Connect Telegram
      await platformService.connectTelegram({
        userId,
        botToken,
        channelId,
      });

      res.json({
        success: true,
        data: {
          message: 'Telegram connected successfully',
          platform: Platform.TELEGRAM,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/platforms/tiktok/connect
 * Connect TikTok with manual RTMP credentials
 */
router.post(
  '/tiktok/connect',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      const { rtmpServer, streamKey } = req.body;

      if (!rtmpServer || !streamKey) {
        throw new ValidationError('RTMP server and stream key are required');
      }

      // Connect TikTok
      await platformService.connectTikTok({
        userId,
        rtmpServer,
        streamKey,
      });

      res.json({
        success: true,
        data: {
          message: 'TikTok connected successfully',
          platform: Platform.TIKTOK,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/platforms/youtube/connect
 * Initiate YouTube OAuth flow
 */
router.post(
  '/youtube/connect',
  requireAuth,
  // eslint-disable-next-line @typescript-eslint/require-await
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      // Get YouTube OAuth URL
      const authUrl = platformService.getYouTubeAuthUrl(userId, config.youtube.redirectUri);

      res.json({
        success: true,
        data: {
          authUrl,
          platform: Platform.YOUTUBE,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/platforms/facebook/connect
 * Initiate Facebook OAuth flow
 */
router.post(
  '/facebook/connect',
  requireAuth,
  // eslint-disable-next-line @typescript-eslint/require-await
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      // Get Facebook OAuth URL
      const authUrl = platformService.getFacebookAuthUrl(userId);

      res.json({
        success: true,
        data: {
          authUrl,
          platform: Platform.FACEBOOK,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/platforms/instagram/connect
 * Initiate Instagram OAuth flow
 */
router.post(
  '/instagram/connect',
  requireAuth,
  // eslint-disable-next-line @typescript-eslint/require-await
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      // Get Instagram OAuth URL
      const authUrl = platformService.getInstagramAuthUrl(userId);

      res.json({
        success: true,
        data: {
          authUrl,
          platform: Platform.INSTAGRAM,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/platforms/youtube/callback
 * YouTube OAuth callback endpoint
 */
router.get('/youtube/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // userId

    if (!code || !state) {
      throw new ValidationError('Code and state are required');
    }

    // Connect YouTube account
    await platformService.connectYouTube({
      userId: state,
      code,
      redirectUri: config.youtube.redirectUri,
    });

    // Send success HTML page
    res.send(`
      <html>
        <head>
          <title>YouTube Connected - OmniStream</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 12px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #FF0000; margin-bottom: 20px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            button {
              background: #FF0000;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 25px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { background: #CC0000; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>YouTube Connected!</h1>
            <p>You have successfully connected your YouTube account to OmniStream.</p>
            <p>This window will close automatically...</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'platform-connected',
                platform: 'youtube'
              }, '*');
              setTimeout(() => window.close(), 2000);
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
 * GET /api/v1/platforms/facebook/callback
 * Facebook OAuth callback endpoint
 */
router.get('/facebook/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      throw new ValidationError('Code and state are required');
    }

    // Connect Facebook account
    await platformService.connectFacebook({
      userId: state,
      code,
      state,
    });

    // Send success HTML page
    res.send(`
      <html>
        <head>
          <title>Facebook Connected - OmniStream</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #1877F2 0%, #0C5FCD 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 12px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #1877F2; margin-bottom: 20px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            button {
              background: #1877F2;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 25px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { background: #0C5FCD; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Facebook Connected!</h1>
            <p>You have successfully connected your Facebook account to OmniStream.</p>
            <p>This window will close automatically...</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'platform-connected',
                platform: 'facebook'
              }, '*');
              setTimeout(() => window.close(), 2000);
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
 * GET /api/v1/platforms/instagram/callback
 * Instagram OAuth callback endpoint
 */
router.get('/instagram/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      throw new ValidationError('Code and state are required');
    }

    // Connect Instagram account
    await platformService.connectInstagram({
      userId: state,
      code,
      state,
    });

    // Send success HTML page
    res.send(`
      <html>
        <head>
          <title>Instagram Connected - OmniStream</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #E1306C 0%, #C13584 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 12px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #E1306C; margin-bottom: 20px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            button {
              background: linear-gradient(135deg, #E1306C 0%, #C13584 100%);
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 25px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Instagram Connected!</h1>
            <p>You have successfully connected your Instagram Business account to OmniStream.</p>
            <p>This window will close automatically...</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'platform-connected',
                platform: 'instagram'
              }, '*');
              setTimeout(() => window.close(), 2000);
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
 * DELETE /api/v1/platforms/:platform
 * Disconnect a platform
 */
router.delete(
  '/:platform',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      const platform = req.params.platform as Platform;

      // Validate platform
      if (!Object.values(Platform).includes(platform)) {
        throw new ValidationError(`Invalid platform: ${platform}`);
      }

      // Disconnect platform
      await platformService.disconnectPlatform(userId, platform);

      res.json({
        success: true,
        data: {
          message: `${platform} disconnected successfully`,
          platform,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/platforms
 * List all connected platforms for current user
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const platforms = await platformService.listPlatforms(userId);

    res.json({
      success: true,
      data: {
        platforms,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/platforms/:platform/status
 * Check if a platform is connected
 */
router.get(
  '/:platform/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found in token');
      }

      const platform = req.params.platform as Platform;

      // Validate platform
      if (!Object.values(Platform).includes(platform)) {
        throw new ValidationError(`Invalid platform: ${platform}`);
      }

      const connected = await platformService.isPlatformConnected(userId, platform);

      res.json({
        success: true,
        data: {
          platform,
          connected,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
