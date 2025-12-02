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

  tiktok: {
    clientKey: string;
    clientSecret: string;
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
      'http://localhost:3000/api/v1/auth/youtube/callback'
    ),
  },

  facebook: {
    appId: getEnvVarOptional('FACEBOOK_APP_ID', ''),
    appSecret: getEnvVarOptional('FACEBOOK_APP_SECRET', ''),
    redirectUri: getEnvVarOptional(
      'FACEBOOK_REDIRECT_URI',
      'http://localhost:3000/api/v1/auth/facebook/callback'
    ),
  },

  tiktok: {
    clientKey: getEnvVarOptional('TIKTOK_CLIENT_KEY', ''),
    clientSecret: getEnvVarOptional('TIKTOK_CLIENT_SECRET', ''),
    redirectUri: getEnvVarOptional(
      'TIKTOK_REDIRECT_URI',
      'http://localhost:3000/api/v1/auth/tiktok/callback'
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
