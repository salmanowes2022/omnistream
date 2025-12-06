/**
 * Chat API routes
 * Provides REST endpoints for chat history
 */

import { Request, Response, Router } from 'express';
import { db } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/chat/:streamId
 * Get chat history for a stream (last 100 messages)
 */
router.get('/:streamId', async (req: Request, res: Response) => {
  try {
    const { streamId } = req.params;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID is required',
      });
    }

    // Verify stream exists
    try {
      await db.getStream(streamId);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Get last 100 messages
    const messages = await db.getChatMessages(streamId, 100);

    logger.info('Chat history retrieved', {
      streamId,
      messageCount: messages.length,
    });

    return res.json({
      success: true,
      data: {
        streamId,
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get chat history', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history',
    });
  }
});

export default router;
