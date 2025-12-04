# Omnistream - Multi-Platform Live Streaming Middleware

TypeScript/Node.js middleware that provides RESTful APIs to stream RTMP to YouTube, Facebook, TikTok, and Instagram simultaneously. Handles OAuth, stream scheduling, real-time chat aggregation, and message highlighting.

## 🚀 Features

- **Multi-User System**: Complete authentication with JWT tokens and secure user management
- **Multi-Platform Streaming**: Stream to YouTube, Facebook, TikTok, and Instagram from a single RTMP source
- **OAuth Management**: Per-user encrypted token storage for each platform
- **Stream Control**: Create, start, stop, and monitor streams across all platforms
- **Real-Time Chat**: WebSocket server aggregates chat messages from all platforms
- **Secure by Design**: Bcrypt password hashing, AES-256-GCM token encryption, JWT sessions
- **Type-Safe**: Full TypeScript implementation with strict mode

## 📋 Platform Support

| Platform  | OAuth | Streams | Chat | Highlights | Status                |
| --------- | ----- | ------- | ---- | ---------- | --------------------- |
| YouTube   | ✅    | ✅      | ✅   | ❌         | Fully Supported       |
| Facebook  | ✅    | ✅      | ✅   | ❌         | Fully Supported       |
| TikTok    | ⚠️    | ⚠️      | ⚠️   | ⚠️         | Requires API Approval |
| Instagram | ❌    | ❌      | ❌   | ❌         | No Official API       |

**Note**: Message highlighting is not supported by any platform's public API.

## 🏗️ Architecture

```
omnistream/
├── src/
│   ├── core/              # Interfaces, types, errors, services
│   ├── providers/         # Platform implementations
│   │   ├── youtube/       # YouTube Live Streaming API
│   │   ├── facebook/      # Facebook Graph API
│   │   ├── tiktok/        # TikTok LIVE Access API (stub)
│   │   └── instagram/     # Instagram (stub - no official API)
│   ├── api/              # REST API routes and middleware
│   ├── database/         # In-memory data store
│   ├── websocket/        # Real-time chat server
│   └── utils/            # Config, logging
```

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/gigaverse-app/omnistream.git
cd omnistream

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials (optional for testing - demo credentials included)
# See Environment Variables section below
```

## 🚦 Quick Start

### 🌟 Interactive Web Dashboard (Recommended)

The **easiest way to try Omnistream** is with our interactive web dashboard:

**Terminal 1 - Start Omnistream Server:**

```bash
npm install
npm run dev              # Auto-compiles & watches for changes
```

**Terminal 2 - Start Web Dashboard:**

```bash
cd examples/web-dashboard
npm install             # First time only
npm start               # Start dashboard at http://localhost:4000
```

**Then open: http://localhost:4000**

The dashboard provides a complete UI to explore all Omnistream features:

- ✅ **Community Management** - Create and manage communities
- ✅ **OAuth Integration** - Connect YouTube, Facebook & TikTok with one click
- ✅ **Stream Management** - Create multi-platform streams visually
- ✅ **Real-Time Control** - Start/stop streams with instant feedback
- ✅ **RTMP Credentials** - Copy stream URLs and keys for OBS/streaming software
- ✅ **Connection Status** - See which platforms are connected in real-time

**Fully Tested:**

- ✅ All dashboard functionality runs with main test suite (`npm test`)
- ✅ 16+ Playwright UI tests included
- ✅ OAuth flow validation tests

See **[examples/web-dashboard/README.md](./examples/web-dashboard/README.md)** for detailed dashboard documentation.

---

### Alternative: CLI/API Testing

If you prefer command-line or API testing:

```bash
# Start server
npm run dev              # Development mode (recommended)
# OR
npm run build && npm start   # Production mode

# Run automated demos
npm run demo:simple      # Non-interactive API demo
npm run demo            # Interactive CLI streaming demo
```

### Running Tests

```bash
npm test                        # Unit tests (auth, OAuth, streams, etc.)
npm run test:dashboard          # Web dashboard UI tests (Playwright)
npm run test:integration        # Integration tests
npm run test:all                # Run all tests (unit + dashboard + integration)
```

### Complete Setup Guide

For detailed setup instructions including OAuth provider configuration, see **[docs/guides/getting-started.md](./docs/guides/getting-started.md)**

## 🔐 Authentication & User Management

Omnistream now includes a complete multi-user authentication system:

### Quick Start

1. **Register a new account:**
   - Visit `http://localhost:8080/register.html`
   - Create your account with email and password

2. **Login:**
   - Visit `http://localhost:8080/login.html`
   - Access your personal dashboard

3. **Manage Platforms:**
   - Connect YouTube, Facebook, TikTok, X, and Telegram
   - Each user has isolated platform connections
   - Tokens are encrypted in the database

### Security Features

- **Password Security**: Bcrypt hashing with 10 salt rounds
- **Session Management**: JWT tokens with 7-day expiration
- **Token Encryption**: AES-256-GCM encryption for OAuth tokens
- **User Isolation**: Each user has separate communities and platform connections

### API Authentication

Protected endpoints require JWT authentication:

```bash
curl -X GET http://localhost:3000/api/v1/user-auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Documentation

- [Authentication Guide](docs/guides/AUTHENTICATION_GUIDE.md) - Complete user guide
- [Authentication Architecture](docs/architecture/authentication.md) - Technical details
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation

---

## 📡 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

**New**: User authentication is now available via JWT tokens. See the [Authentication Guide](docs/guides/AUTHENTICATION_GUIDE.md) for details.

**Legacy**: The community-based access pattern is still supported for backward compatibility. Most stream and OAuth endpoints accept a `communityId` parameter.

### Endpoints

#### Communities

**Create a Community**

```http
POST /api/v1/communities
Content-Type: application/json

{
  "name": "My Community"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Community",
    "createdAt": "2025-10-02T...",
    "updatedAt": "2025-10-02T..."
  }
}
```

**List Communities**

```http
GET /api/v1/communities
```

#### OAuth Authorization

**Get Authorization URL**

```http
GET /api/v1/auth/:platform/authorize?communityId=<community-id>
```

Platforms: `youtube`, `facebook`, `tiktok`

Response:

```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/...",
    "platform": "youtube",
    "communityId": "uuid"
  }
}
```

**OAuth Callback** (handled by browser)

```http
GET /api/v1/auth/:platform/callback?code=...&state=<community-id>
```

**Revoke Authorization**

```http
DELETE /api/v1/auth/:platform?communityId=<community-id>
```

#### Streams

**Create a Stream**

```http
POST /api/v1/streams
Content-Type: application/json

{
  "communityId": "uuid",
  "title": "My Live Stream",
  "description": "Stream description",
  "rtmpUrl": "rtmp://your-rtmp-server.com/live",
  "rtmpKey": "your-stream-key",
  "platforms": ["youtube", "facebook"],
  "scheduledStartTime": "2025-10-03T10:00:00Z" // optional
}
```

Response:

```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream-uuid",
      "title": "My Live Stream",
      "platforms": ["youtube", "facebook"],
      ...
    },
    "platformStreams": [
      {
        "platform": "youtube",
        "platformStreamId": "youtube-broadcast-id",
        "streamUrl": "https://www.youtube.com/watch?v=...",
        "status": "scheduled"
      },
      {
        "platform": "facebook",
        "platformStreamId": "facebook-video-id",
        "streamUrl": "https://www.facebook.com/...",
        "status": "scheduled"
      }
    ]
  }
}
```

**List Streams**

```http
GET /api/v1/streams?communityId=uuid
```

**Get Stream Status**

```http
GET /api/v1/streams/:streamId?communityId=uuid
```

**Start Stream**

```http
POST /api/v1/streams/:streamId/start
Content-Type: application/json

{
  "communityId": "uuid"
}
```

**Stop Stream**

```http
POST /api/v1/streams/:streamId/stop
Content-Type: application/json

{
  "communityId": "uuid"
}
```

**Delete Stream**

```http
DELETE /api/v1/streams/:streamId?communityId=uuid
```

### WebSocket Chat

Connect to real-time chat aggregation:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/chat');

// Subscribe to stream chat
ws.send(
  JSON.stringify({
    type: 'subscribe',
    streamId: 'your-stream-id',
    communityId: 'your-community-id',
  })
);

// Receive messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'message') {
    console.log('New chat message:', data.message);
    // {
    //   id: 'msg-id',
    //   platform: 'youtube',
    //   authorName: 'User123',
    //   message: 'Hello!',
    //   timestamp: '2025-10-02T...'
    // }
  }
};

// Highlight a message
ws.send(
  JSON.stringify({
    type: 'highlight',
    messageId: 'msg-id',
    platform: 'youtube',
  })
);

// Unsubscribe
ws.send(
  JSON.stringify({
    type: 'unsubscribe',
  })
);
```

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database (future: PostgreSQL)
DATABASE_URL=memory://

# YouTube OAuth
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/v1/auth/youtube/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/v1/auth/facebook/callback

# TikTok OAuth (requires LIVE Access API approval)
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/api/v1/auth/tiktok/callback

# Security
JWT_SECRET=random_jwt_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

**Note**: Omnistream does not use API keys for authentication. Access should be controlled at the network level (firewall, reverse proxy, VPN, etc.).

### Getting OAuth Credentials

**YouTube:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI

**Facebook:**

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create an app
3. Add Facebook Login product
4. Configure OAuth redirect URIs

**TikTok:**

1. Apply for [TikTok LIVE Access API](https://developers.tiktok.com/)
2. Note: Requires special approval and is not generally available

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run all tests
npm run test:all

# Watch mode
npm run test:watch
```

**Test Coverage:**

- ✅ 28 API unit/integration tests
- ✅ 12 Dashboard API tests (bash)
- ✅ 16 Dashboard UI tests (Playwright)
- **Total: 56 automated tests**

## 🎨 Code Quality & Formatting

This project uses **ESLint** for linting and **Prettier** for code formatting (like Python's Black).

```bash
# Check code quality (lint + format + typecheck)
npm run check

# Auto-fix all issues (lint + format)
npm run fix

# Individual commands
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Format all code with Prettier
npm run format:check  # Check formatting without changing files
npm run typecheck     # TypeScript type checking

# Full validation (quality + tests + build)
npm run validate
```

**Pre-commit hooks** automatically run linting and formatting on staged files before each commit.

### Editor Setup

For the best experience, install these extensions:

- **VS Code**: ESLint, Prettier
- **WebStorm/IntelliJ**: Built-in support (enable ESLint & Prettier in settings)

The project includes:

- `.editorconfig` - Consistent editor settings
- `.prettierrc.json` - Prettier configuration
- `eslint.config.js` - ESLint rules for TypeScript
- Husky + lint-staged - Pre-commit hooks

## 🐛 Troubleshooting

### Error: "Cannot find module 'dist/index.js'"

**Cause:** TypeScript hasn't been compiled to JavaScript yet.

**Solution:**

```bash
# Option 1: Build then run
npm run build
npm start

# Option 2: Use dev mode (auto-compiles)
npm run dev
```

### Error: "Port 3000 already in use"

**Solution:**

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

Or change the port in `.env`:

```bash
PORT=3001
```

### Error: "ECONNREFUSED" in tests

**Cause:** Omnistream server not running.

**Solution:**

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm test
```

### Dashboard shows "Failed to fetch" errors

**Cause:** Main Omnistream API server not running.

**Solution:**

```bash
# Terminal 1: Start API server
cd /path/to/omnistream
npm run dev

# Terminal 2: Start dashboard
cd examples/web-dashboard
npm start
```

Verify dashboard can reach API by checking `examples/web-dashboard/.env`:

```bash
OMNISTREAM_API_URL=http://localhost:3000
```

### OAuth URLs don't work

**Common issues:**

1. **Redirect URI mismatch** - Update Google/Facebook console to match `.env`
2. **Invalid credentials** - Verify `YOUTUBE_CLIENT_ID`, `FACEBOOK_APP_ID` in `.env`
3. **Port mismatch** - Ensure callback URLs use correct port (3000)

### "No OAuth tokens found" error

**This is expected** until you complete OAuth flow:

1. Get authorization URL from API
2. Open URL in browser
3. Complete OAuth
4. Tokens are automatically saved

See [docs/guides/getting-started.md](./docs/guides/getting-started.md) for OAuth setup guide.

### Module import errors

**Solution:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

For more help, see [docs/guides/getting-started.md](./docs/guides/getting-started.md)

## 🏭 Production Deployment

### Build and Run

```bash
npm run build
npm start
```

### Docker (Coming Soon)

```bash
docker build -t omnistream .
docker run -p 3000:3000 --env-file .env omnistream
```

### Production Checklist

- [x] Set up CI/CD pipeline (GitHub Actions)
- [x] Docker containerization
- [x] Docker Compose with PostgreSQL
- [ ] Replace in-memory database with PostgreSQL in production
- [ ] Set up proper logging (e.g., Winston, Datadog)
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring and alerts
- [ ] Configure auto-scaling
- [ ] Implement database backups

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run quality checks: `npm run check`
5. Fix any issues: `npm run fix`
6. Commit your changes (pre-commit hooks will run automatically)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

**Code Standards:**

- All code must pass ESLint checks
- Code must be formatted with Prettier
- TypeScript strict mode must pass
- Maintain test coverage thresholds
- Pre-commit hooks will enforce these automatically

## 📝 License

ISC License

## 🔗 Related Projects

- [StreamYard](https://streamyard.com/) - Inspiration for multi-platform streaming
- [Restream](https://restream.io/) - Commercial multi-platform streaming service
- [OBS Studio](https://obsproject.com/) - Open source streaming software

## 📞 Support

For issues and questions:

- GitHub Issues: [Create an issue](https://github.com/gigaverse-app/omnistream/issues)
- Documentation: See [docs/development/status.md](./docs/development/status.md) for detailed project status

## 🗺️ Roadmap

- [x] Core platform providers (YouTube, Facebook)
- [x] REST API
- [x] WebSocket chat aggregation
- [x] Unit tests
- [x] Docker deployment
- [x] CI/CD pipeline
- [x] Web dashboard
- [x] Code quality tools (ESLint, Prettier)
- [ ] 80% test coverage (currently 58%)
- [ ] PostgreSQL database support (in-memory works for dev)
- [ ] Stream analytics
- [ ] Webhooks for stream events
- [ ] Kubernetes support
- [ ] CDN integration for better latency

---

Built with ❤️ for the live streaming community
