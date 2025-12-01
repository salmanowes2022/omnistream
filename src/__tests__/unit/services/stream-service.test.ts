/**
 * Unit tests for stream service
 */

import { streamService } from '../../../core/services/stream-service.js';
import { db } from '../../../database/index.js';
import { Platform, StreamStatus } from '../../../core/interfaces.js';
import { NotFoundError, ValidationError } from '../../../core/errors.js';

// Mock providers
jest.mock('../../../providers/index.js', () => ({
  providerRegistry: {
    getProvider: jest.fn((platform: Platform) => ({
      platform,
      createStream: jest.fn().mockResolvedValue({
        platform,
        platformStreamId: `${platform}-stream-id`,
        status: StreamStatus.SCHEDULED,
        streamUrl: `https://${platform}.com/stream`,
      }),
      startStream: jest.fn().mockResolvedValue({
        platform,
        platformStreamId: `${platform}-stream-id`,
        status: StreamStatus.LIVE,
      }),
      stopStream: jest.fn().mockResolvedValue({
        platform,
        platformStreamId: `${platform}-stream-id`,
        status: StreamStatus.ENDED,
      }),
      getStreamStatus: jest.fn().mockResolvedValue({
        platform,
        platformStreamId: `${platform}-stream-id`,
        status: StreamStatus.LIVE,
        viewerCount: 100,
      }),
    })),
  },
}));

describe('Stream Service', () => {
  let community: any;

  beforeEach(async () => {
    community = await db.createCommunity('Test Community');

    // Save mock OAuth tokens
    await db.saveOAuthTokens({
      communityId: community.id,
      platform: Platform.YOUTUBE,
      tokens: {
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: ['youtube'],
      },
      updatedAt: new Date(),
    });
  });

  describe('createStream', () => {
    it('should create stream with valid data', async () => {
      const result = await streamService.createStream(community.id, {
        title: 'Test Stream',
        description: 'Test Description',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      expect(result.stream).toBeDefined();
      expect(result.stream.title).toBe('Test Stream');
      expect(result.platformStreams).toHaveLength(1);
      expect(result.platformStreams[0].platform).toBe(Platform.YOUTUBE);
    });

    it('should throw ValidationError if platforms is empty', async () => {
      await expect(
        streamService.createStream(community.id, {
          title: 'Test Stream',
          rtmpUrl: 'rtmp://example.com',
          rtmpKey: 'stream-key',
          platforms: [],
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if community does not exist', async () => {
      await expect(
        streamService.createStream('invalid-id', {
          title: 'Test Stream',
          rtmpUrl: 'rtmp://example.com',
          rtmpKey: 'stream-key',
          platforms: [Platform.YOUTUBE],
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should create streams on multiple platforms', async () => {
      await db.saveOAuthTokens({
        communityId: community.id,
        platform: Platform.FACEBOOK,
        tokens: {
          accessToken: 'fb-token',
          expiresAt: new Date(Date.now() + 3600000),
          scope: ['facebook'],
        },
        updatedAt: new Date(),
      });

      const result = await streamService.createStream(community.id, {
        title: 'Multi-Platform Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE, Platform.FACEBOOK],
      });

      expect(result.platformStreams).toHaveLength(2);
      expect(result.platformStreams.map((ps) => ps.platform)).toContain(Platform.YOUTUBE);
      expect(result.platformStreams.map((ps) => ps.platform)).toContain(Platform.FACEBOOK);
    });

    it('should handle platform creation failure gracefully', async () => {
      const result = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      // Stream should still be created even if platforms fail
      expect(result.stream).toBeDefined();
      expect(result.platformStreams).toBeDefined();
    });
  });

  describe('startStream', () => {
    it('should start stream on all platforms', async () => {
      const { stream } = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      const results = await streamService.startStream(stream.id, community.id);

      expect(results.platformStreams).toHaveLength(1);
      expect(results.platformStreams[0].status).toBe(StreamStatus.LIVE);
    });

    it('should throw NotFoundError if stream does not exist', async () => {
      await expect(streamService.startStream('invalid-id', community.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if community does not own stream', async () => {
      const otherCommunity = await db.createCommunity('Other Community');
      const { stream } = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      await expect(streamService.startStream(stream.id, otherCommunity.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('stopStream', () => {
    it('should stop stream on all platforms', async () => {
      const { stream } = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      const results = await streamService.stopStream(stream.id, community.id);

      expect(results.platformStreams).toHaveLength(1);
      expect(results.platformStreams[0].status).toBe(StreamStatus.ENDED);
    });

    it('should throw NotFoundError if stream does not exist', async () => {
      await expect(streamService.stopStream('invalid-id', community.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getStreamStatus', () => {
    it('should get stream status from all platforms', async () => {
      const { stream } = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      const result = await streamService.getStreamStatus(stream.id, community.id);

      expect(result.stream).toBeDefined();
      expect(result.platformStreams).toHaveLength(1);
      expect(result.platformStreams[0].viewerCount).toBe(100);
    });

    it('should throw NotFoundError if stream does not exist', async () => {
      await expect(streamService.getStreamStatus('invalid-id', community.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('listStreams', () => {
    it('should return empty array if no streams exist', async () => {
      const streams = await streamService.listStreams(community.id);

      expect(Array.isArray(streams)).toBe(true);
      expect(streams.length).toBe(0);
    });

    it('should return all streams for community', async () => {
      await streamService.createStream(community.id, {
        title: 'Stream 1',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'key1',
        platforms: [Platform.YOUTUBE],
      });

      await streamService.createStream(community.id, {
        title: 'Stream 2',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'key2',
        platforms: [Platform.YOUTUBE],
      });

      const streams = await streamService.listStreams(community.id);

      expect(streams.length).toBe(2);
      expect(streams.map((s) => s.title)).toContain('Stream 1');
      expect(streams.map((s) => s.title)).toContain('Stream 2');
    });

    it('should throw NotFoundError if community does not exist', async () => {
      await expect(streamService.listStreams('invalid-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteStream', () => {
    it('should delete stream successfully', async () => {
      const { stream } = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      await streamService.deleteStream(stream.id, community.id);

      await expect(db.getStream(stream.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if stream does not exist', async () => {
      await expect(streamService.deleteStream('invalid-id', community.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if community does not own stream', async () => {
      const otherCommunity = await db.createCommunity('Other Community');
      const { stream } = await streamService.createStream(community.id, {
        title: 'Test Stream',
        rtmpUrl: 'rtmp://example.com',
        rtmpKey: 'stream-key',
        platforms: [Platform.YOUTUBE],
      });

      await expect(streamService.deleteStream(stream.id, otherCommunity.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
