# OmniStream Scripts

This folder contains utility scripts for running and testing OmniStream.

## Available Scripts

### `start-rtmp-server.sh`

Starts the RTMP server that accepts streams from OBS Studio and relays them to YouTube.

**Usage:**

```bash
./scripts/start-rtmp-server.sh
```

**Prerequisites:**

- FFmpeg must be installed: `ffmpeg -version`
- Node.js dependencies installed: `npm install`

**Configuration:**

- `RTMP_PORT` - RTMP server port (default: 1935)
- `HTTP_PORT` - HTTP API port (default: 8000)
- `DISABLE_HTTP` - Set to "1" to disable HTTP server

### `test-oauth-status.sh`

Tests OAuth connection status for all platforms.

**Usage:**

```bash
./scripts/test-oauth-status.sh <COMMUNITY_ID>
```

**Example:**

```bash
./scripts/test-oauth-status.sh 44cbee39-21e1-4870-9149-2744b2f34fe8
```

### `rtmp-server.js`

The core RTMP server implementation using Node Media Server.

**Do not run directly - use `start-rtmp-server.sh` instead.**

## How the RTMP Server Works

1. OBS Studio connects to `rtmp://localhost:1935/live/<streamKey>`
2. RTMP server receives the stream
3. Server queries OmniStream API to find the stream by RTMP key
4. Server retrieves YouTube RTMP destination (URL + key)
5. FFmpeg relays the stream to YouTube in real-time
6. After 5 seconds, server auto-transitions YouTube broadcast to LIVE

## Troubleshooting

**RTMP server won't start:**

- Check if port 1935 is already in use: `lsof -i :1935`
- Try a different port: `RTMP_PORT=1936 ./scripts/start-rtmp-server.sh`

**FFmpeg not found:**

- Install FFmpeg: `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux)
- Update FFmpeg path in `rtmp-server.js` if installed in a custom location

**Stream not relaying to YouTube:**

- Ensure OmniStream API is running on port 3000
- Check that you've created a stream and clicked "START STREAM" in the dashboard
- Verify your YouTube OAuth tokens are valid
