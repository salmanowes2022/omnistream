# OmniStream API Reference

Complete API documentation for OmniStream multi-platform streaming service.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## User Authentication

### Register User

Create a new user account.

**Endpoint:** `POST /user-auth/register`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "MyPassword123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Password doesn't meet requirements
- `409 CONFLICT` - Email already exists

---

### Login User

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /user-auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "MyPassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Invalid credentials

---

### Get Current User

Get information about the currently authenticated user.

**Endpoint:** `GET /user-auth/me`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Invalid or missing token

---

### Logout User

Logout the current user (client-side token deletion).

**Endpoint:** `POST /user-auth/logout`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Platform Management

### Get Connected Platforms

List all platforms connected to the current user.

**Endpoint:** `GET /user-auth/platforms`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "id": "platform-uuid",
        "platform": "youtube",
        "expiresAt": "2024-12-31T23:59:59.000Z",
        "extra": {
          "channelId": "UCxxxxx",
          "channelName": "My Channel"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Connect Platform

Manually connect a platform (for advanced use cases).

**Endpoint:** `POST /user-auth/platforms/connect`

**Authentication:** Required

**Request Body:**
```json
{
  "platform": "youtube",
  "accessToken": "ya29.xxxxx",
  "refreshToken": "1//xxxxx",
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "extra": {
    "channelId": "UCxxxxx",
    "channelName": "My Channel"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "socialAccount": {
      "id": "account-uuid",
      "platform": "youtube",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### Disconnect Platform

Remove a connected platform.

**Endpoint:** `DELETE /user-auth/platforms/:platform`

**Authentication:** Required

**Parameters:**
- `platform` - Platform name (youtube, facebook, tiktok, x, telegram)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "youtube disconnected successfully"
  }
}
```

---

## Community Management

### Create Community

Create a new streaming community.

**Endpoint:** `POST /communities`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "My Streaming Community"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "community-uuid",
    "name": "My Streaming Community",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### List Communities

Get all communities for the current user.

**Endpoint:** `GET /communities`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "community-uuid",
      "name": "My Streaming Community",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## OAuth Platform Connections

### Get YouTube Authorization URL

Get the OAuth authorization URL for YouTube.

**Endpoint:** `GET /auth/youtube/authorize?communityId=COMMUNITY_ID`

**Authentication:** Not required

**Query Parameters:**
- `communityId` - Community ID to associate the connection

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "platform": "youtube",
    "communityId": "community-uuid"
  }
}
```

---

### YouTube OAuth Callback

Handle YouTube OAuth callback (called by OAuth provider).

**Endpoint:** `GET /auth/youtube/callback?code=CODE&state=COMMUNITY_ID`

**Authentication:** Not required

**Response:** HTML page with success message and auto-close script

---

### Check Platform Status

Check if a platform is connected for a community.

**Endpoint:** `GET /auth/:platform/status?communityId=COMMUNITY_ID`

**Authentication:** Not required

**Parameters:**
- `platform` - Platform name (youtube, facebook, tiktok)

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "platform": "youtube",
    "communityId": "community-uuid",
    "connected": true,
    "hasToken": true
  }
}
```

---

### Revoke Platform OAuth

Revoke OAuth tokens for a platform.

**Endpoint:** `DELETE /auth/:platform?communityId=COMMUNITY_ID`

**Authentication:** Not required

**Parameters:**
- `platform` - Platform name

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "youtube authorization revoked"
  }
}
```

---

## Stream Management

### Create Stream

Create a new multi-platform stream.

**Endpoint:** `POST /streams`

**Authentication:** Not required (uses communityId)

**Request Body:**
```json
{
  "communityId": "community-uuid",
  "title": "My Live Stream",
  "description": "Stream description",
  "scheduledStartTime": "2024-01-01T20:00:00.000Z",
  "rtmpUrl": "rtmp://localhost/live",
  "rtmpKey": "stream-key-123",
  "platforms": ["youtube", "facebook"]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream-uuid",
      "communityId": "community-uuid",
      "title": "My Live Stream",
      "description": "Stream description",
      "rtmpUrl": "rtmp://localhost/live",
      "rtmpKey": "stream-key-123",
      "platforms": ["youtube", "facebook"],
      "scheduledStartTime": "2024-01-01T20:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "platformStreams": [
      {
        "platform": "youtube",
        "platformStreamId": "yt-stream-id",
        "status": "READY",
        "streamUrl": "rtmp://a.rtmp.youtube.com/live2",
        "streamKey": "xxxx-xxxx-xxxx-xxxx",
        "liveUrl": "https://youtube.com/watch?v=xxxxx"
      }
    ]
  }
}
```

---

### List Streams

Get all streams for a community.

**Endpoint:** `GET /streams?communityId=COMMUNITY_ID`

**Authentication:** Not required (uses communityId)

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "stream-uuid",
      "communityId": "community-uuid",
      "title": "My Live Stream",
      "description": "Stream description",
      "rtmpUrl": "rtmp://localhost/live",
      "rtmpKey": "stream-key-123",
      "platforms": ["youtube", "facebook"],
      "scheduledStartTime": "2024-01-01T20:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Start Stream

Start a stream on all platforms.

**Endpoint:** `POST /streams/:streamId/start`

**Authentication:** Not required (uses communityId)

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stream": { ... },
    "platformStreams": [
      {
        "platform": "youtube",
        "platformStreamId": "yt-stream-id",
        "status": "LIVE",
        "liveUrl": "https://youtube.com/watch?v=xxxxx"
      }
    ]
  }
}
```

---

### Stop Stream

Stop a stream on all platforms.

**Endpoint:** `POST /streams/:streamId/stop`

**Authentication:** Not required (uses communityId)

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stream": { ... },
    "platformStreams": [
      {
        "platform": "youtube",
        "platformStreamId": "yt-stream-id",
        "status": "ENDED"
      }
    ]
  }
}
```

---

### Get Stream Status

Get current status of a stream on all platforms.

**Endpoint:** `GET /streams/:streamId/status?communityId=COMMUNITY_ID`

**Authentication:** Not required (uses communityId)

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stream": { ... },
    "platformStreams": [
      {
        "platform": "youtube",
        "platformStreamId": "yt-stream-id",
        "status": "LIVE",
        "viewerCount": 1234,
        "liveUrl": "https://youtube.com/watch?v=xxxxx"
      }
    ]
  }
}
```

---

### Delete Stream

Delete a stream.

**Endpoint:** `DELETE /streams/:streamId?communityId=COMMUNITY_ID`

**Authentication:** Not required (uses communityId)

**Query Parameters:**
- `communityId` - Community ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Stream deleted successfully"
  }
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
    "message": "Human-readable error message"
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Invalid request data
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `INTERNAL_ERROR` (500) - Server error

---

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Response Header**: `X-RateLimit-Remaining`

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

---

## Versioning

API version is included in the URL: `/api/v1/...`

Future versions will be: `/api/v2/...`
