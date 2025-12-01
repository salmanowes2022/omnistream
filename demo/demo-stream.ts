#!/usr/bin/env node
/**
 * Demo Application - Omnistream Multi-Platform Streaming
 *
 * This demo proves the complete workflow:
 * 1. Creates a community
 * 2. Gets OAuth URLs (user completes OAuth in browser)
 * 3. Creates a multi-platform stream
 * 4. Starts streaming (requires ffmpeg to stream a video file)
 * 5. Monitors stream status
 * 6. Stops the stream
 */

import axios, { AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import * as readline from 'readline';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

interface Community {
  id: string;
  name: string;
  apiKey: string;
}

interface Stream {
  id: string;
  title: string;
  platforms: string[];
}

interface PlatformStream {
  platform: string;
  platformStreamId: string;
  status: string;
  streamUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;
  error?: string;
}

class OmnistreamDemo {
  private client: AxiosInstance;
  private community?: Community;
  private stream?: Stream;
  private platformStreams: PlatformStream[] = [];
  private ffmpegProcess?: ChildProcess;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private log(message: string, data?: any) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📡 ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    console.log('='.repeat(60));
  }

  async prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`\n❓ ${question} `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  async createCommunity(name: string): Promise<Community> {
    this.log('Step 1: Creating Community');

    const response = await this.client.post('/communities', {
      name,
    });

    this.community = response.data.data;

    this.log('Community Created', {
      id: this.community!.id,
      name: this.community!.name,
      apiKey: this.community!.apiKey.substring(0, 15) + '...',
    });

    // Set API key for future requests
    this.client.defaults.headers['X-API-Key'] = this.community!.apiKey;

    return this.community!;
  }

  async setupOAuth(platforms: string[]): Promise<void> {
    this.log('Step 2: Setting Up OAuth');

    for (const platform of platforms) {
      console.log(`\n🔐 Setting up OAuth for ${platform.toUpperCase()}...`);

      const response = await this.client.get(`/auth/${platform}/authorize`, {
        params: {
          communityId: this.community!.id,
        },
      });

      const authUrl = response.data.data.authUrl;

      console.log(`\n📋 Authorization URL for ${platform}:`);
      console.log(`   ${authUrl}`);
      console.log(`\n⚠️  Please open this URL in your browser and complete OAuth authorization.`);
      console.log(`   The callback will automatically save your tokens.\n`);

      await this.prompt(`Press Enter after completing OAuth for ${platform}...`);
    }

    this.log('OAuth Setup Complete', {
      platforms,
      note: 'If you skipped OAuth, streams will be created but may fail to go live',
    });
  }

  async createStream(
    title: string,
    description: string,
    platforms: string[],
    rtmpUrl: string,
    rtmpKey: string
  ): Promise<void> {
    this.log('Step 3: Creating Multi-Platform Stream');

    const response = await this.client.post('/streams', {
      communityId: this.community!.id,
      title,
      description,
      rtmpUrl,
      rtmpKey,
      platforms,
    });

    this.stream = response.data.data.stream;
    this.platformStreams = response.data.data.platformStreams;

    this.log('Stream Created', {
      streamId: this.stream!.id,
      title: this.stream!.title,
      platforms: this.stream!.platforms,
      platformStreams: this.platformStreams.map((ps) => ({
        platform: ps.platform,
        status: ps.status,
        streamUrl: ps.streamUrl,
        error: ps.error,
      })),
    });

    // Show RTMP ingestion details for each platform
    console.log('\n📺 RTMP Ingestion Details:');
    for (const ps of this.platformStreams) {
      if (ps.rtmpUrl && ps.streamKey) {
        console.log(`\n   ${ps.platform.toUpperCase()}:`);
        console.log(`   URL: ${ps.rtmpUrl}`);
        console.log(`   Key: ${ps.streamKey.substring(0, 20)}...`);
      }
    }
  }

  async startStream(): Promise<void> {
    this.log('Step 4: Starting Stream on All Platforms');

    const response = await this.client.post(`/streams/${this.stream!.id}/start`, {
      communityId: this.community!.id,
    });
    this.stream = response.data.data.stream || this.stream;
    this.platformStreams = response.data.data.platformStreams || [];

    this.log('Stream Start Initiated', {
      platformStreams: this.platformStreams.map((ps) => ({
        platform: ps.platform,
        status: ps.status,
        streamUrl: ps.streamUrl,
        error: ps.error,
      })),
    });

    console.log('\n🔴 LIVE STREAM URLS:');
    for (const ps of this.platformStreams) {
      if (ps.streamUrl) {
        console.log(`   ${ps.platform.toUpperCase()}: ${ps.streamUrl}`);
      }
    }
  }

  async getStreamStatus(): Promise<void> {
    const response = await this.client.get(`/streams/${this.stream!.id}`, {
      params: { communityId: this.community!.id },
    });
    const data = response.data.data;

    console.log('\n📊 Stream Status:');
    for (const ps of data.platformStreams) {
      console.log(`   ${ps.platform}: ${ps.status}${ps.error ? ' - ' + ps.error : ''}`);
    }
  }

  async stopStream(): Promise<void> {
    this.log('Step 5: Stopping Stream on All Platforms');

    const response = await this.client.post(`/streams/${this.stream!.id}/stop`, {
      communityId: this.community!.id,
    });
    this.stream = response.data.data.stream || this.stream;
    this.platformStreams = response.data.data.platformStreams || [];

    this.log('Stream Stopped', {
      platformStreams: this.platformStreams.map((ps) => ({
        platform: ps.platform,
        status: ps.status,
      })),
    });
  }

  async streamVideoFile(videoPath: string, rtmpUrl: string, rtmpKey: string): Promise<void> {
    this.log('Step 4b: Streaming Video File with FFmpeg');

    if (!existsSync(videoPath)) {
      console.error(`\n❌ Video file not found: ${videoPath}`);
      console.log('   Please provide a valid video file path.');
      return;
    }

    console.log(`\n📹 Starting FFmpeg to stream: ${videoPath}`);
    console.log(`   Target: ${rtmpUrl}/${rtmpKey}`);

    const fullRtmpUrl = `${rtmpUrl}/${rtmpKey}`;

    // FFmpeg command to stream video file to RTMP
    const args = [
      '-re', // Read input at native frame rate
      '-i',
      videoPath, // Input file
      '-c:v',
      'libx264', // Video codec
      '-preset',
      'veryfast', // Encoding preset
      '-b:v',
      '3000k', // Video bitrate
      '-maxrate',
      '3000k',
      '-bufsize',
      '6000k',
      '-pix_fmt',
      'yuv420p',
      '-g',
      '60', // GOP size
      '-c:a',
      'aac', // Audio codec
      '-b:a',
      '128k', // Audio bitrate
      '-ar',
      '44100',
      '-f',
      'flv', // Output format
      fullRtmpUrl,
    ];

    this.ffmpegProcess = spawn('ffmpeg', args);

    this.ffmpegProcess.stdout?.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });

    this.ffmpegProcess.stderr?.on('data', (data) => {
      // FFmpeg outputs to stderr by default
      const message = data.toString();
      if (message.includes('frame=') || message.includes('time=')) {
        // Show progress
        process.stdout.write(`\r${message.trim()}`);
      }
    });

    this.ffmpegProcess.on('close', (code) => {
      console.log(`\n\n✅ FFmpeg process exited with code ${code}`);
    });

    this.ffmpegProcess.on('error', (error) => {
      console.error(`\n❌ FFmpeg error: ${error.message}`);
      console.log('   Make sure ffmpeg is installed: https://ffmpeg.org/download.html');
    });

    console.log('\n🎬 FFmpeg streaming started!');
    console.log('   Press Ctrl+C to stop streaming\n');
  }

  stopFFmpeg(): void {
    if (this.ffmpegProcess) {
      console.log('\n\n⏹️  Stopping FFmpeg...');
      this.ffmpegProcess.kill('SIGINT');
      this.ffmpegProcess = undefined;
    }
  }
}

// Main demo flow
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎥  OMNISTREAM DEMO - Multi-Platform Live Streaming    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

  const demo = new OmnistreamDemo();

  try {
    // Step 1: Create Community
    await demo.createCommunity('Demo Community ' + new Date().toISOString());

    // Step 2: OAuth Setup
    console.log('\n\n📋 Choose platforms to stream to:');
    console.log('   Available: youtube, facebook');
    const platformsInput = await demo.prompt(
      'Enter platforms (comma-separated, e.g., "youtube,facebook"):'
    );
    const platforms = platformsInput
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter((p) => ['youtube', 'facebook'].includes(p));

    if (platforms.length === 0) {
      console.log('\n⚠️  No valid platforms selected. Using YouTube as default.');
      platforms.push('youtube');
    }

    const shouldSetupOAuth = await demo.prompt('Do you want to set up OAuth now? (y/n):');

    if (shouldSetupOAuth.toLowerCase() === 'y') {
      await demo.setupOAuth(platforms);
    } else {
      console.log('\n⚠️  Skipping OAuth. Streams will be created but may not go live.');
    }

    // Step 3: Create Stream
    const title = await demo.prompt('Enter stream title (or press Enter for default):');
    const streamTitle = title || 'Omnistream Demo - ' + new Date().toLocaleString();

    const description = await demo.prompt('Enter stream description (optional):');

    // For demo, we'll use a test RTMP server (user can provide their own)
    const useCustomRTMP = await demo.prompt('Do you want to use a custom RTMP source? (y/n):');

    let rtmpUrl = 'rtmp://localhost/live';
    let rtmpKey = 'demo-stream-' + Date.now();

    if (useCustomRTMP.toLowerCase() === 'y') {
      rtmpUrl = await demo.prompt('Enter RTMP URL:');
      rtmpKey = await demo.prompt('Enter RTMP stream key:');
    }

    await demo.createStream(streamTitle, description, platforms, rtmpUrl, rtmpKey);

    // Step 4: Start Stream
    const shouldStart = await demo.prompt('Do you want to start the stream now? (y/n):');

    if (shouldStart.toLowerCase() === 'y') {
      await demo.startStream();

      // Optional: Stream a video file
      const shouldStreamFile = await demo.prompt(
        'Do you want to stream a video file using FFmpeg? (y/n):'
      );

      if (shouldStreamFile.toLowerCase() === 'y') {
        const videoPath = await demo.prompt('Enter path to video file:');

        await demo.streamVideoFile(videoPath, rtmpUrl, rtmpKey);

        // Monitor stream
        console.log('\n📊 Monitoring stream status...');
        const monitorInterval = setInterval(async () => {
          await demo.getStreamStatus();
        }, 10000); // Check every 10 seconds

        // Wait for user to stop
        await demo.prompt('\nPress Enter to stop streaming...');

        clearInterval(monitorInterval);
        demo.stopFFmpeg();
      }

      // Step 5: Stop Stream
      const shouldStop = await demo.prompt('Do you want to stop the stream now? (y/n):');

      if (shouldStop.toLowerCase() === 'y') {
        await demo.stopStream();
      }
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✅  DEMO COMPLETED SUCCESSFULLY!                        ║
║                                                           ║
║   Your community and stream are still active.             ║
║   You can manage them via the API.                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
  } catch (error: any) {
    console.error('\n\n❌ Error during demo:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   ', error.message);
    }
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Demo interrupted. Cleaning up...');
  process.exit(0);
});

// Run the demo
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
