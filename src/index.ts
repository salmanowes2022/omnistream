/**
 * Omnistream - Multi-platform Live Streaming Middleware
 * Main server entry point
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { OAuthConfigValidator } from './utils/oauth-config-validator.js';
import { errorHandler } from './api/middleware/error-handler.js';
import { rateLimit } from './api/middleware/rate-limiter.js';
import { ChatServer } from './websocket/chat-server.js';

// Import routes
import communitiesRouter from './api/routes/communities.js';
import streamsRouter from './api/routes/streams.js';
import userAuthRouter from './api/routes/user-auth.js';
import platformsRouter from './api/routes/platforms.js';
import postsRouter from './api/routes/posts.js';
import scheduleRouter from './api/routes/schedule.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimit);

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Dashboard route
app.get('/dashboard', (_req, res) => {
  res.sendFile('dashboard.html', { root: 'public' });
});

// API routes
app.use('/api/v1/user-auth', userAuthRouter);
app.use('/api/v1/communities', communitiesRouter);
app.use('/api/v1/streams', streamsRouter);
app.use('/api/v1/platforms', platformsRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/schedule', scheduleRouter);

// Error handler (must be last)
app.use(errorHandler);

// Validate OAuth configuration on startup
OAuthConfigValidator.validateAndLog();

// Initialize WebSocket chat server
const chatServer = new ChatServer(server);

// Start background scheduler worker
import { startScheduler } from './workers/scheduler.js';
startScheduler();

// Start server
server.listen(config.port, () => {
  logger.info('Omnistream server started', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    websocketUrl: `ws://localhost:${config.port}/ws/chat`,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  void chatServer.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  void chatServer.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
