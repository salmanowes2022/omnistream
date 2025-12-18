/**
 * Simple RTMP Server for Omnistream
 * Accepts RTMP streams from OBS and forwards them to YouTube
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const NodeMediaServer = require('node-media-server');
const axios = require('axios');

// Allow overriding ports via env to avoid conflicts/permission issues
const RTMP_PORT = Number(process.env.RTMP_PORT || 1935);
const HTTP_PORT = Number(process.env.HTTP_PORT || 8000);
const HTTP_HOST = process.env.HTTP_HOST || '127.0.0.1';

const config = {
  rtmp: {
    port: RTMP_PORT,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  trans: {
    ffmpeg: '/usr/local/bin/ffmpeg', // Update this path if needed
    tasks: [],
  },
};

if (!process.env.DISABLE_HTTP) {
  config.http = {
    port: HTTP_PORT,
    host: HTTP_HOST,
    allow_origin: '*',
    mediaroot: './media',
  };
} else {
  console.log('ℹ️ HTTP server disabled (set DISABLE_HTTP=0 to re-enable).');
}

const nms = new NodeMediaServer(config);

// Map of stream keys to their YouTube RTMP destinations
const streamKeyMap = new Map();

// Listen for stream publishing events
nms.on('prePublish', async (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on prePublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );

  // Extract stream key from path: /live/streamKey
  const streamKey = StreamPath.split('/')[2];
  console.log(`📡 Incoming RTMP stream with key: ${streamKey}`);

  // TODO: Query Omnistream API to get YouTube RTMP destination for this stream key
  // For now, we'll accept all streams
  // In production, you would:
  // 1. Query: GET /api/v1/streams?rtmpKey=${streamKey}
  // 2. Get YouTube RTMP URL and key from the response
  // 3. Start FFmpeg relay to YouTube

  try {
    const response = await axios.get(`http://localhost:3000/api/v1/streams?rtmpKey=${streamKey}`);
    if (response.data.success && response.data.data.length > 0) {
      const stream = response.data.data[0];
      console.log(`✅ Stream found: ${stream.title}`);

      // Get platform streams to find YouTube destination
      const statusResponse = await axios.get(
        `http://localhost:3000/api/v1/streams/${stream.id}?communityId=${stream.communityId}`
      );

      if (statusResponse.data.success && statusResponse.data.data.platformStreams) {
        const youtubeStream = statusResponse.data.data.platformStreams.find(
          (ps) => ps.platform === 'youtube'
        );
        if (youtubeStream && youtubeStream.rtmpUrl && youtubeStream.streamKey) {
          console.log(`🎬 Found YouTube destination: ${youtubeStream.rtmpUrl}`);

          // Store mapping for relay
          streamKeyMap.set(streamKey, {
            youtubeRtmpUrl: youtubeStream.rtmpUrl,
            youtubeStreamKey: youtubeStream.streamKey,
            streamId: stream.id,
            communityId: stream.communityId,
          });

          // Setup FFmpeg relay
          setupRelay(streamKey, youtubeStream.rtmpUrl, youtubeStream.streamKey);

          // Auto-transition YouTube broadcast to live after FFmpeg starts
          console.log(
            '⏳ Waiting 5 seconds for stream to stabilize before transitioning to live...'
          );
          setTimeout(async () => {
            try {
              console.log(`🚀 Auto-starting YouTube broadcast for stream ${stream.id}...`);
              const startResponse = await axios.post(
                `http://localhost:3000/api/v1/streams/${stream.id}/start`,
                { communityId: stream.communityId }
              );
              if (startResponse.data.success) {
                console.log('✅ YouTube broadcast transitioned to LIVE!');
              } else {
                console.warn('⚠️ Failed to auto-start broadcast:', startResponse.data.error);
              }
            } catch (error) {
              console.error('❌ Error auto-starting broadcast:', error.message);
            }
          }, 5000);
        } else {
          console.warn('⚠️ YouTube RTMP info not available yet. Is the stream started?');
        }
      } else {
        console.warn('⚠️ No platform stream data returned for stream', stream.id);
      }
    }
  } catch (error) {
    console.error('Error querying stream info:', error.message);
  }
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on donePublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );

  const streamKey = StreamPath.split('/')[2];
  console.log(`❌ Stream ended for key: ${streamKey}`);

  // Clean up mapping
  streamKeyMap.delete(streamKey);
});

function setupRelay(localStreamKey, youtubeRtmpUrl, youtubeStreamKey) {
  const { spawn } = require('child_process');

  // FFmpeg command to relay stream from local RTMP to YouTube
  const ffmpegArgs = [
    '-i',
    `rtmp://localhost:1935/live/${localStreamKey}`,
    '-c',
    'copy', // Copy codec without re-encoding (faster)
    '-f',
    'flv',
    `${youtubeRtmpUrl}/${youtubeStreamKey}`,
  ];

  console.log(`🔄 Starting FFmpeg relay: ffmpeg ${ffmpegArgs.join(' ')}`);

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
  });
}

nms.run();

console.log('🚀 Omnistream RTMP Server started!');
console.log(`📡 Accepting RTMP streams on rtmp://localhost:${RTMP_PORT}/live/<streamKey>`);
if (config.http) {
  console.log(`📊 HTTP API on http://${HTTP_HOST}:${HTTP_PORT}`);
} else {
  console.log('📊 HTTP API disabled');
}
console.log('');
console.log('Instructions:');
console.log('1. Create a stream in Omnistream dashboard');
console.log('2. Click START STREAM to create YouTube broadcast');
console.log('3. Open OBS Studio:');
console.log('   - Server: rtmp://localhost:1935/live');
console.log('   - Stream Key: (copy from dashboard)');
console.log('4. Click "Start Streaming" in OBS');
console.log('5. Your stream will be relayed to YouTube!');
