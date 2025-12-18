#!/bin/bash

echo "🚀 Starting Omnistream RTMP Server..."
echo ""
echo "This server accepts RTMP streams from OBS and relays them to YouTube"
echo "Make sure FFmpeg is installed: ffmpeg -version"
echo ""
echo "Listening on: rtmp://localhost:1935/live/<streamKey>"
echo ""

node "$(dirname "$0")/rtmp-server.js"
