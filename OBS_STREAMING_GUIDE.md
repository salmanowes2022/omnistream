# 🎥 Omnistream → OBS → YouTube Live Streaming Guide

## Complete End-to-End Setup

This guide will help you set up **real live streaming** from OBS Studio through Omnistream to YouTube Live.

**Flow:** OBS → Local RTMP Server (localhost:1935) → Omnistream → YouTube Live → Public Video

---

## Prerequisites

### 1. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH

**Verify installation:**
```bash
ffmpeg -version
```

### 2. Install OBS Studio

Download from: https://obsproject.com/download

### 3. YouTube OAuth Setup

Make sure you have:
- YouTube account
- YouTube Data API v3 enabled in Google Cloud Console
- OAuth 2.0 credentials configured in Omnistream

---

## Step 1: Start the Omnistream Backend

```bash
cd /Users/salmanawaisa/Desktop/omnistream/Gigaverse

# Start the main Omnistream API server
npm run dev
```

The API server runs on: **http://localhost:3000**

---

## Step 2: Start the RTMP Server

Open a **NEW terminal** and run:

```bash
cd /Users/salmanawaisa/Desktop/omnistream/Gigaverse

# Start the RTMP server
node rtmp-server.js
```

You should see:
```
🚀 Omnistream RTMP Server started!
📡 Accepting RTMP streams on rtmp://localhost:1935/live/<streamKey>
📊 HTTP API on http://localhost:8000
```

**Keep this running!** This server:
- Accepts RTMP streams from OBS on port 1935
- Automatically relays them to YouTube
- Uses FFmpeg to forward the video stream

---

## Step 3: Start the Dashboard

Open **ANOTHER new terminal**:

```bash
cd /Users/salmanawaisa/Desktop/omnistream/Gigaverse/examples/web-dashboard

# Start the dashboard
npm start
```

Dashboard runs on: **http://localhost:4000**

---

## Step 4: Configure Omnistream Dashboard

1. **Open dashboard:** http://localhost:4000

2. **Create/Login to Community:**
   - Create a new community OR
   - Login with existing community ID

3. **Connect YouTube:**
   - Click "Connect YouTube"
   - Complete OAuth flow
   - Wait for "✓ Connected" status

4. **Create Stream:**
   - Enter stream title (e.g., "My First Live Stream")
   - Enter description
   - Select YouTube platform
   - Click "Create Stream"

5. **Start Stream:**
   - Click "▶ Start Stream" button
   - This creates the YouTube Live Broadcast
   - Status changes to "🟡 STARTING"

6. **Copy RTMP Settings:**
   You'll see two sections:

   **🎬 OBS Ingest Settings (Stream to Omnistream):**
   ```
   Server: rtmp://localhost:1935/live
   Stream Key: stream_1234567890
   ```

   **📺 YouTube RTMP Settings (Direct to YouTube):**
   ```
   Server: rtmps://a.rtmp.youtube.com/live2
   Stream Key: xxxx-xxxx-xxxx-xxxx
   ```

   **Copy the Omnistream settings** (localhost:1935)

---

## Step 5: Configure OBS Studio

### 5.1 Open OBS Settings

1. Launch OBS Studio
2. Click **Settings** (bottom right)
3. Go to **Stream** tab

### 5.2 Configure Stream Settings

- **Service:** Custom
- **Server:** `rtmp://localhost:1935/live`
- **Stream Key:** `stream_1234567890` ← (from dashboard)

Click **OK** to save

### 5.3 Add Video Source

1. Click **+** under "Sources"
2. Choose a source:
   - **Display Capture** - Screen sharing
   - **Video Capture Device** - Webcam
   - **Window Capture** - Specific app window
3. Configure and position

### 5.4 Check Audio

Make sure you have audio sources:
- **Mic/Auxiliary Audio** - Your microphone
- **Desktop Audio** - Computer sound

---

## Step 6: Start Streaming!

### 6.1 In OBS:

1. Click **"Start Streaming"** (bottom right)
2. OBS connects to `rtmp://localhost:1935/live`

### 6.2 Check RTMP Server Terminal:

You should see:
```
📡 Incoming RTMP stream with key: stream_1234567890
✅ Stream found: My First Live Stream
🎬 Found YouTube destination: rtmps://a.rtmp.youtube.com/live2
🔄 Starting FFmpeg relay...
```

### 6.3 Check Omnistream Dashboard:

- Refresh the page (or wait 10 seconds for auto-refresh)
- Status changes to: **🔴 LIVE**
- You'll see: **🔗 Watch Live** button
- Click it to watch on YouTube!

---

## Step 7: Verify YouTube Live

1. Click **"🔗 Watch Live"** in dashboard
2. Opens YouTube in browser
3. You should see your live stream!
4. Share the URL with friends

**YouTube URL format:**
```
https://www.youtube.com/watch?v=xxxxxxxxxxx
```

---

## Step 8: Stop Streaming

### To End the Stream:

1. **In OBS:** Click "Stop Streaming"
2. **In Dashboard:** Click "⏹ Stop Stream"
3. YouTube broadcast ends
4. Video is saved to your YouTube channel

---

## Troubleshooting

### Problem: "Connection failed" in OBS

**Check:**
- RTMP server is running (`node rtmp-server.js`)
- Server shows: "📡 Accepting RTMP streams on rtmp://localhost:1935/live"
- OBS server is exactly: `rtmp://localhost:1935/live` (not localhost:1935)

### Problem: Stream key not working

**Check:**
- Copy the EXACT stream key from dashboard
- Stream key format: `stream_1234567890`
- No extra spaces or characters

### Problem: OBS connects but YouTube shows offline

**Check:**
- RTMP server terminal for FFmpeg output
- FFmpeg is installed: `ffmpeg -version`
- YouTube broadcast was created (click START STREAM first)
- Stream key matches dashboard

### Problem: "rtmpUrl not found" in dashboard

**Check:**
- Backend server is running
- Clicked "START STREAM" button
- YouTube OAuth is connected
- Check browser console for errors

### Problem: FFmpeg relay fails

**Check:**
- FFmpeg path in `rtmp-server.js`:
  ```javascript
  ffmpeg: '/usr/local/bin/ffmpeg'
  ```
- Find FFmpeg location: `which ffmpeg`
- Update path if different

### Problem: YouTube says "Stream is offline"

**Wait a few seconds:**
- YouTube takes 10-30 seconds to process incoming stream
- Keep OBS streaming
- Refresh YouTube page

---

## Architecture Flow

```
┌─────────────┐
│  OBS Studio │
│  (You)      │
└──────┬──────┘
       │ RTMP Stream
       │ rtmp://localhost:1935/live/stream_123
       ▼
┌──────────────────────┐
│  RTMP Server         │
│  (Node Media Server) │
│  Port: 1935          │
└──────┬───────────────┘
       │ Query stream info
       │ GET /api/v1/streams
       ▼
┌──────────────────────┐
│  Omnistream API      │
│  Port: 3000          │
└──────┬───────────────┘
       │ Return YouTube RTMP URL
       ▼
┌──────────────────────┐
│  FFmpeg Relay        │
│  (In RTMP Server)    │
└──────┬───────────────┘
       │ RTMP Forward
       │ rtmps://a.rtmp.youtube.com/live2/xxxx
       ▼
┌──────────────────────┐
│  YouTube Live        │
│  Public Stream       │
└──────────────────────┘
```

---

## Alternative: Stream Directly to YouTube

You can bypass Omnistream RTMP server and stream directly to YouTube:

### In OBS Settings:

- **Server:** `rtmps://a.rtmp.youtube.com/live2`
- **Stream Key:** `xxxx-xxxx-xxxx-xxxx` ← from YouTube RTMP Settings section

This is simpler but you lose Omnistream's multi-platform capabilities.

---

## Advanced: Multi-Platform Streaming

To stream to **multiple platforms simultaneously**:

1. Create stream with multiple platforms selected
2. OBS → Omnistream RTMP server
3. RTMP server relays to **all** platforms
4. One stream → YouTube + Facebook + TikTok!

(Requires additional FFmpeg relay setup for each platform)

---

## Files Changed

### Backend:
- `src/core/interfaces.ts` - Added rtmpUrl, streamKey, liveUrl to PlatformStream
- `src/providers/youtube/index.ts` - Return YouTube RTMP ingestion info
- `rtmp-server.js` - NEW: RTMP relay server

### Frontend:
- `examples/web-dashboard/public/js/app.js` - Updated to show rtmp://localhost:1935

### New Files:
- `OBS_STREAMING_GUIDE.md` - This guide
- `rtmp-server.js` - RTMP server for OBS ingestion

---

## Quick Reference

### RTMP Server
```bash
node rtmp-server.js
```

### Omnistream API
```bash
npm run dev
```

### Dashboard
```bash
cd examples/web-dashboard && npm start
```

### OBS Settings
- Server: `rtmp://localhost:1935/live`
- Key: From dashboard

### YouTube Watch URL
- Click "🔗 Watch Live" in dashboard
- Or: `https://www.youtube.com/watch?v=<broadcastId>`

---

## Support

For issues:
- Check RTMP server logs
- Check Omnistream API logs
- Check browser console (F12)
- Verify FFmpeg is installed
- Ensure YouTube OAuth is working

---

## Success Checklist

✅ FFmpeg installed (`ffmpeg -version`)
✅ OBS Studio installed
✅ RTMP server running (port 1935)
✅ Omnistream API running (port 3000)
✅ Dashboard running (port 4000)
✅ YouTube OAuth connected
✅ Stream created in dashboard
✅ START STREAM clicked (status: 🟡 STARTING)
✅ OBS configured with rtmp://localhost:1935/live
✅ OBS "Start Streaming" clicked
✅ Dashboard shows 🔴 LIVE
✅ YouTube video is live!

---

**You're now live streaming from OBS through Omnistream to YouTube! 🎉**
