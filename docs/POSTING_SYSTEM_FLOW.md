# Unified Posting System - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (Web Dashboard / Frontend)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Create Post Section                                    │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ ✍️ Post Content Textarea (280 chars)            │ │   │
│  │  │ 🖼️  Media URL (optional)                        │ │   │
│  │  │ ☑️  Platform Checkboxes:                        │ │   │
│  │  │     ☑️ Twitter   ☑️ Telegram   ☐ YouTube       │ │   │
│  │  │ 📤 [Publish Post Button]                         │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │  Results Display:                                      │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ 𝕏 Twitter    ✅ Posted → [View Tweet]          │ │   │
│  │  │ ✈ Telegram   ✅ Posted                         │ │   │
│  │  │ ▶ YouTube    ⚠️  Unsupported                   │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                               │
│                                                                  │
│  POST /api/v1/posts                                             │
│  Authorization: Bearer <JWT_TOKEN>                              │
│                                                                  │
│  Request Body:                                                  │
│  {                                                              │
│    "content": "Post content...",                               │
│    "mediaUrl": "https://...",                                  │
│    "platforms": ["twitter", "telegram"]                        │
│  }                                                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Validate JWT Token ✓                                  │ │
│  │ 2. Extract User ID from token                            │ │
│  │ 3. Validate input (content, platforms)                   │ │
│  │ 4. Call Platform Service                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PLATFORM SERVICE                            │
│                  (Business Logic Layer)                          │
│                                                                  │
│  postToMultiplePlatforms()                                      │
│  ├─ For each platform in parallel:                             │
│  │  ├─ Get user's tokens from database                         │
│  │  ├─ Decrypt tokens                                           │
│  │  ├─ Get extra metadata (username, channelId, etc.)          │
│  │  └─ Call appropriate platform adapter                       │
│  └─ Aggregate results from all platforms                        │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Twitter Adapter  │ │ Telegram Adapter │ │ YouTube Adapter  │
│                   │ │                  │ │                  │
│  post()           │ │  post()          │ │  post()          │
│  ├─ Tweet text    │ │  ├─ Send message│ │  ├─ Return       │
│  ├─ Get tweet ID  │ │  ├─ Or photo    │ │  │  unsupported  │
│  └─ Return URL    │ │  ├─ Or video    │ │  │  status       │
│                   │ │  └─ Return ID   │ │  └─ (Stub)       │
└───────────────────┘ └──────────────────┘ └──────────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
┌───────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Twitter API v2   │ │  Telegram Bot   │ │   YouTube API    │
│  (OAuth 2.0)      │ │  API             │ │  (No posting)    │
│                   │ │                  │ │                  │
│  POST /tweets     │ │  POST /sendMsg  │ │                  │
│                   │ │  POST /sendPhoto│ │                  │
└───────────────────┘ └──────────────────┘ └──────────────────┘
```

## Data Flow

### 1. User Interaction
```
User fills form → Clicks "Publish" → JavaScript validates input
```

### 2. API Request
```javascript
fetch('/api/v1/posts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGc...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: "Hello World!",
    platforms: ["twitter", "telegram"]
  })
})
```

### 3. Backend Processing
```
1. JWT Middleware verifies token → extracts userId
2. Route handler validates request body
3. Platform Service loads user's social accounts
4. For each platform (in parallel):
   a. Decrypt stored credentials
   b. Call platform adapter with content + credentials
   c. Platform adapter makes API call
   d. Return result (success/failure)
5. Aggregate all results
6. Return unified response
```

### 4. Response Format
```json
{
  "success": true,
  "results": {
    "twitter": {
      "status": "posted",
      "postUrl": "https://twitter.com/user/status/123",
      "postId": "123"
    },
    "telegram": {
      "status": "posted",
      "postId": "456"
    }
  }
}
```

### 5. UI Update
```
1. Parse response
2. Display result cards for each platform
3. Show success message or errors
4. Clear form if all succeeded
5. Show clickable links to view posts
```

## Security Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Security Layers                        │
└──────────────────────────────────────────────────────────┘

1. Authentication
   ├─ User must be logged in (JWT required)
   └─ Token validated on every request

2. Authorization
   ├─ User can only post using THEIR credentials
   └─ No cross-user access possible

3. Credential Storage
   ├─ Tokens encrypted in database (AES-256)
   ├─ Decryption only during API calls
   └─ Never exposed in responses

4. Input Validation
   ├─ Content length limits
   ├─ Platform whitelist validation
   └─ URL format validation (if mediaUrl provided)

5. Rate Limiting
   ├─ Applied at API layer
   └─ Prevents abuse
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│              Graceful Error Handling                     │
└─────────────────────────────────────────────────────────┘

Scenario 1: No platforms connected
   → Status: 'failed'
   → Error: "Platform X is not connected"
   → UI: Shows error, prompts to connect

Scenario 2: One platform succeeds, one fails
   → Status: 207 Multi-Status
   → Results show per-platform status
   → UI: Shows partial success message + details

Scenario 3: Platform API error
   → Status: 'failed' for that platform
   → Error message from platform API
   → Other platforms still attempted

Scenario 4: Network timeout
   → Caught in adapter layer
   → Returns 'failed' status
   → User-friendly error message

Scenario 5: Invalid JWT
   → Rejected at middleware
   → 401 Unauthorized response
   → UI redirects to login
```

## Database Schema (Existing - No Changes)

```sql
-- Users table (existing)
User {
  id: UUID (PK)
  email: String
  passwordHash: String
  createdAt: DateTime
  updatedAt: DateTime
}

-- Social accounts table (existing)
SocialAccount {
  id: UUID (PK)
  userId: UUID (FK → User)
  platform: String (twitter|telegram|youtube)
  accessToken: String (encrypted)
  refreshToken: String? (encrypted)
  expiresAt: DateTime?
  extra: JSON (username, channelId, etc.)
  createdAt: DateTime
  updatedAt: DateTime

  UNIQUE(userId, platform)
}
```

## Platform-Specific Implementation

### Twitter Implementation
```typescript
// Twitter posts use OAuth 2.0 tokens
async post(params) {
  // 1. Prepare tweet data
  const tweetData = { text: params.content };

  // 2. POST to Twitter API
  const response = await axios.post(
    'https://api.twitter.com/2/tweets',
    tweetData,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 3. Extract tweet ID and build URL
  const tweetId = response.data.data.id;
  const postUrl = `https://twitter.com/${username}/status/${tweetId}`;

  return { status: 'posted', postUrl, postId: tweetId };
}
```

### Telegram Implementation
```typescript
// Telegram uses bot token + channel ID
async post(params) {
  const { botToken, channelId } = credentials;

  // Detect media type
  if (isImage(mediaUrl)) {
    await axios.post(`/bot${botToken}/sendPhoto`, {
      chat_id: channelId,
      photo: mediaUrl,
      caption: content
    });
  } else {
    await axios.post(`/bot${botToken}/sendMessage`, {
      chat_id: channelId,
      text: content
    });
  }

  return { status: 'posted', postId: messageId };
}
```

### YouTube Implementation
```typescript
// YouTube doesn't support direct posting
post(params) {
  return Promise.resolve({
    status: 'unsupported',
    error: 'YouTube direct posting not supported'
  });
}
```

## Performance Characteristics

### Parallel Execution
```
Sequential posting (OLD):
Twitter (2s) → Telegram (1s) → YouTube (0.1s) = 3.1 seconds

Parallel posting (NEW):
Twitter (2s) }
Telegram (1s) } → All in parallel = 2 seconds (max of all)
YouTube (0.1s) }
```

### Response Times
- **Best case**: ~1-2 seconds (all platforms succeed quickly)
- **Typical case**: ~2-3 seconds (includes network latency)
- **Worst case**: 30 seconds (platform timeout configured)

### Scalability
- Each user's posts are independent
- Database queries use indexed userId + platform
- No shared state between requests
- Easily horizontally scalable

## Testing the System

### 1. Unit Testing (Future)
```typescript
// Test platform adapters
test('Twitter adapter posts successfully', async () => {
  const result = await twitterAdapter.post({
    content: 'Test',
    credentials: mockCredentials
  });
  expect(result.status).toBe('posted');
});
```

### 2. Integration Testing (Future)
```typescript
// Test end-to-end flow
test('POST /api/v1/posts returns results', async () => {
  const response = await request(app)
    .post('/api/v1/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'Test', platforms: ['twitter'] });

  expect(response.status).toBe(200);
  expect(response.body.results.twitter.status).toBe('posted');
});
```

### 3. Manual Testing Checklist
- ✅ Register new user
- ✅ Connect platforms (Twitter, Telegram)
- ✅ Create post with text only
- ✅ Create post with media URL
- ✅ Verify posts appear on actual platforms
- ✅ Test error cases (disconnected platform)
- ✅ Test partial success scenarios
- ✅ Verify character counter works
- ✅ Check results display correctly

## Monitoring & Logging

### Logged Events
```
✓ Post creation attempts (userId, platforms)
✓ Per-platform successes (postId, platform)
✓ Per-platform failures (error, platform)
✓ Token refresh events
✓ API rate limit hits
```

### Metrics to Track (Future)
- Post success rate per platform
- Average response time
- Most used platforms
- Error types and frequencies
- User engagement (posts per user)

## Conclusion

This system provides a robust, scalable, and user-friendly way to post content across multiple social platforms with a single action. The architecture is clean, maintainable, and ready for production use.
