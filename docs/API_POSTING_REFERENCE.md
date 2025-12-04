# Unified Posting API Reference

## Quick Start

### Prerequisites
1. User must be registered and logged in
2. User must have connected at least one platform (Twitter, Telegram, or YouTube)
3. JWT token must be included in all requests

### Basic Example

```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello from OmniStream!",
    "platforms": ["twitter", "telegram"]
  }'
```

## API Endpoint

### POST /api/v1/posts

Creates a unified post across multiple social platforms.

**Authentication**: Required (JWT Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  content: string;      // Required: Post content (max 280 chars recommended)
  mediaUrl?: string;    // Optional: Direct URL to image or video
  platforms: string[];  // Required: Array of platform names
}
```

**Valid Platform Values**:
- `"twitter"` - Twitter/X
- `"telegram"` - Telegram
- `"youtube"` - YouTube (currently unsupported)

**Response Status Codes**:
- `200 OK` - All platforms posted successfully
- `207 Multi-Status` - Some platforms succeeded, others failed
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid JWT token
- `500 Internal Server Error` - All platforms failed

**Response Body**:
```typescript
{
  success: boolean;
  results: {
    [platform: string]: {
      status: 'posted' | 'failed' | 'unsupported';
      postUrl?: string;    // Only for successful posts (Twitter)
      postId?: string;     // Platform-specific post ID
      error?: string;      // Error message if failed
    }
  }
}
```

## Examples

### Example 1: Simple Text Post to Twitter

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Just deployed a new feature!",
    "platforms": ["twitter"]
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "results": {
    "twitter": {
      "status": "posted",
      "postUrl": "https://twitter.com/johndoe/status/1234567890",
      "postId": "1234567890"
    }
  }
}
```

### Example 2: Multi-Platform Post with Media

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out this amazing sunset!",
    "mediaUrl": "https://example.com/images/sunset.jpg",
    "platforms": ["twitter", "telegram"]
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "results": {
    "twitter": {
      "status": "posted",
      "postUrl": "https://twitter.com/johndoe/status/1234567891",
      "postId": "1234567891"
    },
    "telegram": {
      "status": "posted",
      "postId": "42"
    }
  }
}
```

### Example 3: Partial Success (207 Multi-Status)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Testing multi-platform posting",
    "platforms": ["twitter", "youtube"]
  }'
```

**Response** (207 Multi-Status):
```json
{
  "success": true,
  "results": {
    "twitter": {
      "status": "posted",
      "postUrl": "https://twitter.com/johndoe/status/1234567892",
      "postId": "1234567892"
    },
    "youtube": {
      "status": "unsupported",
      "error": "YouTube direct posting is not yet supported. Use YouTube Studio for Community Posts."
    }
  }
}
```

### Example 4: Platform Not Connected

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello World",
    "platforms": ["twitter"]
  }'
```

**Response** (500 Internal Server Error):
```json
{
  "success": false,
  "results": {
    "twitter": {
      "status": "failed",
      "error": "Platform twitter is not connected"
    }
  }
}
```

### Example 5: Validation Error

**Request** (missing content):
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["twitter"]
  }'
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "error": "ValidationError",
    "message": "Content is required and must be a non-empty string",
    "statusCode": 400
  }
}
```

## JavaScript/TypeScript Client Examples

### Using Fetch API

```typescript
async function publishPost(
  content: string,
  platforms: string[],
  mediaUrl?: string
) {
  const token = localStorage.getItem('omnistream_jwt_token');

  const response = await fetch('/api/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content,
      mediaUrl,
      platforms
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to publish post');
  }

  return data;
}

// Usage
try {
  const result = await publishPost(
    'Hello from my app!',
    ['twitter', 'telegram']
  );
  console.log('Post published:', result);
} catch (error) {
  console.error('Publishing failed:', error);
}
```

### Using Axios

```typescript
import axios from 'axios';

async function publishPost(
  content: string,
  platforms: string[],
  mediaUrl?: string
) {
  try {
    const token = localStorage.getItem('omnistream_jwt_token');

    const response = await axios.post(
      '/api/v1/posts',
      {
        content,
        mediaUrl,
        platforms
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || error.message);
    }
    throw error;
  }
}
```

### React Hook Example

```typescript
import { useState } from 'react';

function usePostPublisher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishPost = async (
    content: string,
    platforms: string[],
    mediaUrl?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('omnistream_jwt_token');

      const response = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, mediaUrl, platforms })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to publish');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { publishPost, loading, error };
}

// Usage in component
function PostForm() {
  const { publishPost, loading, error } = usePostPublisher();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await publishPost(
        'My post content',
        ['twitter', 'telegram']
      );
      console.log('Success:', result);
    } catch (err) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Publishing...' : 'Publish'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

## Platform-Specific Behavior

### Twitter
- **Content Limit**: 280 characters recommended (Twitter enforces this)
- **Media Support**: Text only (media upload to be added in future)
- **Returns**: Tweet URL and ID
- **Requires**: Twitter account connected via OAuth 2.0

### Telegram
- **Content Limit**: No strict limit, but keep reasonable
- **Media Support**: Full support for images, videos, and documents
- **Media Detection**: Automatic based on URL file extension
- **Returns**: Message ID
- **Requires**: Bot token and channel ID configured

### YouTube
- **Status**: Not supported (API limitation)
- **Returns**: "unsupported" status
- **Note**: YouTube doesn't provide API for Community Posts
- **Alternative**: Use YouTube Studio manually

## Error Handling

### Common Error Scenarios

1. **Platform Not Connected**
   ```json
   {
     "status": "failed",
     "error": "Platform twitter is not connected"
   }
   ```
   **Solution**: Connect the platform first using `/api/v1/platforms/{platform}/connect`

2. **Token Expired**
   ```json
   {
     "status": "failed",
     "error": "Failed to post tweet: Unauthorized"
   }
   ```
   **Solution**: Reconnect the platform to refresh tokens

3. **Invalid Content**
   ```json
   {
     "error": "ValidationError",
     "message": "Content is required and must be a non-empty string"
   }
   ```
   **Solution**: Ensure content is provided and not empty

4. **Invalid Platforms**
   ```json
   {
     "error": "ValidationError",
     "message": "Invalid platforms: facebook, instagram"
   }
   ```
   **Solution**: Use only supported platforms: twitter, telegram, youtube

5. **Media Upload Failure (Telegram)**
   ```json
   {
     "status": "failed",
     "error": "Failed to post to Telegram: Bad Request: wrong file identifier/HTTP URL specified"
   }
   ```
   **Solution**: Ensure media URL is publicly accessible and valid

## Rate Limiting

The API respects platform-specific rate limits:

- **Twitter**: ~300 tweets per 3 hours (Twitter API limit)
- **Telegram**: 30 messages per second per bot (Telegram limit)
- **OmniStream API**: General rate limiting applied per IP

**Best Practices**:
- Don't spam posts
- Handle rate limit errors gracefully
- Implement exponential backoff for retries

## Security Considerations

### Token Storage
- JWT tokens should be stored securely (localStorage, httpOnly cookies)
- Never expose tokens in URLs or logs
- Tokens expire after a configured period

### CORS
- Ensure your frontend domain is allowed in CORS configuration
- For production, configure specific allowed origins

### Content Validation
- Always sanitize user input before posting
- Check content length on client side
- Validate URLs before sending

## Best Practices

### 1. Check Connected Platforms First
```typescript
// Get user's connected platforms
const response = await fetch('/api/v1/platforms', {
  headers: { Authorization: `Bearer ${token}` }
});
const { platforms } = await response.json();

// Only post to connected platforms
const connectedPlatformNames = platforms
  .map(p => p.platform)
  .filter(p => ['twitter', 'telegram'].includes(p));
```

### 2. Handle Partial Success
```typescript
const result = await publishPost(content, platforms);

const succeeded = Object.entries(result.results)
  .filter(([, r]) => r.status === 'posted');

const failed = Object.entries(result.results)
  .filter(([, r]) => r.status === 'failed');

if (succeeded.length > 0) {
  console.log(`Posted to: ${succeeded.map(([p]) => p).join(', ')}`);
}

if (failed.length > 0) {
  console.warn(`Failed on: ${failed.map(([p]) => p).join(', ')}`);
}
```

### 3. Provide User Feedback
```typescript
// Show per-platform results to user
result.results.forEach((result, platform) => {
  if (result.status === 'posted') {
    showSuccess(`Posted to ${platform}`, result.postUrl);
  } else if (result.status === 'failed') {
    showError(`Failed on ${platform}: ${result.error}`);
  } else if (result.status === 'unsupported') {
    showWarning(`${platform} is not supported yet`);
  }
});
```

### 4. Retry Failed Posts
```typescript
async function publishWithRetry(
  content: string,
  platforms: string[],
  maxRetries = 3
) {
  let attempt = 0;
  let failedPlatforms = platforms;

  while (attempt < maxRetries && failedPlatforms.length > 0) {
    const result = await publishPost(content, failedPlatforms);

    // Extract platforms that failed
    failedPlatforms = Object.entries(result.results)
      .filter(([, r]) => r.status === 'failed')
      .map(([platform]) => platform);

    if (failedPlatforms.length > 0) {
      attempt++;
      await sleep(1000 * attempt); // Exponential backoff
    }
  }

  return failedPlatforms; // Return still-failed platforms
}
```

## Troubleshooting

### Problem: "Platform is not connected"
**Solution**: Navigate to platform connections page and connect the platform

### Problem: Posts not appearing on platform
**Solution**:
1. Check the platform's website directly
2. Verify token hasn't expired
3. Check platform-specific permissions

### Problem: Media not displaying in Telegram
**Solution**:
1. Ensure URL is publicly accessible
2. Check file size limits (photos: 10MB, videos: 50MB)
3. Use direct file URLs, not page URLs

### Problem: 401 Unauthorized
**Solution**:
1. Verify JWT token is valid and not expired
2. Re-login to get fresh token
3. Check Authorization header format

## Support

For issues or questions:
- Check the logs for detailed error messages
- Review platform connection status
- Ensure all prerequisites are met
- Consult the main documentation at `/docs/`

## Future Enhancements

Planned features:
- ✅ Text posting (implemented)
- ✅ Image posting for Telegram (implemented)
- 🔜 Image posting for Twitter
- 🔜 Video support for Twitter
- 🔜 Post scheduling
- 🔜 Draft management
- 🔜 Bulk posting
- 🔜 Post analytics
- 🔜 YouTube Community Posts (when API available)
