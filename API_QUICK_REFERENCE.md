# 🔌 API Quick Reference

## Base URL
```
http://localhost:3000
```

---

## Communities

### Create Community
```bash
POST /api/v1/communities
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/communities \
  -H "Content-Type: application/json" \
  -d '{"name": "My Community"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "My Community",
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T10:00:00.000Z"
  }
}
```

### List Communities
```bash
GET /api/v1/communities
```

**Request:**
```bash
curl http://localhost:3000/api/v1/communities
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Community 1",
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T10:00:00.000Z"
    }
  ]
}
```

---

## OAuth / Authentication

### Get Auth URL
```bash
GET /api/v1/auth/:platform/url?communityId=xxx
```

**Platforms:** `youtube`, `facebook`, `tiktok`

**Request:**
```bash
curl "http://localhost:3000/api/v1/auth/youtube/url?communityId=your-community-id"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

### OAuth Callback
```bash
GET /api/v1/auth/:platform/callback?code=xxx&state=xxx
```

This is called automatically by the OAuth provider after user authorization.

### Check Auth Status
```bash
GET /api/v1/auth/:platform/status?communityId=xxx
```

**Request:**
```bash
curl "http://localhost:3000/api/v1/auth/youtube/status?communityId=your-community-id"
```

**Response (Connected):**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "platform": "youtube"
  }
}
```

**Response (Not Connected):**
```json
{
  "success": true,
  "data": {
    "connected": false,
    "platform": "youtube"
  }
}
```

### Disconnect Platform
```bash
DELETE /api/v1/auth/:platform?communityId=xxx
```

**Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/auth/youtube?communityId=your-community-id"
```

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from youtube"
}
```

---

## Streams

### Create Stream
```bash
POST /api/v1/streams
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "communityId": "your-community-id",
    "title": "My Live Stream",
    "description": "Stream description",
    "platforms": ["youtube", "facebook"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "stream-uuid",
    "communityId": "community-uuid",
    "title": "My Live Stream",
    "description": "Stream description",
    "rtmpUrl": "rtmp://localhost:1935/live",
    "rtmpKey": "unique-stream-key",
    "platforms": ["youtube", "facebook"],
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T10:00:00.000Z"
  }
}
```

### Get Stream
```bash
GET /api/v1/streams/:streamId
```

**Request:**
```bash
curl http://localhost:3000/api/v1/streams/your-stream-id
```

### List Streams by Community
```bash
GET /api/v1/streams/community/:communityId
```

**Request:**
```bash
curl http://localhost:3000/api/v1/streams/community/your-community-id
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stream-1",
      "title": "My Stream",
      "platforms": ["youtube"],
      ...
    }
  ]
}
```

### Start Stream
```bash
POST /api/v1/streams/:streamId/start
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/streams/your-stream-id/start
```

**Response:**
```json
{
  "success": true,
  "data": {
    "streamId": "stream-uuid",
    "status": "live",
    "platforms": [
      {
        "platform": "youtube",
        "status": "live",
        "platformStreamId": "yt-broadcast-id",
        "streamUrl": "https://youtube.com/watch?v=..."
      }
    ]
  }
}
```

### Stop Stream
```bash
POST /api/v1/streams/:streamId/stop
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/streams/your-stream-id/stop
```

### Get Stream Status
```bash
GET /api/v1/streams/:streamId/status
```

**Request:**
```bash
curl http://localhost:3000/api/v1/streams/your-stream-id/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "streamId": "stream-uuid",
    "platforms": [
      {
        "platform": "youtube",
        "status": "live",
        "viewerCount": 42,
        "platformUrl": "https://youtube.com/watch?v=..."
      }
    ]
  }
}
```

### Delete Stream
```bash
DELETE /api/v1/streams/:streamId
```

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/streams/your-stream-id
```

---

## Health Check

### Server Health
```bash
GET /health
```

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-29T10:00:00.000Z"
}
```

---

## WebSocket (Chat)

### Connect to Chat
```
ws://localhost:3000
```

**Example (JavaScript):**
```javascript
const ws = new WebSocket('ws://localhost:3000');

// Join stream chat
ws.send(JSON.stringify({
  type: 'join',
  streamId: 'your-stream-id'
}));

// Receive messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};
```

**Chat Message Format:**
```json
{
  "id": "message-uuid",
  "streamId": "stream-uuid",
  "platform": "youtube",
  "authorId": "user-id",
  "authorName": "John Doe",
  "authorImageUrl": "https://...",
  "message": "Hello from YouTube!",
  "timestamp": "2025-01-29T10:00:00.000Z",
  "highlighted": false
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Missing or invalid authentication
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Quick Test Workflow

### 1. Create a Community
```bash
curl -X POST http://localhost:3000/api/v1/communities \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Community"}'
```

Save the `id` from response.

### 2. Get YouTube Auth URL
```bash
curl "http://localhost:3000/api/v1/auth/youtube/url?communityId=YOUR_COMMUNITY_ID"
```

Open the URL in browser to authorize.

### 3. Check Auth Status
```bash
curl "http://localhost:3000/api/v1/auth/youtube/status?communityId=YOUR_COMMUNITY_ID"
```

Should show `"connected": true`.

### 4. Create a Stream
```bash
curl -X POST http://localhost:3000/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "communityId": "YOUR_COMMUNITY_ID",
    "title": "My First Stream",
    "platforms": ["youtube"]
  }'
```

Save the `streamId` from response.

### 5. Start Streaming
```bash
curl -X POST http://localhost:3000/api/v1/streams/YOUR_STREAM_ID/start
```

### 6. Check Stream Status
```bash
curl http://localhost:3000/api/v1/streams/YOUR_STREAM_ID/status
```

---

## Testing Persistence

### Before Restart
```bash
# Create community
curl -X POST http://localhost:3000/api/v1/communities \
  -H "Content-Type: application/json" \
  -d '{"name": "Persistence Test"}'

# Note the ID
```

### Restart Server
```bash
# Stop: Ctrl+C
# Start: npm run dev
```

### After Restart
```bash
# List communities
curl http://localhost:3000/api/v1/communities

# Should still see "Persistence Test" ✅
```

---

## Rate Limiting

Default limits:
- **Window:** 15 minutes
- **Max Requests:** 100 per window

Can be configured in `.env`:
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Summary

**Base URL:** `http://localhost:3000`

**Main Endpoints:**
- Communities: `/api/v1/communities`
- Auth: `/api/v1/auth/:platform`
- Streams: `/api/v1/streams`
- Health: `/health`
- WebSocket: `ws://localhost:3000`

**All data persists** in `omnistream.db` with SQLite! 🎉
