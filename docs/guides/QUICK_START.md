# 🚀 Omnistream OBS Quick Start

## Prerequisites
```bash
# Install FFmpeg
brew install ffmpeg  # macOS
# OR
sudo apt install ffmpeg  # Linux

# Verify
ffmpeg -version
```

## Step 1: Start Servers (3 terminals)

### Terminal 1: Omnistream API
```bash
npm run dev
```
**Runs on:** http://localhost:3000

### Terminal 2: RTMP Server
```bash
node rtmp-server.js
```
**Accepts streams on:** rtmp://localhost:1935/live

### Terminal 3: Dashboard
```bash
cd examples/web-dashboard
npm start
```
**Dashboard:** http://localhost:4000

---

## Step 2: Configure Dashboard

1. Open: http://localhost:4000
2. Create community / Login
3. Connect YouTube OAuth
4. Create stream:
   - Title: "My Live Stream"
   - Platform: YouTube ✓
   - Click "Create Stream"
5. Click "▶ Start Stream"
6. Copy stream key from **OBS Ingest Settings**

---

## Step 3: Configure OBS

1. **Settings** → **Stream**
2. **Service:** Custom
3. **Server:** `rtmp://localhost:1935/live`
4. **Stream Key:** `stream_1234567890` ← from dashboard
5. Click **OK**
6. Add video source
7. Click **Start Streaming**

---

## Step 4: Verify

✅ RTMP server logs: "📡 Incoming RTMP stream"
✅ FFmpeg relay starts
✅ Dashboard shows: "🔴 LIVE"
✅ Click "🔗 Watch Live"
✅ You're live on YouTube!

---

## Stop Streaming

1. OBS: Click "Stop Streaming"
2. Dashboard: Click "⏹ Stop Stream"

---

## Troubleshooting

**OBS won't connect?**
- RTMP server running?
- Server = `rtmp://localhost:1935/live` (exact)

**YouTube offline?**
- Wait 10-30 seconds
- Check RTMP server logs
- Verify FFmpeg installed

**Full guide:** See `OBS_STREAMING_GUIDE.md`

---

## Architecture

```
OBS → rtmp://localhost:1935/live/<key>
  ↓
RTMP Server (queries Omnistream API)
  ↓
FFmpeg (relays to YouTube)
  ↓
YouTube Live (public video)
```

---

**You're ready to go live! 🎉**
