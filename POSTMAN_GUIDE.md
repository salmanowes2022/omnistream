# OmniStream API - Postman Testing Guide

## 🚀 Quick Start

### 1. Import the Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select the file: `OmniStream-Postman-Collection.json`
4. The collection will appear in your left sidebar

### 2. Collection Variables (Auto-configured)

The collection uses variables that are automatically saved as you test:

- `baseUrl`: http://localhost:3000
- `apiUrl`: http://localhost:3000/api/v1
- `token`: Auto-saved after login/register
- `userId`: Auto-saved after login/register
- `communityId`: Auto-saved after creating a community
- `streamId`: Auto-saved after creating a stream

You don't need to manually copy/paste IDs - they're saved automatically!

---

## 📋 Testing Workflow

### Step 1: Health Check

**Request:** `GET /health`

This verifies the server is running.

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-11T11:25:00.000Z"
}
```

---

### Step 2: Register a User

**Request:** `POST /api/v1/user-auth/register`

**Body:**
```json
{
  "email": "yourname@example.com",
  "password": "Password123",
  "name": "Your Name"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "yourname@example.com",
      "createdAt": "2025-12-11T...",
      "updatedAt": "2025-12-11T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

✅ **Token is automatically saved to collection variables!**

---

### Step 3: Login (Alternative to Register)

**Request:** `POST /api/v1/user-auth/login`

**Body:**
```json
{
  "email": "test@test.com",
  "password": "Test1234"
}
```

**Expected Response:** Same as register (returns user + token)

✅ **Token is automatically saved!**

---

### Step 4: Get Current User Info

**Request:** `GET /api/v1/user-auth/me`

**Headers:** Uses `{{token}}` automatically

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "yourname@example.com",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

### Step 5: Create a Community

**Request:** `POST /api/v1/communities`

**Headers:** Uses `{{token}}` automatically

**Body:**
```json
{
  "name": "My Streaming Community"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "community-uuid",
    "name": "My Streaming Community",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

✅ **Community ID is automatically saved!**

---

### Step 6: List Communities

**Request:** `GET /api/v1/communities`

**Headers:** Uses `{{token}}` automatically

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "community-uuid",
      "name": "My Streaming Community",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### Step 7: Get Connected Platforms

**Request:** `GET /api/v1/platforms`

**Headers:** Uses `{{token}}` automatically

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "platforms": []
  }
}
```

Initially empty until you connect platforms via OAuth.

---

### Step 8: Create a Stream

**Request:** `POST /api/v1/streams`

**Headers:** Uses `{{token}}` automatically

**Body:**
```json
{
  "communityId": "{{communityId}}",
  "title": "My First Live Stream",
  "description": "Testing the streaming API",
  "scheduledStartTime": "2024-12-31T20:00:00.000Z",
  "platforms": ["youtube"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream-uuid",
      "communityId": "community-uuid",
      "title": "My First Live Stream",
      "description": "Testing the streaming API",
      "rtmpUrl": "rtmp://localhost:1935/live",
      "rtmpKey": "unique-key",
      "platforms": ["youtube"],
      "scheduledStartTime": "2024-12-31T20:00:00.000Z",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

✅ **Stream ID is automatically saved!**

---

### Step 9: List Streams

**Request:** `GET /api/v1/streams?communityId={{communityId}}`

**Headers:** Uses `{{token}}` automatically

**Expected Response:** Array of streams for the community

---

### Step 10: Get Stream Status

**Request:** `GET /api/v1/streams/{{streamId}}/status?communityId={{communityId}}`

**Headers:** Uses `{{token}}` automatically

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "streamId": "stream-uuid",
    "platforms": [
      {
        "platform": "youtube",
        "status": "ready",
        "platformUrl": "..."
      }
    ]
  }
}
```

---

## 🎯 Advanced Endpoints

### Create Scheduled Post

**Request:** `POST /api/v1/schedule`

**Body:**
```json
{
  "content": "Join my livestream tonight!",
  "platforms": ["youtube", "facebook"],
  "scheduledTime": "2024-12-31T18:00:00.000Z"
}
```

### Get Scheduled Posts

**Request:** `GET /api/v1/schedule`

Returns all scheduled posts for the authenticated user.

---

## 🔐 Authentication

All authenticated endpoints require the `Authorization` header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The Postman collection handles this automatically using the `{{token}}` variable.

---

## ❌ Common Errors

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing token"
  }
}
```

**Solution:** Make sure you've logged in and the token is saved.

### 400 Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters with 1 uppercase and 1 number"
  }
}
```

**Solution:** Check your request body matches the required format.

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Email already exists"
  }
}
```

**Solution:** Use a different email or login instead.

---

## 🧪 Test Account (Already Created)

You can use this test account that's already in the database:

- **Email:** test@test.com
- **Password:** Test1234

Just use the "Login User" request with these credentials.

---

## 💡 Tips

1. **Run requests in order** - The collection is organized in the recommended testing order
2. **Check the Console** - Postman console shows when variables are auto-saved
3. **Variables are persistent** - They stay saved until you clear them or run new requests
4. **Use environments** - For testing different environments (dev, staging, prod)

---

## 🔗 API Documentation

For full API reference, see:
- [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) - Complete API documentation
- [docs/guides/API_QUICK_REFERENCE.md](./docs/guides/API_QUICK_REFERENCE.md) - Quick reference with curl examples

---

## 🎥 WebSocket Testing (Chat)

The API also includes WebSocket support for real-time chat:

**Connection URL:** `ws://localhost:3000`

For WebSocket testing, you can use:
- Postman's WebSocket feature
- Browser developer console
- The web dashboard at http://localhost:4000/chat

---

## 📝 Notes

- All data is stored in SQLite database (`omnistream.db`)
- Rate limit: 100 requests per 15 minutes
- Server must be running on http://localhost:3000
- Frontend dashboard available at http://localhost:4000

---

## ✅ Quick Test Checklist

- [ ] Health check passes
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can get current user info
- [ ] Can create community
- [ ] Can list communities
- [ ] Can get connected platforms
- [ ] Can create stream
- [ ] Can list streams
- [ ] Can get stream status
- [ ] Can create scheduled post
- [ ] Can list scheduled posts

---

Happy Testing! 🚀
