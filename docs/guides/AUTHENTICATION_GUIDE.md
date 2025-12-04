# Authentication & User Management Guide

## Quick Start

### 1. Set Up Environment

Add to your `.env` file:

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=file:./omnistream.db
```

### 2. Run Database Migration

```bash
npx prisma migrate dev
```

### 3. Start the Server

```bash
npm run dev
```

### 4. Access the Dashboard

Navigate to:
- Registration: `http://localhost:8080/register.html`
- Login: `http://localhost:8080/login.html`
- Dashboard: `http://localhost:8080/dashboard.html`

## User Registration

### Web Interface

1. Navigate to `/register.html`
2. Enter email and password
3. Password must meet requirements:
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
4. Click "Create Account"
5. Automatically logged in and redirected to dashboard

### API Usage

```bash
curl -X POST http://localhost:3000/api/v1/user-auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MyPassword123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## User Login

### Web Interface

1. Navigate to `/login.html`
2. Enter email and password
3. Click "Login"
4. Redirected to dashboard on success

### API Usage

```bash
curl -X POST http://localhost:3000/api/v1/user-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MyPassword123"
  }'
```

## Making Authenticated Requests

### Include JWT Token

All authenticated requests must include the JWT token in the Authorization header:

```bash
curl -X GET http://localhost:3000/api/v1/user-auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Get Current User Info


```bash
curl -X GET http://localhost:3000/api/v1/user-auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Platform Management

### Connect a Platform

Platforms are connected via OAuth flow. The system securely stores encrypted access tokens.

**Supported Platforms:**
- YouTube
- Facebook
- TikTok
- X (Twitter)
- Telegram

### List Connected Platforms

```bash
curl -X GET http://localhost:3000/api/v1/user-auth/platforms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "id": "uuid",
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

### Disconnect a Platform

```bash
curl -X DELETE http://localhost:3000/api/v1/user-auth/platforms/youtube \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Community Management

### Create a Community

```bash
curl -X POST http://localhost:3000/api/v1/communities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Streaming Community"
  }'
```

### List Your Communities

```bash
curl -X GET http://localhost:3000/api/v1/communities \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
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

## Security Best Practices

### For Users

1. **Strong Passwords**: Use unique, complex passwords
2. **Token Security**: Never share your JWT token
3. **Logout**: Always logout on shared devices
4. **HTTPS**: Use HTTPS in production

### For Developers

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use a strong, random JWT_SECRET in production
3. **Token Expiration**: Tokens expire after 7 days
4. **HTTPS Only**: Enforce HTTPS in production
5. **Rate Limiting**: Enabled by default on all endpoints

## Token Management

### JWT Token Lifecycle

- **Duration**: 7 days
- **Storage**: Client-side (localStorage)
- **Renewal**: User must login again after expiration
- **Revocation**: Logout clears client-side token

### OAuth Token Storage

- **Encryption**: AES-256-GCM
- **Location**: Database (SocialAccount table)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Per-User**: Each user has isolated platform connections

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No authorization header provided"
  }
}
```

**Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters long"
  }
}
```

**Conflict Error**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  }
}
```

## Frontend Integration

### Authentication Flow

```javascript
// Initialize auth manager
const auth = new AuthManager();

// Register
const result = await auth.register('user@example.com', 'MyPassword123');
if (result.success) {
  console.log('Registered!', result.user);
  // Token automatically stored in localStorage
}

// Login
const loginResult = await auth.login('user@example.com', 'MyPassword123');
if (loginResult.success) {
  console.log('Logged in!', loginResult.user);
}

// Get current user
const user = await auth.getCurrentUser();
console.log('Current user:', user);

// Logout
auth.logout(); // Clears token and redirects to login
```

### Making Authenticated API Calls

```javascript
// Get auth header
const headers = {
  'Content-Type': 'application/json',
  ...auth.getAuthHeader()
};

// Make authenticated request
const response = await fetch('/api/v1/communities', {
  method: 'GET',
  headers: headers
});
```

### Protected Routes

```javascript
// Require authentication
if (!auth.isAuthenticated()) {
  window.location.href = '/login.html';
}

// Or use the helper
auth.requireAuth(); // Redirects to login if not authenticated
```

## Database Schema

### User Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL
);
```

### SocialAccount Table
```sql
CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  platform TEXT NOT NULL,
  accessToken TEXT NOT NULL,  -- Encrypted
  refreshToken TEXT,          -- Encrypted
  expiresAt DATETIME,
  extra TEXT,                 -- JSON
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(userId, platform)
);
```

### Community Table (Updated)
```sql
CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

## Troubleshooting

### "No authorization header provided"
- Ensure you're including `Authorization: Bearer <token>` header
- Check that token is valid and not expired

### "Invalid token"
- Token may be malformed or corrupted
- Try logging in again to get a new token

### "Token expired"
- Tokens expire after 7 days
- Login again to get a new token

### "User with this email already exists"
- Email is already registered
- Try logging in or use password reset (to be implemented)

### Password Requirements Not Met
- Ensure password has:
  - At least 8 characters
  - One uppercase letter (A-Z)
  - One lowercase letter (a-z)
  - One number (0-9)

## Next Steps

- [Platform Connection Guide](../platforms/connection-flow.md)
- [Streaming Quick Start](QUICK_START.md)
- [API Reference](API_QUICK_REFERENCE.md)
- [Architecture Overview](../architecture/authentication.md)
