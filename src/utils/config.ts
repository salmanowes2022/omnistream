/**
 * Configuration management for omnistream
 */

import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;

  youtube: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  facebook: {
    appId: string;
    appSecret: string;
    redirectUri: string;
  };

  twitter: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  telegram: {
    botToken: string;
  };

  tiktok: {
    enabled: boolean;
    defaultRtmpServer: string;
  };

  instagram: {
    appId: string;
    appSecret: string;
    redirectUri: string;
  };

  security: {
    jwtSecret: string;
  };

  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

function getEnvVarOptional(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

const jwtSecret = getEnvVarOptional('JWT_SECRET', 'default-secret-change-in-production');

export const config: Config = {
  port: parseInt(getEnvVarOptional('PORT', '3000'), 10),
  nodeEnv: getEnvVarOptional('NODE_ENV', 'development'),
  databaseUrl: getEnvVarOptional('DATABASE_URL', 'memory://'),
  jwtSecret,

  youtube: {
    clientId: getEnvVarOptional('YOUTUBE_CLIENT_ID', ''),
    clientSecret: getEnvVarOptional('YOUTUBE_CLIENT_SECRET', ''),
    redirectUri: getEnvVarOptional(
      'YOUTUBE_REDIRECT_URI',
      'http://localhost:3000/api/v1/platforms/youtube/callback'
    ),
  },

  facebook: {
    appId: getEnvVarOptional('FACEBOOK_APP_ID', ''),
    appSecret: getEnvVarOptional('FACEBOOK_APP_SECRET', ''),
    redirectUri: getEnvVarOptional(
      'FACEBOOK_REDIRECT_URI',
      'http://localhost:3000/api/v1/platforms/facebook/callback'
    ),
  },

  twitter: {
    clientId: getEnvVarOptional('TWITTER_CLIENT_ID', ''),
    clientSecret: getEnvVarOptional('TWITTER_CLIENT_SECRET', ''),
    redirectUri: getEnvVarOptional(
      'TWITTER_REDIRECT_URI',
      'http://localhost:3000/api/v1/platforms/twitter/callback'
    ),
  },

  telegram: {
    botToken: getEnvVarOptional('TELEGRAM_BOT_TOKEN', ''),
  },

  tiktok: {
    enabled: getEnvVarOptional('TIKTOK_ENABLED', 'true') === 'true',
    defaultRtmpServer: getEnvVarOptional(
      'TIKTOK_DEFAULT_RTMP_SERVER',
      'rtmp://push.tiktok.com/live'
    ),
  },

  instagram: {
    appId: getEnvVarOptional('INSTAGRAM_APP_ID', ''),
    appSecret: getEnvVarOptional('INSTAGRAM_APP_SECRET', ''),
    redirectUri: getEnvVarOptional(
      'INSTAGRAM_REDIRECT_URI',
      'http://localhost:3000/api/v1/platforms/instagram/callback'
    ),
  },

  security: {
    jwtSecret,
  },

  rateLimit: {
    windowMs: parseInt(getEnvVarOptional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(getEnvVarOptional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
};
