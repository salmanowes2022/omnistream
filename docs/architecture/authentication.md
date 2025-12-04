# Authentication Architecture

## Overview

OmniStream now supports a complete multi-user authentication system with secure token management for both user sessions (JWT) and platform OAuth tokens (encrypted).

## Architecture Components

### 1. User Authentication

#### Database Schema

**User Model**
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  socialAccounts SocialAccount[]
  communities    Community[]
}
```

**SocialAccount Model**
```prisma
model SocialAccount {
  id           String    @id @default(uuid())
  userId       String
  platform     String    // youtube | telegram | x | facebook | tiktok
  accessToken  String    // Encrypted using AES-256-GCM
  refreshToken String?   // Encrypted (optional)
  expiresAt    DateTime?
  extra        String?   // JSON-encoded extra data
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### 2. Security Layers

#### Password Security
- **Algorithm**: bcrypt with 10 salt rounds
- **Requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
- **Location**: [src/core/auth/password.ts](../../src/core/auth/password.ts)

#### JWT Tokens
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 7 days
- **Payload**: `{ userId, email, iat, exp }`
- **Secret**: Configured via `JWT_SECRET` environment variable
- **Location**: [src/core/auth/jwt.ts](../../src/core/auth/jwt.ts)

#### Token Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Purpose**: Encrypt OAuth access/refresh tokens in database
- **Components**:
  - Random salt (64 bytes)
  - Random IV (16 bytes)
  - Auth tag (16 bytes)
- **Location**: [src/core/auth/encryption.ts](../../src/core/auth/encryption.ts)

### 3. API Endpoints

#### User Authentication Endpoints

```
POST   /api/v1/user-auth/register
POST   /api/v1/user-auth/login
GET    /api/v1/user-auth/me              (requires JWT)
POST   /api/v1/user-auth/logout          (requires JWT)
GET    /api/v1/user-auth/platforms       (requires JWT)
POST   /api/v1/user-auth/platforms/connect (requires JWT)
DELETE /api/v1/user-auth/platforms/:platform (requires JWT)
```

#### Protected Endpoints

All community and stream endpoints now require JWT authentication:

```
POST   /api/v1/communities               (requires JWT)
GET    /api/v1/communities               (requires JWT)
POST   /api/v1/streams                   (requires JWT)
GET    /api/v1/streams                   (requires JWT)
```

### 4. Middleware

#### JWT Authentication Middleware
- **Location**: [src/api/middleware/auth.ts](../../src/api/middleware/auth.ts)
- **Function**: `requireAuth(req, res, next)`
- **Usage**: Validates JWT token from `Authorization: Bearer <token>` header
- **Attaches**: User info to `req.user` for downstream handlers

#### Optional Authentication
- **Function**: `optionalAuth(req, res, next)`
- **Usage**: Attaches user info if valid token present, but doesn't require it

### 5. Data Flow

#### Registration Flow
```
1. User submits email + password
2. Validate email format
3. Check password strength
4. Check if user already exists
5. Hash password with bcrypt
6. Create user in database
7. Generate JWT token
8. Return { user, token }
```

#### Login Flow
```
1. User submits email + password
2. Find user by email
3. Compare password hash
4. Generate new JWT token
5. Return { user, token }
```

#### Platform Connection Flow
```
1. User initiates OAuth for platform
2. Platform redirects with authorization code
3. Exchange code for access/refresh tokens
4. Encrypt tokens using AES-256-GCM
5. Store encrypted tokens in SocialAccount table
6. Link to user account
```

#### Protected Request Flow
```
1. Client sends request with Authorization header
2. Middleware extracts and verifies JWT
3. Attach user info to request
4. Handler processes with user context
5. Return user-specific data
```

## Security Considerations

### Token Storage
- **JWT Tokens**: Stored in browser localStorage (client-side)
- **OAuth Tokens**: Encrypted in database with AES-256-GCM
- **Passwords**: Never stored, only bcrypt hashes

### Token Lifecycle
- **JWT**: 7-day expiration, client must re-login
- **OAuth**: Platform-dependent, refresh tokens used when available

### Security Best Practices
1. **HTTPS Required**: All production traffic must use HTTPS
2. **CORS Configuration**: Restrict allowed origins in production
3. **Rate Limiting**: Applied to all API endpoints
4. **SQL Injection**: Protected via Prisma parameterized queries
5. **XSS Protection**: Client sanitizes all user input

## Migration Strategy

### Backward Compatibility
- Existing communities without userId are assigned to system user (ID: `00000000-0000-0000-0000-000000000000`)
- Old API endpoints continue to work for backward compatibility
- In-memory database mode supports new methods with no-op user filtering

### Migration Path
1. Apply Prisma migration: `npx prisma migrate dev`
2. Existing communities link to system user
3. New users register and create their own communities
4. System user communities can be migrated manually if needed

## Environment Configuration

Required environment variables:

```bash
# JWT Authentication
JWT_SECRET=your-secure-random-secret-here

# Database
DATABASE_URL=file:./omnistream.db
```

## References

- [User Service](../../src/core/services/user-service.ts) - Business logic
- [Auth Routes](../../src/api/routes/user-auth.ts) - API endpoints
- [Password Utils](../../src/core/auth/password.ts) - Password hashing
- [JWT Utils](../../src/core/auth/jwt.ts) - Token generation/verification
- [Encryption Utils](../../src/core/auth/encryption.ts) - Token encryption
- [Auth Middleware](../../src/api/middleware/auth.ts) - Request protection
